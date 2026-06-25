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

import { type PayloadAction, createSlice } from "@reduxjs/toolkit";

import type { UserInfoInterface, UserState } from "@slices/authSlice/auth";

import { State } from "../../types/types";

const initialState: UserState = {
  state: State.idle,
  stateMessage: null,
  errorMessage: null,
  userInfo: null,
};

export const UserSlice = createSlice({
  name: "getUserInfo",
  initialState,
  reducers: {
    updateStateMessage: (state, action: PayloadAction<string>) => {
      state.stateMessage = action.payload;
    },

    
    // Handles the user profile data directly from Asgardeo SDK
    setUserInfoFromClaims: (state, action: PayloadAction<UserInfoInterface>) => {
      state.userInfo = action.payload;
      state.state = State.success;
    },
  },
});

export const { updateStateMessage, setUserInfoFromClaims } = UserSlice.actions;

export default UserSlice.reducer;