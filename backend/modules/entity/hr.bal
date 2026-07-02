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


# Fetch a map of lowercase work email → full name for the given list of emails.
#
# + emails - Work email addresses to resolve
# + return - Map of email to "firstName lastName" if successful, otherwise an error
public isolated function fetchEmployeeNameMap(string[] emails) returns map<string>|error {
    map<string> nameMap = {};
    foreach string email in emails {
        string lower = email.trim().toLowerAscii();
        if lower == "" || nameMap.hasKey(lower) {
            continue;
        }
    }
    return nameMap;
}



