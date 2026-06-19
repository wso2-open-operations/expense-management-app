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

import { type PayloadAction, createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { AxiosError } from "axios";

import type { UserInfoInterface, UserState } from "@slices/authSlice/auth";
import { APIService } from "@utils/apiService";

import { State } from "../../types/types";

const initialState: UserState = {
  state: State.idle,
  stateMessage: null,
  errorMessage: null,
  userInfo: null,
};

export const getUserInfo = createAsyncThunk(
  "user/getUserInfo",
  async (email: string) => {
    return new Promise<{
      UserInfo: UserInfoInterface;
    }>((resolve, reject) => {
      APIService.getInstance()
        .get(`/${email}`)
        .then((resp) => {
          resolve({
            UserInfo: resp.data,
          });
        })
        .catch((error: AxiosError) => {
          reject(error);
        });
    });
  }
);

export const UserSlice = createSlice({
  name: "getUserInfo",
  initialState,
  reducers: {
    updateStateMessage: (state, action: PayloadAction<string>) => {
      state.stateMessage = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getUserInfo.pending, (state) => {
        state.state = State.loading;
        state.stateMessage = "Checking User Info...";
      })
      .addCase(getUserInfo.fulfilled, (state, action) => {
        state.userInfo = action.payload.UserInfo;
        state.state = State.success;
      })
      .addCase(getUserInfo.rejected, (state, action) => {
        state.state = State.failed;
        if (action.error.code === AxiosError.ERR_BAD_REQUEST) {
          state.errorMessage =
            "Oops! Looks like you are not authorized to access this application.";
        } else {
          state.errorMessage = "Something went wrong while authenticating the user.";
        }
      });
  },
});

export const { updateStateMessage } = UserSlice.actions;

export default UserSlice.reducer;
