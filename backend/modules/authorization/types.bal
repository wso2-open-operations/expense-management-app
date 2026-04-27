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

# User information extracted from the Asgardeo JWT assertion.
public type CustomJwtPayload record {
    # Work email address of the authenticated user
    string email;
    # Group or role names assigned to the authenticated user
    string|string[] groups = [];
};

# Normalized user information stored in the request context after JWT validation.
public type UserInfo record {|
    # Work email address of the authenticated user
    string email;
    # Normalized group names assigned to the authenticated user
    string[] groups = [];
|};

# Application-specific role names used for authorization checks.
public type AppRoles record {|
    # Role granted to employees
    string employeeRole;
    # Role granted to finance administrators
    string financeAdminRole;
|};
