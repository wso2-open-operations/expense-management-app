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

final cache:Cache cache = new ({
    capacity: CACHE_CAPACITY,
    defaultMaxAge: CACHE_DEFAULT_MAX_AGE,
    cleanupInterval: CACHE_CLEANUP_INTERVAL
});

isolated function extractUserInfo(http:RequestContext ctx) returns authorization:UserInfo|http:BadRequest {
    authorization:UserInfo|error userInfo = ctx.getWithType(authorization:HEADER_USER_INFO);
    if userInfo is error {
        return <http:BadRequest>{body: {message: "User information header not found!"}};
    }
    return userInfo;
}

isolated function resolveEffectiveDate(int? year, int? month) returns [int, int]|HttpInternalServerError {
    time:Civil|error civilTime = time:utcToCivil(time:utcNow());
    if civilTime is error {
        log:printError("Failed to resolve current date.", civilTime);
        return <HttpInternalServerError>{body: {message: "Failed to resolve the current date."}};
    }
    return [year ?: civilTime.year, month ?: civilTime.month];
}

isolated function normalizeBusinessUnit(string? businessUnit) returns string? {
    if businessUnit is string &&
            (businessUnit.trim().length() == 0 || businessUnit == "All Business Units") {
        return ();
    }
    return businessUnit;
}

isolated function fetchNameMap(string[] emails) returns map<string> {
    map<string>|error hrNames = entity:fetchEmployeeNameMap(emails);
    return hrNames is map<string> ? hrNames : {};
}

isolated function validateCCDateParams(int? year, int? month, int monthRange) returns http:BadRequest? {
    if year is int && (year < 1970 || year > 2100) {
        return <http:BadRequest>{body: {message: "Invalid year. Expected a value between 1970 and 2100."}};
    }
    if month is int && (month < 1 || month > 12) {
        return <http:BadRequest>{body: {message: "Invalid month. Expected a value between 1 and 12."}};
    }
    if monthRange < 0 || monthRange > 36 {
        return <http:BadRequest>{body: {message: "monthRange must be between 0 and 36."}};
    }
    return ();
}

isolated function maskCardNumber(string cardNumber) returns string {
    string digits = re `\D`.replaceAll(cardNumber, "");
    if digits.length() < 4 {
        return "**** **** **** ****";
    }
    string last4 = digits.substring(digits.length() - 4);
    return string `**** **** **** ${last4}`;
}

