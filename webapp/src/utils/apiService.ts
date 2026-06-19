// Copyright (c) 2026 WSO2 LLC. (https://www.wso2.com).
//
// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.
import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosRequestHeaders,
  AxiosResponse,
  CancelTokenSource,
} from "axios";
import * as rax from "retry-axios";

import { ServiceBaseUrl } from "@config/config";
import { startLoading, stopLoading } from "@slices/commonSlice/common";
import { store } from "@slices/store";

interface RequestConfigWithLoader extends AxiosRequestConfig {
  showGlobalLoading?: boolean;
  _cancelKey?: string;
}

export class APIService {
  private static _instance: AxiosInstance;
  private static _idToken: string;
  private static _accessToken: string;
  private static _cancelTokenSource = axios.CancelToken.source();
  private static _cancelTokenMap: Map<string, CancelTokenSource> = new Map();
  private static callback: () => Promise<{ accessToken: string }>;

  private static _isRefreshing = false;
  private static _refreshPromise: Promise<{ accessToken: string }> | null = null;

  constructor(idToken: string, accessToken: string, callback: () => Promise<{ accessToken: string }>) {
    APIService._instance = axios.create({
      baseURL: ServiceBaseUrl,
    });
    rax.attach(APIService._instance);

    APIService._idToken = idToken;
    APIService._accessToken = accessToken;
    APIService.callback = callback;

    APIService.updateRequestInterceptor();
    APIService.updateResponseInterceptor();

    (APIService._instance.defaults as unknown as rax.RaxConfig).raxConfig = {
      retry: 3,
      instance: APIService._instance,
      httpMethodsToRetry: ["GET", "HEAD", "OPTIONS", "DELETE", "POST", "PATCH", "PUT"],
      statusCodesToRetry: [[401, 401]],
      retryDelay: 100,
      onRetryAttempt: async () => {
        if (!APIService._isRefreshing) {
          APIService._isRefreshing = true;
          APIService._refreshPromise = APIService.callback()
            .then((res) => {
              APIService.updateTokens(res.accessToken);
              APIService._instance.interceptors.request.clear();
              APIService.updateRequestInterceptor();
              return res;
            })
            .finally(() => {
              APIService._isRefreshing = false;
              APIService._refreshPromise = null;
            });
        }
        return APIService._refreshPromise;
      },
    };
  }

  public static getInstance(): AxiosInstance {
    return APIService._instance;
  }

  public static getCancelToken(): CancelTokenSource {
    return APIService._cancelTokenSource;
  }

  public static updateCancelToken(): CancelTokenSource {
    APIService._cancelTokenSource = axios.CancelToken.source();
    return APIService._cancelTokenSource;
  }

  public static async get<T = unknown>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return APIService._instance.get<T>(url, config);
  }

  public static async post<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return APIService._instance.post<T>(url, data, config);
  }

  public static async put<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return APIService._instance.put<T>(url, data, config);
  }

  public static async patch<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return APIService._instance.patch<T>(url, data, config);
  }

  public static async delete<T = unknown>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return APIService._instance.delete<T>(url, config);
  }

  private static updateTokens(idToken: string) {
    APIService._idToken = idToken;
  }

  private static updateRequestInterceptor() {
    APIService._instance.interceptors.request.use(
      (config) => {
        const requestConfig = config as RequestConfigWithLoader;
        if (requestConfig.showGlobalLoading) {
          store.dispatch(startLoading());
        }

        if (!config.headers) {
          config.headers = {} as AxiosRequestHeaders;
        }

        if (
          typeof (config.headers as { set?: (k: string, v: string) => void }).set === "function"
        ) {
          (config.headers as { set: (k: string, v: string) => void }).set(
            "x-jwt-assertion",
            `${APIService._idToken}`
          );
          (config.headers as { set: (k: string, v: string) => void }).set(
            "x-access-token",
            `${APIService._accessToken}`
          );
        } else {
          (config.headers as Record<string, string>)["x-jwt-assertion"] =
            `${APIService._idToken}`;
          (config.headers as Record<string, string>)["x-access-token"] =
            `${APIService._accessToken}`;
        }

        const endpointKey = [
          String(config.method || "get").toUpperCase(),
          config.baseURL || "",
          config.url || "",
          JSON.stringify(config.params || {}),
        ].join(":");
        const existingToken = APIService._cancelTokenMap.get(endpointKey);
        if (existingToken) {
          existingToken.cancel(`Request cancelled for endpoint: ${config.url || ""}`);
        }

        const newTokenSource = axios.CancelToken.source();
        APIService._cancelTokenMap.set(endpointKey, newTokenSource);
        config.cancelToken = newTokenSource.token;
        requestConfig._cancelKey = endpointKey;

        return config;
      },
      (error) => {
        if ((error.config as RequestConfigWithLoader | undefined)?.showGlobalLoading) {
          store.dispatch(stopLoading());
        }
        return Promise.reject(error);
      },
    );
  }

  private static updateResponseInterceptor() {
    APIService._instance.interceptors.response.use(
      (response) => {
        const responseConfig = response.config as RequestConfigWithLoader;
        const cancelKey = responseConfig._cancelKey;
        if (cancelKey) {
          APIService._cancelTokenMap.delete(cancelKey);
        }
        if (responseConfig.showGlobalLoading) {
          store.dispatch(stopLoading());
        }
        return response;
      },
      (error) => {
        const errorConfig = error.config as RequestConfigWithLoader | undefined;
        const cancelKey = errorConfig?._cancelKey;
        if (cancelKey) {
          APIService._cancelTokenMap.delete(cancelKey);
        }
        if (!axios.isCancel(error) && errorConfig?.showGlobalLoading) {
          store.dispatch(stopLoading());
        }
        return Promise.reject(error);
      },
    );
  }
}

export const apiService = APIService;
