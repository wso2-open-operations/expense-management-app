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

const int EMPLOYEE_NAME_CACHE_CAPACITY = 5000;
const decimal EMPLOYEE_NAME_CACHE_DEFAULT_MAX_AGE = 3600.0d; // TTL: 1 hour
const decimal EMPLOYEE_NAME_CACHE_CLEANUP_INTERVAL = 1800.0d; // Eviction interval

// Thread-safe in-memory cache to store email -> full name mappings
final cache:Cache employeeNameCache = new ({
    capacity: EMPLOYEE_NAME_CACHE_CAPACITY,
    defaultMaxAge: EMPLOYEE_NAME_CACHE_DEFAULT_MAX_AGE,
    cleanupInterval: EMPLOYEE_NAME_CACHE_CLEANUP_INTERVAL
});

# Fetch basic employee details for the given work email from the HR entity service.
#
# + workEmail - Work email address of the employee to look up
# + return - Employee details if the HR entity lookup succeeds, otherwise an error
public isolated function fetchEmployeesBasicInfo(string workEmail) returns Employee|error {
    json requestPayload = {"email": workEmail};

    http:Request request = new;
    request.setJsonPayload(requestPayload);

    http:Response response = check hrClient->post("/employee-basic-search", request);

    if response.statusCode == 404 {
        return error(string `Employee not found for email: ${workEmail}`);
    }
    if response.statusCode < 200 || response.statusCode >= 300 {
        string responseBody = check response.getTextPayload();
        return error(string `HR service request failed with status ${response.statusCode}: ${responseBody}`);
    }

    json payload = check response.getJsonPayload();
    Employee|error employee = payload.cloneWithType();
    if employee is error {
        return employee;
    }
    return employee;
}

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
        //check cache first Before calling the HR entity service
        any|cache:Error cached = employeeNameCache.get(lower);
        if cached is string {
            // Cache Hit: Serve directly from memory without network calls
            nameMap[lower] = cached;
            continue;
        }

        // Cache Miss: Proceed to call downstream service
        Employee|error emp = fetchEmployeesBasicInfo(email);
        if emp is Employee {
            string fullName = emp.firstName + " " + emp.lastName;
            nameMap[lower] = fullName;

            // Store the resolved name in cache for future use
            cache:Error? cacheErr = employeeNameCache.put(lower, fullName);
            if cacheErr is cache:Error {
                log:printWarn("Failed to cache employee name", cacheErr, email = lower);
            }
        }
    }
    return nameMap;
}