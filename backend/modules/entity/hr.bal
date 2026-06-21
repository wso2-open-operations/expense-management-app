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
import ballerina/http;

# Asgardeo userinfo response fields used for employee profile.
type AsgardeoUserInfo record {
    string? given_name = ();
    string? family_name = ();
    string? thumbnail = ();
    string? email = ();
};

# Fetch the logged-in user's name and profile picture from the Asgardeo userinfo endpoint.
#
# + accessToken - Bearer access token from the frontend
# + return - Employee details if successful, otherwise an error
public isolated function fetchUserInfoFromAsgardeo(string accessToken) returns Employee|error {
    map<string|string[]> headers = {"Authorization": "Bearer " + accessToken};
    http:Response response = check asgardeoClient->get("/t/wso2/oauth2/userinfo", headers);

    if response.statusCode < 200 || response.statusCode >= 300 {
        return error(string `Asgardeo userinfo request failed with status ${response.statusCode}`);
    }

    json payload = check response.getJsonPayload();
    AsgardeoUserInfo|error info = payload.cloneWithType();
    if info is error {
        return error("Failed to parse Asgardeo userinfo response");
    }

    string email = info.email ?: "";
    if email.trim().length() == 0 {
        return error("Asgardeo userinfo response missing email field");
    }

    return {
        firstName: info.given_name ?: "",
        lastName: info.family_name ?: "",
        employeeThumbnail: info.picture,
        email: email
    };
}

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
        Employee|error emp = fetchEmployeesBasicInfo(email);
        if emp is Employee {
            nameMap[lower] = emp.firstName + " " + emp.lastName;
        }
    }
    return nameMap;
}