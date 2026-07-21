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

import ballerina/cache;
import ballerina/log;

final cache:Cache employeeNameCache = new ({
    capacity: 1000,
    defaultMaxAge: 86400.0d, // TTL: 1 day
    cleanupInterval: 1800.0d // Eviction interval
});

# Fetch basic employee details for the given work emails from the HR entity service.
#
# + emails - Array of work email addresses to look up
# + return - Array of employee details if the HR entity lookup succeeds, otherwise an error
public isolated function fetchEmployeeBatch(string[] emails) returns Employee[]|error {
    return check postEmployeeBatchSearch({"emails": emails});
}

// Extracted so tests can mock the HR entity call directly via `@test:Mock`,
// since `hrClient` is `final` and cannot be reassigned/mocked as an object.
isolated function postEmployeeBatchSearch(json payload) returns Employee[]|error {
    // Direct call without locks since hrClient is public final and isolated-safe
    return check hrClient->/["employee-batch-search"].post(payload);
}

# Fetch a map of lowercase work email → full name for the given list of emails.
#
# + emails - Work email addresses to resolve
# + return - Map of email to "firstName lastName" if successful, otherwise an error
public isolated function fetchEmployeeNameMap(string[] emails) returns map<string>|error {
    map<string> nameMap = {};
    string[] batchEmails = [];
    
    foreach string email in emails {
        string lower = email.trim().toLowerAscii();
        if lower == "" || nameMap.hasKey(lower) {
            continue;
        }
        
        lock {
            if employeeNameCache.hasKey(lower) {
                var cached = employeeNameCache.get(lower);
                if cached is string {
                    nameMap[lower] = cached;
                    continue;
                }
            }
        }

        batchEmails.push(email);
    }

    if batchEmails.length() > 0 {
        Employee[] employees = check fetchEmployeeBatch(batchEmails);
        
        foreach Employee emp in employees {
            string lower = emp.email.trim().toLowerAscii();
            string fullName = emp.firstName + " " + emp.lastName;
            nameMap[lower] = fullName;

            lock {
                cache:Error? cacheErr = employeeNameCache.put(lower, fullName);
                if cacheErr is cache:Error {
                    log:printWarn("Failed to cache employee name", cacheErr, email = lower);
                }
            }
        }
    }
    
    return nameMap;
}