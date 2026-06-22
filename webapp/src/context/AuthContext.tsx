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

import axios from "axios";
import { useAuthContext } from "@asgardeo/auth-react";
import { useIdleTimer } from "react-idle-timer";

import React, { useCallback, useEffect, useRef, useState } from "react";

import BackgroundLoader from "@component/common/BackgroundLoader";
import SessionWarningDialog from "@component/common/SessionWarningDialog";
import { redirectUrl } from "@config/constant";
import { loadPrivileges, setAuthError, setUserAuthData } from "@slices/authSlice/auth";
import { fetchAppConfig } from "@slices/configSlice/config";
import { useAppDispatch } from "@slices/store";
import { setUserInfoFromClaims } from "@slices/userSlice/user";
import { APIService } from "@utils/apiService";

import { AppAuthContext, type AuthContextType } from "./authContextDef";

enum AppState {
  Loading = "loading",
  Unauthenticated = "unauthenticated",
  Authenticated = "authenticated",
}

const timeout = 15 * 60 * 1000;
const promptBeforeIdle = 4_000;
const MAX_SIGN_IN_ATTEMPTS = 3;

const AppAuthProvider = (props: { children: React.ReactNode }) => {
  const [sessionWarningOpen, setSessionWarningOpen] = useState<boolean>(false);
  const [appState, setAppState] = useState<AppState>(AppState.Loading);
  const initializedUserRef = useRef<string | null>(null);
  const signInTriggeredRef = useRef(false);
  const signInAttemptsRef = useRef(0);
  const signInFailedRef = useRef(false);
  const authStatusRef = useRef({
    isAuthenticated: false,
    isLoading: true,
  });

  const dispatch = useAppDispatch();

  const onPrompt = () => {
    if (appState === AppState.Authenticated) {
      setSessionWarningOpen(true);
    }
  };

  const { activate } = useIdleTimer({
    onPrompt,
    timeout,
    promptBeforeIdle,
    throttle: 500,
  });

  const {
    signIn,
    signOut,
    getDecodedIDToken,
    getBasicUserInfo,
    refreshAccessToken,
    getIDToken,
    getAccessToken,
    state,
  } = useAuthContext();

  useEffect(() => {
    if (!localStorage.getItem(redirectUrl)) {
      localStorage.setItem(redirectUrl, window.location.href.replace(window.location.origin, ""));
    }
  }, []);

  useEffect(() => {
    authStatusRef.current = {
      isAuthenticated: state.isAuthenticated,
      isLoading: state.isLoading,
    };

    if (state.isAuthenticated) {
      signInTriggeredRef.current = false;
      signInAttemptsRef.current = 0;
      signInFailedRef.current = false;
    }
  }, [state.isAuthenticated, state.isLoading]);

  const appSignOut = useCallback(async () => {
    initializedUserRef.current = null;
    signInTriggeredRef.current = false;
    signInAttemptsRef.current = 0;
    signInFailedRef.current = false;
    await signOut();
    setAppState(AppState.Unauthenticated);
  }, [signOut]);

  const refreshToken = useCallback(async (): Promise<{ idToken: string; accessToken: string }> => {
    try {
      if (!state.isAuthenticated) {
        await refreshAccessToken();
      }
      const [idToken, accessToken] = await Promise.all([getIDToken(), getAccessToken()]);
      return { idToken, accessToken };
    } catch (error) {
      console.error("Token refresh failed: ", error);
      await appSignOut();
      throw error;
    }
  }, [state.isAuthenticated, getIDToken, getAccessToken, refreshAccessToken, appSignOut]);

  const setupAuthenticatedUser = useCallback(async () => {
    const [userInfo, idToken, decodedIdToken, accessToken] = await Promise.all([
      getBasicUserInfo(),
      getIDToken(),
      getDecodedIDToken(),
      getAccessToken(),
    ]);

    dispatch(
      setUserAuthData({
        userInfo: userInfo,
        decodedIdToken: decodedIdToken,
      }),
    );

    new APIService(idToken, accessToken, refreshToken);

    dispatch(
      setUserInfoFromClaims({
        firstName: (decodedIdToken.given_name as string | undefined) ?? (userInfo.firstName ?? ""),
        lastName: (decodedIdToken.family_name as string | undefined) ?? (userInfo.lastName ?? ""),
        workEmail: userInfo.email ?? "",
        employeeThumbnail: (decodedIdToken.picture as string | undefined) ?? null,
      }),
    );

    await Promise.all([
      dispatch(loadPrivileges()).unwrap(),
      dispatch(fetchAppConfig()).unwrap(),
    ]);
  }, [getBasicUserInfo, getIDToken, getDecodedIDToken, dispatch, refreshToken]);

  const appSignIn = useCallback(async () => {
    if (signInFailedRef.current || signInAttemptsRef.current >= MAX_SIGN_IN_ATTEMPTS) {
      return;
    }

    setAppState(AppState.Loading);
    signInAttemptsRef.current += 1;
    await signIn();
  }, [signIn]);

  useEffect(() => {
    if (state.isAuthenticated) {
      signInTriggeredRef.current = false;
      return;
    }

    if (appState !== AppState.Unauthenticated) {
      signInTriggeredRef.current = false;
      return;
    }

    if (state.isLoading || signInFailedRef.current) {
      return;
    }

    if (signInAttemptsRef.current >= MAX_SIGN_IN_ATTEMPTS) {
      signInFailedRef.current = true;
      return;
    }

    if (signInTriggeredRef.current) {
      return;
    }

    signInTriggeredRef.current = true;
    void appSignIn().finally(() => {
      const { isAuthenticated, isLoading } = authStatusRef.current;

      if (isAuthenticated) {
        signInTriggeredRef.current = false;
        signInAttemptsRef.current = 0;
        signInFailedRef.current = false;
        return;
      }

      if (!isLoading) {
        signInTriggeredRef.current = false;
        if (signInAttemptsRef.current >= MAX_SIGN_IN_ATTEMPTS) {
          signInFailedRef.current = true;
        }
      }
    });
  }, [appSignIn, appState, state.isAuthenticated, state.isLoading]);

  const handleContinue = useCallback(() => {
    setSessionWarningOpen(false);
    activate();
  }, [activate]);

  const handleLogout = useCallback(() => {
    void appSignOut();
  }, [appSignOut]);

  useEffect(() => {
    if (state.isLoading) {
      setAppState(AppState.Loading);
      return;
    }

    if (!state.isAuthenticated) {
      initializedUserRef.current = null;
      setAppState(AppState.Unauthenticated);
      return;
    }

    const userKey = state.username || state.email || state.sub || "authenticated-user";
    if (initializedUserRef.current === userKey) {
      setAppState(AppState.Authenticated);
      return;
    }

    let cancelled = false;

    const bootstrapAuthenticatedUser = async () => {
      try {
        setAppState(AppState.Loading);
        await setupAuthenticatedUser();

        if (!cancelled) {
          initializedUserRef.current = userKey;
          setAppState(AppState.Authenticated);
        }
      } catch (error) {
        if (
          axios.isCancel(error) ||
          (error instanceof Error && error.name === "CanceledError") ||
          (typeof error === "object" &&
            error !== null &&
            "code" in error &&
            (error as { code?: string }).code === "ERR_CANCELED")
        ) {
          return;
        }
        console.error("Auth bootstrap failed:", error);
        if (!cancelled) {
          dispatch(setAuthError());
        }
      }
    };

    void bootstrapAuthenticatedUser();

    return () => {
      cancelled = true;
    };
  }, [
    dispatch,
    setupAuthenticatedUser,
    state.email,
    state.isAuthenticated,
    state.isLoading,
    state.sub,
    state.username,
  ]);

  const authContext: AuthContextType = {
    appSignIn: appSignIn,
    appSignOut: appSignOut,
  };

  const renderContent = () => {
    switch (appState) {
      case AppState.Loading:
        return <BackgroundLoader loading />;

      case AppState.Authenticated:
        return <AppAuthContext.Provider value={authContext}>{props.children}</AppAuthContext.Provider>;

      case AppState.Unauthenticated:
        return (
          <AppAuthContext.Provider value={authContext}>
            <BackgroundLoader loading />
          </AppAuthContext.Provider>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <SessionWarningDialog
        open={sessionWarningOpen}
        onExtend={handleContinue}
        onLogout={handleLogout}
      />
      {renderContent()}
    </>
  );
};

export default AppAuthProvider;