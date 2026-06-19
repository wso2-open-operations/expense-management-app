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

# OAuth2 client credentials configuration for the HR entity service.
type Oauth2Config record {|
    # OAuth2 client ID
    string clientId;
    # OAuth2 client secret
    string clientSecret;
    # Token endpoint URL
    string tokenUrl;
|};

# Employee basic information returned by the HR entity service.
public type Employee record {|
    # First name of the employee
    string firstName;
    # Last name of the employee
    string lastName;
    # Thumbnail URL of the employee
    string? employeeThumbnail;
    # Email address from Asgardeo userinfo, used for subject binding
    string? email;
|};

# Search filter payload sent to the HR entity service.
type EmployeeSearchFilter record {|
    # Work email address to look up
    string email;
|};
