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
import ballerina/http;
import ballerina/log;

final cache:Cache employeeNameCache = new ({
    capacity: 1000,
    defaultMaxAge: 86400.0d, // TTL: 1 day
    cleanupInterval: 1800.0d // Eviction interval
});

# Fetch basic employee details for the given batch of work emails from the HR entity service.
#
# + batchEmails - Array of work email addresses to look up
# + return - Array of employee details if the HR entity lookup succeeds, otherwise an error
public isolated function fetchEmployeesBasicInfo(string[] batchEmails) returns Employee[]|error {
    json requestPayload = {"emails": batchEmails};

    http:Request request = new;
    request.setJsonPayload(requestPayload);

    http:Response response = check hrClient->post("/employee-batch-search", request);

    if response.statusCode < 200 || response.statusCode >= 300 {
        string|error responseBody = response.getTextPayload();
        string bodyText = responseBody is string ? responseBody : "<no response body>";
        return error(string `HR service request failed with status ${response.statusCode}: ${bodyText}`);
    }

    json payload = check response.getJsonPayload();
    Employee[]|error employees = payload.cloneWithType();
    if employees is error {
        return employees;
    }
    return employees;
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
        any|cache:Error cached = employeeNameCache.get(lower);
        if cached is string {
            nameMap[lower] = cached;
            continue;
        }

        batchEmails.push(email);
    }

    if batchEmails.length() > 0 {
        Employee[] employees = check fetchEmployeesBasicInfo(batchEmails);
        
        foreach Employee emp in employees {
            string? empEmail = emp.email;
            if empEmail is () {
                continue;
            }
            string lower = empEmail.trim().toLowerAscii();
            string fullName = emp.firstName + " " + emp.lastName;
            nameMap[lower] = fullName;

            cache:Error? cacheErr = employeeNameCache.put(lower, fullName);
            if cacheErr is cache:Error {
                log:printWarn("Failed to cache employee name", cacheErr, email = lower);
            }
        }
    }
    
    return nameMap;
}