function buildEffectiveAppConfig() returns AppConfig {
    map<string>|error dbSettings = database:getAppSettings();
    if dbSettings is error {
        log:printWarn("Could not read app_settings from DB; using Config.toml defaults.", dbSettings);
        return appConfig;
    }

    decimal claimLimit = appConfig.claimLimit;
    decimal claimRangeStep = appConfig.claimRangeStep;
    int lastYearClaimGracePeriodInDays = appConfig.lastYearClaimGracePeriodInDays;
    string[] submissionsAllowedLocations = appConfig.submissionsAllowedLocations;

    string? rawLimit = dbSettings["claimLimit"];
    if rawLimit is string {
        decimal|error v = decimal:fromString(rawLimit);
        if v is decimal && v > 0.0d {
            claimLimit = v;
        } else {
            log:printWarn("Ignoring invalid claimLimit from DB; keeping default.", val = rawLimit);
        }
    }

    string? rawStep = dbSettings["claimRangeStep"];
    if rawStep is string {
        decimal|error v = decimal:fromString(rawStep);
        if v is decimal && v > 0.0d {
            claimRangeStep = v;
        } else {
            log:printWarn("Ignoring invalid claimRangeStep from DB; keeping default.", val = rawStep);
        }
    }

    string? rawGrace = dbSettings["lastYearClaimGracePeriodInDays"];
    if rawGrace is string {
        int|error v = int:fromString(rawGrace);
        if v is int && v >= 0 {
            lastYearClaimGracePeriodInDays = v;
        } else {
            log:printWarn("Ignoring invalid lastYearClaimGracePeriodInDays from DB; keeping default.", val = rawGrace);
        }
    }

    string? rawLocations = dbSettings["submissionsAllowedLocations"];
    if rawLocations is string && rawLocations.length() > 0 {
        string[] parsed = from string part in re `,`.split(rawLocations)
            let string t = part.trim()
            where t.length() > 0
            select t;
        if parsed.length() > 0 {
            submissionsAllowedLocations = parsed;
        } else {
            log:printWarn("Ignoring empty submissionsAllowedLocations from DB; keeping default.", val = rawLocations);
        }
    }

    return {claimLimit, claimRangeStep, lastYearClaimGracePeriodInDays, submissionsAllowedLocations};
}

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

    # Get frontend application configuration, merging any admin overrides from the database.
    #
    # + return - Effective application configuration
    resource function get app\-config() returns AppConfig {
        return buildEffectiveAppConfig();
    }

    # Update application configuration. Restricted to finance administrators.
    #
    # + ctx - Request context containing authenticated user information
    # + payload - Fields to update; omitted fields are left unchanged
    # + return - Updated application configuration, or an error response
    resource function put app\-config(http:RequestContext ctx, @http:Payload AppConfigUpdateRequest payload)
        returns AppConfig|http:BadRequest|http:Forbidden|HttpInternalServerError {

        authorization:UserInfo|http:BadRequest authResult = extractUserInfo(ctx);
        if authResult is http:BadRequest {
            return authResult;
        }

        if !authorization:checkPermissions([authorization:authorizedRoles.financeAdminRole], authResult.groups) {
            return <http:Forbidden>{body: {message: "Only administrators can update application configuration."}};
        }

        string updatedBy = authResult.email;

        decimal? newClaimLimit = payload.claimLimit;
        if newClaimLimit is decimal {
            if newClaimLimit <= 0.0d {
                return <http:BadRequest>{body: {message: "Claim limit must be a positive value."}};
            }
            error? err = database:upsertAppSetting("claimLimit", newClaimLimit.toString(), updatedBy);
            if err is error {
                log:printError("Failed to persist claimLimit.", err);
                return <HttpInternalServerError>{body: {message: "Failed to update claim limit."}};
            }
        }

        decimal? newClaimRangeStep = payload.claimRangeStep;
        if newClaimRangeStep is decimal {
            if newClaimRangeStep <= 0.0d {
                return <http:BadRequest>{body: {message: "Claim range step must be a positive value."}};
            }
            error? err = database:upsertAppSetting("claimRangeStep", newClaimRangeStep.toString(), updatedBy);
            if err is error {
                log:printError("Failed to persist claimRangeStep.", err);
                return <HttpInternalServerError>{body: {message: "Failed to update claim range step."}};
            }
        }

        int? newGracePeriod = payload.lastYearClaimGracePeriodInDays;
        if newGracePeriod is int {
            if newGracePeriod < 0 {
                return <http:BadRequest>{body: {message: "Grace period cannot be negative."}};
            }
            error? err = database:upsertAppSetting("lastYearClaimGracePeriodInDays", newGracePeriod.toString(), updatedBy);
            if err is error {
                log:printError("Failed to persist lastYearClaimGracePeriodInDays.", err);
                return <HttpInternalServerError>{body: {message: "Failed to update grace period."}};
            }
        }

        string[]? newLocations = payload.submissionsAllowedLocations;
        if newLocations is string[] {
            if newLocations.length() == 0 {
                return <http:BadRequest>{body: {message: "At least one allowed location is required."}};
            }
            string locationsValue = string:'join(",", ...newLocations);
            error? err = database:upsertAppSetting("submissionsAllowedLocations", locationsValue, updatedBy);
            if err is error {
                log:printError("Failed to persist submissionsAllowedLocations.", err);
                return <HttpInternalServerError>{body: {message: "Failed to update allowed locations."}};
            }
        }

        return buildEffectiveAppConfig();
    }

    # Get user information and privileges for the authenticated user.
    #
    # + ctx - Request context containing authenticated user information
    # + return - User information response if successful, otherwise an internal server error
    resource function get user\-info(http:RequestContext ctx) returns UserInfoResponse|http:InternalServerError {
        authorization:UserInfo|error userInfo = ctx.getWithType(authorization:HEADER_USER_INFO);
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

        int[] privileges = [];
        if authorization:checkPermissions([authorization:authorizedRoles.employeeRole], userInfo.groups) {
            privileges.push(authorization:EMPLOYEE_ROLE_PRIVILEGE);
        }
        if authorization:checkPermissions([authorization:authorizedRoles.financeAdminRole], userInfo.groups) {
            privileges.push(authorization:FINANCE_ADMIN_PRIVILEGE);
        }

        UserInfoResponse userInfoResponse = {
            workEmail: userInfo.email,
            firstName: loggedInUser.firstName,
            lastName: loggedInUser.lastName,
            employeeThumbnail: loggedInUser.employeeThumbnail,
            privileges
        };

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
    # + monthRange - Number of months included in the reporting window
    # + return - OPD claim summary if successful, otherwise an HTTP error response
    resource function get opd\-claims(http:RequestContext ctx, int? year = (), int? month = (), int monthRange = 1)
        returns OpdClaimSummaryResponse|http:BadRequest|HttpInternalServerError {

        authorization:UserInfo|http:BadRequest authResult = extractUserInfo(ctx);
        if authResult is http:BadRequest {
            return authResult;
        }

        if year is int && year <= 0 {
            return <http:BadRequest>{body: {message: "Invalid year. Expected a positive value."}};
        }

        if month is int && (month < 1 || month > 12) {
            return <http:BadRequest>{body: {message: "Invalid month. Expected a value between 1 and 12."}};
        }

        [int, int]|HttpInternalServerError dateResult = resolveEffectiveDate(year, month);
        if dateResult is HttpInternalServerError {
            return dateResult;
        }
        int effectiveYear = dateResult[0];
        int effectiveMonth = dateResult[1];

        AppConfig effectiveConfig = buildEffectiveAppConfig();
        OpdClaimSummaryResponse|error summary = getOpdClaimSummary(
                effectiveConfig,
                effectiveYear,
                effectiveMonth,
                monthRange
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

    # Get the expense claims summary for the requested reporting period.
    #
    # + ctx - Request context containing authenticated user information
    # + year - Optional reporting year (defaults to current year)
    # + month - Optional reporting month (defaults to current month)
    # + monthRange - Number of months included in the reporting window
    # + businessUnit - Optional business unit filter
    # + return - Expense claim summary if successful, otherwise an HTTP error response
    resource function get expense\-claims(http:RequestContext ctx, int? year = (), int? month = (),
            int monthRange = 1, string? businessUnit = ())
        returns ExpenseClaimSummaryResponse|http:BadRequest|HttpInternalServerError {

        authorization:UserInfo|http:BadRequest authResult = extractUserInfo(ctx);
        if authResult is http:BadRequest {
            return authResult;
        }

        if year is int && year <= 0 {
            return <http:BadRequest>{body: {message: "Invalid year. Expected a positive value."}};
        }

        if month is int && (month < 1 || month > 12) {
            return <http:BadRequest>{body: {message: "Invalid month. Expected a value between 1 and 12."}};
        }

        [int, int]|HttpInternalServerError dateResult = resolveEffectiveDate(year, month);
        if dateResult is HttpInternalServerError {
            return dateResult;
        }
        int effectiveYear = dateResult[0];
        int effectiveMonth = dateResult[1];

        string? effectiveBusinessUnit = normalizeBusinessUnit(businessUnit);

        ExpenseClaimSummaryResponse|error summary = getExpenseClaimSummary(
                effectiveYear,
                effectiveMonth,
                monthRange,
                effectiveBusinessUnit
        );
        if summary is error {
            string customError = "Failed to build expense claim summary.";
            log:printError(customError, summary);
            return <HttpInternalServerError>{
                body: {
                    message: customError
                }
            };
        }

        return summary;
    }

    # Get all employees ranked by total spending for the requested reporting period.
    #
    # + ctx - Request context containing authenticated user information
    # + year - Optional reporting year (defaults to current year)
    # + month - Optional reporting month (defaults to current month)
    # + monthRange - Number of months included in the reporting window
    # + businessUnit - Optional business unit filter
    # + return - Employee spending list if successful, otherwise an HTTP error response
    resource function get employee\-spending(http:RequestContext ctx, int? year = (), int? month = (),
            int monthRange = 1, string? businessUnit = ())
        returns EmployeeSpendingItem[]|http:BadRequest|HttpInternalServerError {

        authorization:UserInfo|http:BadRequest authResult = extractUserInfo(ctx);
        if authResult is http:BadRequest {
            return authResult;
        }

        [int, int]|HttpInternalServerError dateResult = resolveEffectiveDate(year, month);
        if dateResult is HttpInternalServerError {
            return dateResult;
        }
        int effectiveYear = dateResult[0];
        int effectiveMonth = dateResult[1];

        string? effectiveBusinessUnit = normalizeBusinessUnit(businessUnit);

        database:AllSpendingEmployeeRow[]|error rows = database:querySpendingEmployees(
                effectiveYear, effectiveMonth, monthRange, effectiveBusinessUnit
        );
        if rows is error {
            string customError = "Failed to fetch employee spending data.";
            log:printError(customError, rows);
            return <HttpInternalServerError>{body: {message: customError}};
        }

        string[] employeeEmails = from database:AllSpendingEmployeeRow row in rows select row.employeeEmail;
        map<string> nameMap = fetchNameMap(employeeEmails);

        return from database:AllSpendingEmployeeRow row in rows
            select {
                name: nameMap[row.employeeEmail.toLowerAscii()] ?: deriveDisplayName(row.employeeEmail),
                email: row.employeeEmail,
                totalAmount: row.total,
                claimCount: row.claimCount
            };
    }

    # Get the expense category breakdown for a specific employee.
    #
    # + ctx - Request context containing authenticated user information
    # + email - Employee email address
    # + year - Optional reporting year (defaults to current year)
    # + month - Optional reporting month (defaults to current month)
    # + monthRange - Number of months included in the reporting window
    # + statusFilter - Optional status group filter: "Approved" or "Pending"
    # + return - Employee spending breakdown if successful, otherwise an HTTP error response
    resource function get employee\-spending\-breakdown(http:RequestContext ctx, string email,
            int? year = (), int? month = (), int monthRange = 1, string? statusFilter = ())
        returns EmployeeSpendingBreakdownResponse|http:BadRequest|HttpInternalServerError {

        authorization:UserInfo|http:BadRequest authResult = extractUserInfo(ctx);
        if authResult is http:BadRequest {
            return authResult;
        }

        if email.trim().length() == 0 {
            return <http:BadRequest>{body: {message: "Employee email is required."}};
        }

        [int, int]|HttpInternalServerError dateResult = resolveEffectiveDate(year, month);
        if dateResult is HttpInternalServerError {
            return dateResult;
        }
        int effectiveYear = dateResult[0];
        int effectiveMonth = dateResult[1];
        string? effectiveStatusFilter = (statusFilter is string && statusFilter.trim().length() == 0) ? () : statusFilter;

        database:EmployeeCategoryRow[]|error catRows = database:queryEmployeeCategoryBreakdown(
                email, effectiveYear, effectiveMonth, monthRange, effectiveStatusFilter
        );
        if catRows is error {
            string customError = "Failed to fetch employee category breakdown.";
            log:printError(customError, catRows);
            return <HttpInternalServerError>{body: {message: customError}};
        }

        decimal grandTotal = 0.0d;
        int totalClaims = 0;
        foreach database:EmployeeCategoryRow r in catRows {
            grandTotal = grandTotal + r.total;
            totalClaims = totalClaims + r.claimCount;
        }

        EmployeeCategoryItem[] categories = from database:EmployeeCategoryRow row in catRows
            select {
                category: row.category,
                total: row.total,
                claimCount: row.claimCount,
                percentage: grandTotal > 0.0d ? (row.total / grandTotal) * 100.0d : 0.0d
            };

        string empName = deriveDisplayName(email);
        entity:Employee|error empEmployee = entity:fetchEmployeesBasicInfo(email);
        if empEmployee is entity:Employee {
            empName = empEmployee.firstName + " " + empEmployee.lastName;
        }

        return {
            name: empName,
            email: email,
            totalAmount: grandTotal,
            claimCount: totalClaims,
            categories: categories
        };
    }

    # Get individual transactions for a specific employee within an expense category.
    #
    # + ctx - Request context containing authenticated user information
    # + email - Employee email address
    # + category - Expense category label
    # + year - Optional reporting year (defaults to current year)
    # + month - Optional reporting month (defaults to current month)
    # + monthRange - Number of months included in the reporting window
    # + statusFilter - Optional status group filter: "Approved" or "Pending"
    # + return - Transaction list if successful, otherwise an HTTP error response
    resource function get employee\-category\-transactions(http:RequestContext ctx, string email,
            string category, int? year = (), int? month = (), int monthRange = 1, string? statusFilter = ())
        returns EmployeeCategoryTransactionItem[]|http:BadRequest|HttpInternalServerError {

        authorization:UserInfo|http:BadRequest authResult = extractUserInfo(ctx);
        if authResult is http:BadRequest {
            return authResult;
        }

        if email.trim().length() == 0 || category.trim().length() == 0 {
            return <http:BadRequest>{body: {message: "Employee email and category are required."}};
        }

        [int, int]|HttpInternalServerError dateResult = resolveEffectiveDate(year, month);
        if dateResult is HttpInternalServerError {
            return dateResult;
        }
        int effectiveYear = dateResult[0];
        int effectiveMonth = dateResult[1];
        string? effectiveStatusFilter = (statusFilter is string && statusFilter.trim().length() == 0) ? () : statusFilter;

        database:EmployeeCategoryTransactionRow[]|error txnRows = database:queryEmployeeCategoryTransactions(
                email, category, effectiveYear, effectiveMonth, monthRange, effectiveStatusFilter
        );
        if txnRows is error {
            string customError = "Failed to fetch employee category transactions.";
            log:printError(customError, txnRows);
            return <HttpInternalServerError>{body: {message: customError}};
        }

        return from database:EmployeeCategoryTransactionRow row in txnRows
            select {
                description: row.description,
                txnDate: row.txnDate,
                amount: row.amount,
                status: row.status
            };
    }

    # Get the authenticated employee's own expense claim summary statistics.
    #
    # + ctx - Request context containing authenticated user information
    # + year - Optional reporting year (defaults to current year)
    # + month - Optional reporting month (defaults to current month)
    # + monthRange - Number of months in the reporting window; 0 = all time
    # + return - Expense summary stats for the caller if successful, otherwise an HTTP error response
    resource function get my\-expense\-summary(http:RequestContext ctx, int? year = (), int? month = (),
            int monthRange = 0, string? testEmail = ())
        returns ExpenseSummaryStatsResponse|http:BadRequest|HttpInternalServerError {

        authorization:UserInfo|http:BadRequest authResult = extractUserInfo(ctx);
        if authResult is http:BadRequest {
            return authResult;
        }

        http:BadRequest? validationError = validateCCDateParams(year, month, monthRange);
        if validationError is http:BadRequest {
            return validationError;
        }

        [int, int]|HttpInternalServerError dateResult = resolveEffectiveDate(year, month);
        if dateResult is HttpInternalServerError {
            return dateResult;
        }
        int effectiveYear = dateResult[0];
        int effectiveMonth = dateResult[1];
        string callerEmail = testEmail ?: authResult.email;

        database:ExpenseSummaryStatsRow|error stats = database:queryExpenseSummaryStats(
                effectiveYear, effectiveMonth, monthRange, email = callerEmail
        );
        if stats is error {
            string customError = "Failed to fetch personal expense summary.";
            log:printError(customError, stats);
            return <HttpInternalServerError>{body: {message: customError}};
        }

        return {
            totalAmount: stats.totalAmount,
            totalCount: stats.totalCount,
            avgAmount: stats.avgAmount,
            approvedCount: stats.approvedCount,
            pendingCount: stats.pendingCount,
            rejectedCount: stats.rejectedCount
        };
    }

    # Get the authenticated employee's own expense category breakdown.
    #
    # + ctx - Request context containing authenticated user information
    # + year - Optional reporting year (defaults to current year)
    # + month - Optional reporting month (defaults to current month)
    # + monthRange - Number of months in the reporting window; 0 = all time
    # + statusFilter - Optional status group filter: "Approved" or "Pending"
    # + return - Expense category breakdown for the caller if successful, otherwise an HTTP error response
    resource function get my\-expense\-breakdown(http:RequestContext ctx, int? year = (), int? month = (),
            int monthRange = 0, string? statusFilter = (), string? testEmail = ())
        returns EmployeeSpendingBreakdownResponse|http:BadRequest|HttpInternalServerError {

        authorization:UserInfo|http:BadRequest authResult = extractUserInfo(ctx);
        if authResult is http:BadRequest {
            return authResult;
        }

        [int, int]|HttpInternalServerError dateResult = resolveEffectiveDate(year, month);
        if dateResult is HttpInternalServerError {
            return dateResult;
        }
        int effectiveYear = dateResult[0];
        int effectiveMonth = dateResult[1];
        string? effectiveStatusFilter = (statusFilter is string && statusFilter.trim().length() == 0) ? () : statusFilter;
        string callerEmail = testEmail ?: authResult.email;

        database:EmployeeCategoryRow[]|error catRows = database:queryEmployeeCategoryBreakdown(
                callerEmail, effectiveYear, effectiveMonth, monthRange, effectiveStatusFilter
        );
        if catRows is error {
            string customError = "Failed to fetch personal expense breakdown.";
            log:printError(customError, catRows);
            return <HttpInternalServerError>{body: {message: customError}};
        }

        decimal grandTotal = 0.0d;
        int totalClaims = 0;
        foreach database:EmployeeCategoryRow r in catRows {
            grandTotal = grandTotal + r.total;
            totalClaims = totalClaims + r.claimCount;
        }

        EmployeeCategoryItem[] categories = from database:EmployeeCategoryRow row in catRows
            select {
                category: row.category,
                total: row.total,
                claimCount: row.claimCount,
                percentage: grandTotal > 0.0d ? (row.total / grandTotal) * 100.0d : 0.0d
            };

        string empName = deriveDisplayName(callerEmail);
        entity:Employee|error empEmployee = entity:fetchEmployeesBasicInfo(callerEmail);
        if empEmployee is entity:Employee {
            empName = empEmployee.firstName + " " + empEmployee.lastName;
        }

        return {
            name: empName,
            email: callerEmail,
            totalAmount: grandTotal,
            claimCount: totalClaims,
            categories: categories
        };
    }

    # Get the authenticated employee's own expense transactions within a category.
    #
    # + ctx - Request context containing authenticated user information
    # + category - Expense category label
    # + year - Optional reporting year (defaults to current year)
    # + month - Optional reporting month (defaults to current month)
    # + monthRange - Number of months in the reporting window; 0 = all time
    # + statusFilter - Optional status group filter: "Approved" or "Pending"
    # + return - Transaction list for the caller if successful, otherwise an HTTP error response
    resource function get my\-expense\-transactions(http:RequestContext ctx, string category,
            int? year = (), int? month = (), int monthRange = 0, string? statusFilter = (), string? testEmail = ())
        returns EmployeeCategoryTransactionItem[]|http:BadRequest|HttpInternalServerError {

        authorization:UserInfo|http:BadRequest authResult = extractUserInfo(ctx);
        if authResult is http:BadRequest {
            return authResult;
        }

        if category.trim().length() == 0 {
            return <http:BadRequest>{body: {message: "Category is required."}};
        }

        [int, int]|HttpInternalServerError dateResult = resolveEffectiveDate(year, month);
        if dateResult is HttpInternalServerError {
            return dateResult;
        }
        int effectiveYear = dateResult[0];
        int effectiveMonth = dateResult[1];
        string? effectiveStatusFilter = (statusFilter is string && statusFilter.trim().length() == 0) ? () : statusFilter;
        string callerEmail = testEmail ?: authResult.email;

        database:EmployeeCategoryTransactionRow[]|error txnRows = database:queryEmployeeCategoryTransactions(
                callerEmail, category, effectiveYear, effectiveMonth, monthRange, effectiveStatusFilter
        );
        if txnRows is error {
            string customError = "Failed to fetch personal expense transactions.";
            log:printError(customError, txnRows);
            return <HttpInternalServerError>{body: {message: customError}};
        }

        return from database:EmployeeCategoryTransactionRow row in txnRows
            select {
                description: row.description,
                txnDate: row.txnDate,
                amount: row.amount,
                status: row.status
            };
    }

    # Get the authenticated employee's own OPD claim summary for a given year.
    #
    # + ctx - Request context containing authenticated user information
    # + year - Optional reporting year (defaults to current year)
    # + return - OPD summary for the caller if successful, otherwise an HTTP error response
    resource function get my\-opd\-summary(http:RequestContext ctx, int? year = (), string? testEmail = ())
        returns MyOpdSummaryResponse|http:BadRequest|HttpInternalServerError {

        authorization:UserInfo|http:BadRequest authResult = extractUserInfo(ctx);
        if authResult is http:BadRequest {
            return authResult;
        }

        [int, int]|HttpInternalServerError dateResult = resolveEffectiveDate(year, ());
        if dateResult is HttpInternalServerError {
            return dateResult;
        }
        int effectiveYear = dateResult[0];
        string callerEmail = testEmail ?: authResult.email;

        database:MyOpdSummaryRow|error opdStats = database:queryMyOpdSummary(callerEmail, effectiveYear);
        if opdStats is error {
            string customError = "Failed to fetch personal OPD summary.";
            log:printError(customError, opdStats);
            return <HttpInternalServerError>{body: {message: customError}};
        }

        return {claimedAmount: opdStats.claimedAmount, claimCount: opdStats.claimCount};
    }

    # Get the authenticated employee's own OPD claims list for a given year.
    #
    # + ctx - Request context containing authenticated user information
    # + year - Optional reporting year (defaults to current year)
    # + testEmail - Optional email override for testing
    # + return - OPD claims list for the caller if successful, otherwise an HTTP error response
    resource function get my\-opd\-claims(http:RequestContext ctx, int? year = (), string? testEmail = ())
        returns MyOpdClaimResponse[]|http:BadRequest|HttpInternalServerError {

        authorization:UserInfo|http:BadRequest authResult = extractUserInfo(ctx);
        if authResult is http:BadRequest {
            return authResult;
        }

        [int, int]|HttpInternalServerError dateResult = resolveEffectiveDate(year, ());
        if dateResult is HttpInternalServerError {
            return dateResult;
        }
        int effectiveYear = dateResult[0];
        string callerEmail = testEmail ?: authResult.email;

        database:MyOpdClaimRow[]|error claimRows = database:queryMyOpdClaims(callerEmail, effectiveYear);
        if claimRows is error {
            string customError = "Failed to fetch personal OPD claims.";
            log:printError(customError, claimRows);
            return <HttpInternalServerError>{body: {message: customError}};
        }

        return from database:MyOpdClaimRow row in claimRows
            select {id: row.id, date: row.date, amount: row.amount, status: row.status, description: row.description, txnCount: row.txnCount};
    }

    # Get the lead approval frequency list for the requested reporting period.
    #
    # + ctx - Request context containing authenticated user information
    # + year - Optional reporting year (defaults to current year)
    # + month - Optional reporting month (defaults to current month)
    # + monthRange - Number of months included in the reporting window
    # + businessUnit - Optional business unit filter
    # + return - Lead frequency list if successful, otherwise an HTTP error response
    resource function get lead\-approval\-frequency(http:RequestContext ctx, int? year = (), int? month = (),
            int monthRange = 1, string? businessUnit = ())
        returns LeadFrequencyItemResponse[]|http:BadRequest|HttpInternalServerError {

        authorization:UserInfo|http:BadRequest authResult = extractUserInfo(ctx);
        if authResult is http:BadRequest {
            return authResult;
        }

        [int, int]|HttpInternalServerError dateResult = resolveEffectiveDate(year, month);
        if dateResult is HttpInternalServerError {
            return dateResult;
        }
        int effectiveYear = dateResult[0];
        int effectiveMonth = dateResult[1];

        string? effectiveBusinessUnit = normalizeBusinessUnit(businessUnit);

        database:LeadFrequencyRow[]|error rows = database:queryLeadFrequencyList(
                effectiveYear, effectiveMonth, monthRange, effectiveBusinessUnit
        );
        if rows is error {
            string customError = "Failed to fetch lead approval frequency list.";
            log:printError(customError, rows);
            return <HttpInternalServerError>{body: {message: customError}};
        }

        string[] leadEmails = from database:LeadFrequencyRow row in rows select row.leadEmail;
        map<string> nameMap = fetchNameMap(leadEmails);

        LeadFrequencyItemResponse[] result = [];
        foreach database:LeadFrequencyRow row in rows {
            string lowerEmail = row.leadEmail.toLowerAscii();
            string leadName = nameMap[lowerEmail] ?: deriveDisplayName(row.leadEmail);
            decimal avgFreq = row.daySpan > 0 ? <decimal>row.totalApproved / <decimal>row.daySpan : 0.0d;
            result.push({
                name: leadName,
                email: row.leadEmail,
                bu: "",
                totalApproved: row.totalApproved,
                avgFrequencyPerDay: avgFreq,
                avgResponseDays: row.avgResponseDays,
                firstApprovedDate: row.firstApprovedDate,
                lastApprovedDate: row.lastApprovedDate
            });
        }
        return result;
    }

    # Get the approval detail for a specific lead.
    #
    # + ctx - Request context containing authenticated user information
    # + email - Lead email address
    # + year - Optional reporting year (defaults to current year)
    # + month - Optional reporting month (defaults to current month)
    # + monthRange - Number of months included in the reporting window
    # + return - Lead approval detail if successful, otherwise an HTTP error response
    resource function get lead\-approval\-detail(http:RequestContext ctx, string email,
            int? year = (), int? month = (), int monthRange = 1)
        returns LeadApprovalDetailResponse|http:BadRequest|HttpInternalServerError {

        authorization:UserInfo|http:BadRequest authResult = extractUserInfo(ctx);
        if authResult is http:BadRequest {
            return authResult;
        }

        if email.trim().length() == 0 {
            return <http:BadRequest>{body: {message: "Lead email is required."}};
        }

        [int, int]|HttpInternalServerError dateResult = resolveEffectiveDate(year, month);
        if dateResult is HttpInternalServerError {
            return dateResult;
        }
        int effectiveYear = dateResult[0];
        int effectiveMonth = dateResult[1];

        database:LeadApprovalDetailRow[]|error rows = database:queryLeadApprovalDetail(
                email, effectiveYear, effectiveMonth, monthRange
        );
        if rows is error {
            string customError = "Failed to fetch lead approval detail.";
            log:printError(customError, rows);
            return <HttpInternalServerError>{body: {message: customError}};
        }

        string[] allEmails = splitEmails(email);
        foreach database:LeadApprovalDetailRow detailRow in rows {
            foreach string e in splitEmails(detailRow.employeeEmail) {
                allEmails.push(e);
            }
        }
        map<string> nameMap = fetchNameMap(allEmails);

        string lowerLeadEmail = email.toLowerAscii();
        string leadName = nameMap[lowerLeadEmail] ?: deriveDisplayName(email);

        map<LeadClaimTypeBreakdownItem> breakdownMap = {};
        string firstDate = "";
        string lastDate = "";

        foreach database:LeadApprovalDetailRow row in rows {
            string mainCat = getMainCategory(row.expenseType);
            LeadClaimTypeBreakdownItem? existing = breakdownMap[mainCat];
            if existing is LeadClaimTypeBreakdownItem {
                breakdownMap[mainCat] = {
                    'type: existing.'type,
                    count: existing.count + 1,
                    totalAmount: existing.totalAmount + row.amount
                };
            } else {
                breakdownMap[mainCat] = {'type: mainCat, count: 1, totalAmount: row.amount};
            }

            string rowApprovedDate = row.approvedDate ?: "";
            if rowApprovedDate != "" {
                if firstDate == "" || rowApprovedDate < firstDate {
                    firstDate = rowApprovedDate;
                }
                if lastDate == "" || rowApprovedDate > lastDate {
                    lastDate = rowApprovedDate;
                }
            }
        }

        LeadClaimTypeBreakdownItem[] claimTypeBreakdown = breakdownMap.toArray();

        LeadApprovedClaimItem[] claims = [];
        foreach database:LeadApprovalDetailRow row in rows {
            string mainCat = getMainCategory(row.expenseType);
            string lowerEmpEmail = row.employeeEmail.toLowerAscii();
            claims.push({
                claimId: row.claimId,
                employeeName: nameMap[lowerEmpEmail] ?: deriveDisplayName(row.employeeEmail),
                claimType: mainCat,
                subCategory: row.expenseType,
                amount: row.amount,
                category: mainCat,
                submittedDate: row.submittedDate,
                approvedDate: row.approvedDate,
                status: row.status
            });
        }

        return {
            name: leadName,
            email: email,
            totalApproved: rows.length(),
            avgFrequencyPerDay: 0.0d,
            firstApprovedDate: firstDate == "" ? () : firstDate,
            lastApprovedDate: lastDate == "" ? () : lastDate,
            claimTypeBreakdown: claimTypeBreakdown,
            claims: claims
        };
    }

    # Get the credit card summary metrics including spend totals and trends.
    #
    # + ctx - Request context containing authenticated user information
    # + return - Credit card summary if successful, otherwise an HTTP error response
    resource function get cc\-summary(http:RequestContext ctx)
        returns CCSummaryResponse|http:BadRequest|HttpInternalServerError {

        authorization:UserInfo|http:BadRequest authResult = extractUserInfo(ctx);
        if authResult is http:BadRequest {
            return authResult;
        }

        database:CCSpendStatsRow|error statsRow = database:queryCCSpendStats();
        if statsRow is error {
            log:printError("Failed to fetch CC spend stats.", statsRow);
            return <HttpInternalServerError>{body: {message: "Failed to fetch credit card summary."}};
        }

        database:CCActiveCountRow|error activeRow = database:queryCCActiveCount();
        if activeRow is error {
            log:printError("Failed to fetch CC active card count.", activeRow);
            return <HttpInternalServerError>{body: {message: "Failed to fetch credit card summary."}};
        }

        database:CCHighestSpendRow|error highestRow = database:queryCCHighestSpend();
        if highestRow is error {
            log:printError("Failed to fetch CC highest spend.", highestRow);
            return <HttpInternalServerError>{body: {message: "Failed to fetch credit card summary."}};
        }

        map<string> nameMap = fetchNameMap([highestRow.holderName]);
        string highestSpendCardName = nameMap[highestRow.holderName.toLowerAscii()] ?: deriveDisplayName(highestRow.holderName);

        decimal trendTotalSpend = statsRow.prevYearSpend > 0.0d
            ? ((statsRow.currentYearSpend - statsRow.prevYearSpend) / statsRow.prevYearSpend) * 100.0d
            : 0.0d;
        decimal trendAvgTransaction = statsRow.prevMonthAvg > 0.0d
            ? ((statsRow.currentMonthAvg - statsRow.prevMonthAvg) / statsRow.prevMonthAvg) * 100.0d
            : 0.0d;

        return {
            totalSpend: statsRow.currentYearSpend,
            activeCardCount: activeRow.activeCount,
            avgTransaction: statsRow.currentMonthAvg,
            highestSpendCardName: highestSpendCardName,
            highestSpendCardAmount: highestRow.usedAmount,
            trendTotalSpend: trendTotalSpend,
            trendActiveCards: 0.0d,
            trendAvgTransaction: trendAvgTransaction
        };
    }

    # Get spend and transaction count grouped by engagement category.
    #
    # + ctx - Request context containing authenticated user information
    # + return - Card type analysis items if successful, otherwise an HTTP error response
    resource function get cc\-card\-type\-analysis(http:RequestContext ctx)
        returns CCCardTypeItem[]|http:BadRequest|HttpInternalServerError {

        authorization:UserInfo|http:BadRequest authResult = extractUserInfo(ctx);
        if authResult is http:BadRequest {
            return authResult;
        }

        database:CCCardTypeRow[]|error rows = database:queryCCCardTypeAnalysis();
        if rows is error {
            log:printError("Failed to fetch CC card type analysis.", rows);
            return <HttpInternalServerError>{body: {message: "Failed to fetch card type analysis."}};
        }

        decimal grandTotal = 0.0d;
        foreach database:CCCardTypeRow row in rows {
            grandTotal = grandTotal + row.totalSpend;
        }

        return from database:CCCardTypeRow row in rows
            select {
                cardType: row.cardType,
                totalSpend: row.totalSpend,
                txnCount: row.txnCount,
                percentage: grandTotal > 0.0d ? (row.totalSpend / grandTotal) * 100.0d : 0.0d
            };
    }

    # Get the top-spending corporate cards.
    #
    # + ctx - Request context containing authenticated user information
    # + return - Top card items if successful, otherwise an HTTP error response
    resource function get cc\-top\-cards(http:RequestContext ctx)
        returns CCTopCardItem[]|http:BadRequest|HttpInternalServerError {

        authorization:UserInfo|http:BadRequest authResult = extractUserInfo(ctx);
        if authResult is http:BadRequest {
            return authResult;
        }

        database:CCTopCardRow[]|error rows = database:queryCCTopCards();
        if rows is error {
            log:printError("Failed to fetch CC top cards.", rows);
            return <HttpInternalServerError>{body: {message: "Failed to fetch top cards."}};
        }

        string[] emails = from database:CCTopCardRow row in rows select row.holderName;
        map<string> nameMap = fetchNameMap(emails);

        return from database:CCTopCardRow row in rows
            select {
                cardNumber: maskCardNumber(row.cardNumber),
                holderName: nameMap[row.holderName.toLowerAscii()] ?: deriveDisplayName(row.holderName),
                usedAmount: row.usedAmount,
                txnCount: row.txnCount
            };
    }

    # Get the full corporate card list ordered by spend within the given date range.
    #
    # + ctx - Request context containing authenticated user information
    # + year - Optional ending year (defaults to current year)
    # + month - Optional ending month (defaults to current month)
    # + monthRange - Number of months in the reporting window (0 = all time)
    # + return - Card list if successful, otherwise an HTTP error response
    resource function get cc\-cards(http:RequestContext ctx,
            int? year = (), int? month = (), int monthRange = 0)
        returns CCCardListItem[]|http:BadRequest|HttpInternalServerError {

        authorization:UserInfo|http:BadRequest authResult = extractUserInfo(ctx);
        if authResult is http:BadRequest {
            return authResult;
        }

        http:BadRequest? paramValidation = validateCCDateParams(year, month, monthRange);
        if paramValidation is http:BadRequest {
            return paramValidation;
        }

        [int, int]|HttpInternalServerError dateResult = resolveEffectiveDate(year, month);
        if dateResult is HttpInternalServerError {
            return dateResult;
        }
        int effectiveYear = dateResult[0];
        int effectiveMonth = dateResult[1];

        database:CCCardRow[]|error rows = database:queryCCCardList(effectiveYear, effectiveMonth, monthRange);
        if rows is error {
            log:printError("Failed to fetch CC card list.", rows);
            return <HttpInternalServerError>{body: {message: "Failed to fetch card list."}};
        }

        string[] emails = from database:CCCardRow row in rows select row.holderName;
        map<string> nameMap = fetchNameMap(emails);

        return from database:CCCardRow row in rows
            select {
                cardId: row.cardId,
                cardNumber: maskCardNumber(row.cardNumber),
                holderName: nameMap[row.holderName.toLowerAscii()] ?: deriveDisplayName(row.holderName),
                holderEmail: row.holderName,
                usedAmount: row.usedAmount,
                cardType: row.cardType,
                status: row.status
            };
    }

    # Get employees and their total CC spend for a given engagement category and date range.
    #
    # + ctx - Request context containing authenticated user information
    # + category - Engagement category name to filter on
    # + year - Optional ending year (defaults to current year)
    # + month - Optional ending month (defaults to current month)
    # + monthRange - Number of months in the reporting window (0 = all time)
    # + return - Employee spending items if successful, otherwise an HTTP error response
    resource function get cc\-category\-employees(http:RequestContext ctx, string category,
            int? year = (), int? month = (), int monthRange = 0)
        returns CCEmployeeSpendingItem[]|http:BadRequest|HttpInternalServerError {

        authorization:UserInfo|http:BadRequest authResult = extractUserInfo(ctx);
        if authResult is http:BadRequest {
            return authResult;
        }

        if category.trim().length() == 0 {
            return <http:BadRequest>{body: {message: "Category is required."}};
        }

        http:BadRequest? paramValidation = validateCCDateParams(year, month, monthRange);
        if paramValidation is http:BadRequest {
            return paramValidation;
        }

        [int, int]|HttpInternalServerError dateResult = resolveEffectiveDate(year, month);
        if dateResult is HttpInternalServerError {
            return dateResult;
        }
        int effectiveYear = dateResult[0];
        int effectiveMonth = dateResult[1];

        database:CCEmployeeSpendingRow[]|error rows = database:queryCCCategoryEmployees(
                category, effectiveYear, effectiveMonth, monthRange
        );
        if rows is error {
            log:printError("Failed to fetch CC category employees.", rows);
            return <HttpInternalServerError>{body: {message: "Failed to fetch category employees."}};
        }

        string[] emails = from database:CCEmployeeSpendingRow row in rows select row.employeeEmail;
        map<string> nameMap = fetchNameMap(emails);

        return from database:CCEmployeeSpendingRow row in rows
            select {
                name: nameMap[row.employeeEmail.toLowerAscii()] ?: deriveDisplayName(row.employeeEmail),
                email: row.employeeEmail,
                totalAmount: row.totalAmount,
                txnCount: row.txnCount
            };
    }

    # Get all employees and their total CC spend for a given date range.
    #
    # + ctx - Request context containing authenticated user information
    # + year - Optional ending year (defaults to current year)
    # + month - Optional ending month (defaults to current month)
    # + monthRange - Number of months in the reporting window (0 = all time)
    # + return - Employee spending items if successful, otherwise an HTTP error response
    resource function get cc\-employee\-spending(http:RequestContext ctx,
            int? year = (), int? month = (), int monthRange = 1)
        returns CCEmployeeSpendingItem[]|http:BadRequest|HttpInternalServerError {

        authorization:UserInfo|http:BadRequest authResult = extractUserInfo(ctx);
        if authResult is http:BadRequest {
            return authResult;
        }

        http:BadRequest? paramValidation = validateCCDateParams(year, month, monthRange);
        if paramValidation is http:BadRequest {
            return paramValidation;
        }

        [int, int]|HttpInternalServerError dateResult = resolveEffectiveDate(year, month);
        if dateResult is HttpInternalServerError {
            return dateResult;
        }
        int effectiveYear = dateResult[0];
        int effectiveMonth = dateResult[1];

        database:CCEmployeeSpendingRow[]|error rows = database:queryCCEmployeeSpending(
                effectiveYear, effectiveMonth, monthRange
        );
        if rows is error {
            log:printError("Failed to fetch CC employee spending.", rows);
            return <HttpInternalServerError>{body: {message: "Failed to fetch CC employee spending."}};
        }

        string[] emails = from database:CCEmployeeSpendingRow row in rows select row.employeeEmail;
        map<string> nameMap = fetchNameMap(emails);

        return from database:CCEmployeeSpendingRow row in rows
            select {
                name: nameMap[row.employeeEmail.toLowerAscii()] ?: deriveDisplayName(row.employeeEmail),
                email: row.employeeEmail,
                totalAmount: row.totalAmount,
                txnCount: row.txnCount
            };
    }

    # Get the CC spending breakdown by engagement category for a specific employee.
    #
    # + ctx - Request context containing authenticated user information
    # + email - Employee email address
    # + year - Optional ending year (defaults to current year)
    # + month - Optional ending month (defaults to current month)
    # + monthRange - Number of months in the reporting window (0 = all time)
    # + return - Employee CC breakdown if successful, otherwise an HTTP error response
    resource function get cc\-employee\-breakdown(http:RequestContext ctx, string email,
            int? year = (), int? month = (), int monthRange = 1)
        returns CCEmployeeBreakdownResponse|http:BadRequest|HttpInternalServerError {

        authorization:UserInfo|http:BadRequest authResult = extractUserInfo(ctx);
        if authResult is http:BadRequest {
            return authResult;
        }

        if email.trim().length() == 0 {
            return <http:BadRequest>{body: {message: "Employee email is required."}};
        }

        http:BadRequest? paramValidation = validateCCDateParams(year, month, monthRange);
        if paramValidation is http:BadRequest {
            return paramValidation;
        }

        [int, int]|HttpInternalServerError dateResult = resolveEffectiveDate(year, month);
        if dateResult is HttpInternalServerError {
            return dateResult;
        }
        int effectiveYear = dateResult[0];
        int effectiveMonth = dateResult[1];

        database:CCEmployeeCategoryRow[]|error catRows = database:queryCCEmployeeCategoryBreakdown(
                email, effectiveYear, effectiveMonth, monthRange
        );
        if catRows is error {
            log:printError("Failed to fetch CC employee category breakdown.", catRows);
            return <HttpInternalServerError>{body: {message: "Failed to fetch CC employee breakdown."}};
        }

        decimal grandTotal = 0.0d;
        int totalTxns = 0;
        foreach database:CCEmployeeCategoryRow r in catRows {
            grandTotal = grandTotal + r.total;
            totalTxns = totalTxns + r.txnCount;
        }

        CCEmployeeCategoryItem[] categories = from database:CCEmployeeCategoryRow row in catRows
            select {
                category: row.category,
                total: row.total,
                txnCount: row.txnCount,
                percentage: grandTotal > 0.0d ? (row.total / grandTotal) * 100.0d : 0.0d
            };

        string empName = deriveDisplayName(email);
        entity:Employee|error empRecord = entity:fetchEmployeesBasicInfo(email);
        if empRecord is entity:Employee {
            empName = empRecord.firstName + " " + empRecord.lastName;
        }

        return {
            name: empName,
            email: email,
            totalAmount: grandTotal,
            txnCount: totalTxns,
            categories: categories
        };
    }

    # Get individual CC transactions for a specific employee within an engagement category.
    #
    # + ctx - Request context containing authenticated user information
    # + email - Employee email address
    # + category - Derived engagement category name
    # + year - Optional ending year (defaults to current year)
    # + month - Optional ending month (defaults to current month)
    # + monthRange - Number of months in the reporting window (0 = all time)
    # + return - Transaction items if successful, otherwise an HTTP error response
    resource function get cc\-employee\-category\-transactions(http:RequestContext ctx,
            string email, string category, int? year = (), int? month = (), int monthRange = 1)
        returns CCEmployeeCategoryTransactionItem[]|http:BadRequest|HttpInternalServerError {

        authorization:UserInfo|http:BadRequest authResult = extractUserInfo(ctx);
        if authResult is http:BadRequest {
            return authResult;
        }

        if email.trim().length() == 0 || category.trim().length() == 0 {
            return <http:BadRequest>{body: {message: "Employee email and category are required."}};
        }

        http:BadRequest? paramValidation = validateCCDateParams(year, month, monthRange);
        if paramValidation is http:BadRequest {
            return paramValidation;
        }

        [int, int]|HttpInternalServerError dateResult = resolveEffectiveDate(year, month);
        if dateResult is HttpInternalServerError {
            return dateResult;
        }
        int effectiveYear = dateResult[0];
        int effectiveMonth = dateResult[1];

        database:CCEmployeeCategoryTransactionRow[]|error txnRows = database:queryCCEmployeeCategoryTransactions(
                email, category, effectiveYear, effectiveMonth, monthRange
        );
        if txnRows is error {
            log:printError("Failed to fetch CC employee category transactions.", txnRows);
            return <HttpInternalServerError>{body: {message: "Failed to fetch CC transactions."}};
        }

        return from database:CCEmployeeCategoryTransactionRow row in txnRows
            select {
                description: row.description,
                txnDate: row.txnDate,
                amount: row.amount,
                status: row.status
            };
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
