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
import { createContext, useContext, useState } from "react";

export type ViewMode = "admin" | "employee";

interface ViewModeContextValue {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}

const STORAGE_KEY = "viewMode";

const VALID_MODES: ViewMode[] = ["admin", "employee"];

export const ViewModeContext = createContext<ViewModeContextValue>({
  viewMode: "admin",
  setViewMode: () => {},
});

export function ViewModeContextProvider({ children }: { children: React.ReactNode }) {
  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ViewMode;
    return VALID_MODES.includes(stored) ? stored : "admin";
  });

  const setViewMode = (mode: ViewMode) => {
    localStorage.setItem(STORAGE_KEY, mode);
    setViewModeState(mode);
  };

  return (
    <ViewModeContext.Provider value={{ viewMode, setViewMode }}>
      {children}
    </ViewModeContext.Provider>
  );
}

export function useViewMode() {
  return useContext(ViewModeContext);
}
