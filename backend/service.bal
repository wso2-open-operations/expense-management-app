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
import expense_management.authorization;
import expense_management.database;
import expense_management.entity;

import ballerina/cache;
import ballerina/http;
import ballerina/log;
import ballerina/time;

public configurable AppConfig appConfig = ?;
configurable decimal annualClaimLimit = ?;
configurable decimal claimRangeStep = ?;
configurable int lastYearClaimGracePeriodInDays = ?;

final cache:Cache cache = new ({
    capacity: 2000,
    defaultMaxAge: 1800.0,
    cleanupInterval: 900.0
});

service class ErrorInterceptor {
    *http:ResponseErrorInterceptor;

    # Convert payload binding failures into client-friendly bad request responses.
    #
    # + err - Response error raised while handling the request
    # + ctx - Request context for the current request
    # + return - Bad request response for payload binding failures, otherwise the original error
    remote function interceptResponseError(error err, http:RequestContext ctx) returns http:BadRequest|error {
        if err is http:PayloadBindingError {
            string customError = "Payload binding failed!";
            log:printError(customError, err);
            return {
                body: {
                    message: customError
                }
            };
        }
        return err;
    }
}

@display {
    label: "Expense Management Dashboard",
    id: "finance/expense-management-dashboard"
}
service http:InterceptableService / on new http:Listener(9090) {

    # Create the interceptors applied to all service requests.
    #
    # + return - Ordered list of service interceptors
    public function createInterceptors() returns http:Interceptor[] =>
        [new authorization:JwtInterceptor(), new ErrorInterceptor()];

    # Get frontend application configuration.
    #
    # + return - Application configuration used by the frontend
    resource function get app\-config() returns AppConfig => appConfig;

    # Get user information and privileges for the authenticated user.
    #
    # + ctx - Request context containing authenticated user information
    # + return - User information response if successful, otherwise an internal server error
    resource function get user\-info(http:RequestContext ctx) returns UserInfoResponse|http:InternalServerError {
        authorization:CustomJwtPayload|error userInfo = ctx.getWithType(authorization:HEADER_USER_INFO);
        if userInfo is error {
            return <http:InternalServerError>{
                body: {
                    message: "User information header not found!"
                }
            };
        }

        if cache.hasKey(userInfo.email) {
            UserInfoResponse|error cachedUserInfo = cache.get(userInfo.email).ensureType();
            if cachedUserInfo is UserInfoResponse {
                return cachedUserInfo;
            }
        }

        entity:Employee|error loggedInUser = entity:fetchEmployeesBasicInfo(userInfo.email);
        if loggedInUser is error {
            string customError = "Error occurred while retrieving user data.";
            log:printError(customError, loggedInUser);
            return <http:InternalServerError>{
                body: {
                    message: customError
                }
            };
        }

        string[] groupsList = userInfo.groups is string[] ? <string[]>userInfo.groups : [<string>userInfo.groups];
        int[] privileges = [];
        if authorization:checkPermissions([authorization:authorizedRoles.employeeRole], groupsList) {
            privileges.push(authorization:EMPLOYEE_ROLE_PRIVILEGE);
        }
        if authorization:checkPermissions([authorization:authorizedRoles.financeAdminRole], groupsList) {
            privileges.push(authorization:FINANCE_ADMIN_PRIVILEGE);
        }

        UserInfoResponse userInfoResponse = {...loggedInUser, privileges};

        error? cacheError = cache.put(userInfo.email, userInfoResponse);
        if cacheError is error {
            log:printError("An error occurred while writing user info to the cache", cacheError);
        }
        return userInfoResponse;
    }

    # Get the OPD claim summary for the requested reporting period.
    #
    # + ctx - Request context containing authenticated user information
    # + year - Optional reporting year
    # + month - Optional reporting month
    # + months - Number of months included in the reporting window
    # + return - OPD claim summary if successful, otherwise an HTTP error response
    resource function get opd\-claims(http:RequestContext ctx, int? year = (), int? month = (), int months = 1)
        returns OpdClaimSummaryResponse|http:BadRequest|HttpInternalServerError {

        authorization:CustomJwtPayload|error userInfo = ctx.getWithType(authorization:HEADER_USER_INFO);
        if userInfo is error {
            return <http:BadRequest>{
                body: {
                    message: "User information header not found!"
                }
            };
        }

        if year is int && year <= 0 {
            return <http:BadRequest>{
                body: {
                    message: "Invalid year. Expected a positive value."
                }
            };
        }

        if month is int && (month < 1 || month > 12) {
            return <http:BadRequest>{
                body: {
                    message: "Invalid month. Expected a value between 1 and 12."
                }
            };
        }

        time:Utc utcNow = time:utcNow();
        time:Civil|error civilTime = time:utcToCivil(utcNow);
        if civilTime is error {
            string customError = "Failed to resolve the current date for OPD claim summary defaults.";
            log:printError(customError, civilTime);
            return <HttpInternalServerError>{
                body: {
                    message: customError
                }
            };
        }

        int effectiveYear = year ?: civilTime.year;
        int effectiveMonth = month ?: civilTime.month;

        OpdClaimSummaryResponse|error summary = getOpdClaimSummary(
                effectiveYear,
                effectiveMonth,
                months
        );
        if summary is error {
            string customError = "Failed to build OPD claim summary.";
            log:printError(customError, summary);
            return <HttpInternalServerError>{
                body: {
                    message: customError
                }
            };
        }

        return summary;
    }

    # Get the health status of the service and its database dependency.
    #
    # + return - Health status response for the service
    resource function get health() returns json {
        string? dbError = database:getDatabaseHealth();
        string status = dbError is () ? "ok" : "degraded";

        return {
            status: status,
            database: {
                healthy: dbError is (),
                message: dbError
            }
        };
    }
}
