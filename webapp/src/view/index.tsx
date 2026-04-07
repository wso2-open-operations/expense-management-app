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
import { type ComponentType, type LazyExoticComponent, Suspense, lazy } from "react";

import AppSkeleton from "@component/common/AppSkeleton";

type AnyComponent =
  | ComponentType<Record<string, unknown>>
  | LazyExoticComponent<ComponentType<Record<string, unknown>>>;

const withSuspense = (Component: AnyComponent) => {
  return function WrappedComponent(props: Record<string, unknown>) {
    return (
      <Suspense fallback={<AppSkeleton />}>
        <Component {...props} />
      </Suspense>
    );
  };
};

const dashboard = withSuspense(lazy(() => import("@root/src/view/dashboard/Dashboard")));
const opd = withSuspense(lazy(() => import("@root/src/view/opd/Opd")));
const expense = withSuspense(lazy(() => import("@root/src/view/expense/Expense")));
const employees = withSuspense(lazy(() => import("@root/src/view/employees/Employees")));
const card = withSuspense(lazy(() => import("@root/src/view/credit-cards/Credit")));
const settings = withSuspense(lazy(() => import("@root/src/view/settings/Settings")));
const reports = withSuspense(lazy(() => import("@root/src/view/reports/Reports")));
const admin = withSuspense(lazy(() => import("@root/src/view/admin-panel/Admin")));
const profile = withSuspense(lazy(() => import("@root/src/view/profile/Profile")));

export const View = {
  dashboard,
  opd,
  expense,
  employees,
  card,
  reports,
  settings,
  admin,
  profile,
};
