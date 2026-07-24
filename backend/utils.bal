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

import ballerina/http;
import ballerina/log;
import ballerina/time;

# Extract the authenticated user's info from the request context.
#
# + ctx - Request context populated by the JWT interceptor
# + return - User info if present, otherwise a bad request response
isolated function extractUserInfo(http:RequestContext ctx) returns authorization:UserInfo|http:BadRequest {
    authorization:UserInfo|error userInfo = ctx.getWithType(authorization:HEADER_USER_INFO);
    if userInfo is error {
        return <http:BadRequest>{body: {message: "User information header not found!"}};
    }
    return userInfo;
}

# Resolve the effective reporting year and month, defaulting unset values to the current date.
#
# + year - Optional reporting year
# + month - Optional reporting month
# + return - Effective [year, month] pair, or an error response if the current date cannot be resolved
isolated function resolveEffectiveDate(int? year, int? month) returns [int, int]|HttpInternalServerError {
    time:Civil|error civilTime = time:utcToCivil(time:utcNow());
    if civilTime is error {
        log:printError("Failed to resolve current date.", civilTime);
        return <HttpInternalServerError>{body: {message: "Failed to resolve the current date."}};
    }
    return [year ?: civilTime.year, month ?: civilTime.month];
}

# Normalize a business unit filter, treating blank or "All Business Units" as unset.
#
# + businessUnit - Raw business unit filter value
# + return - Normalized business unit, or () if the filter should be treated as unset
isolated function normalizeBusinessUnit(string? businessUnit) returns string? {
    if businessUnit is string &&
            (businessUnit.trim().length() == 0 || businessUnit == "All Business Units") {
        return ();
    }
    return businessUnit;
}

# Look up display names for a set of employee emails, falling back to an empty map on failure.
#
# + emails - Employee email addresses to resolve
# + return - Map of lower-cased email to display name
isolated function fetchNameMap(string[] emails) returns map<string> {
    map<string>|error hrNames = entity:fetchEmployeeNameMap(emails);
    return hrNames is map<string> ? hrNames : {};
}

# Validate common year/month/monthRange query parameters shared across reporting endpoints.
#
# + year - Optional reporting year
# + month - Optional reporting month
# + monthRange - Number of months included in the reporting window
# + return - Bad request response if any parameter is invalid, otherwise ()
isolated function validateDateParams(int? year, int? month, int monthRange) returns http:BadRequest? {
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

# Mask a credit card number, keeping only the last 4 digits visible.
#
# + cardNumber - Raw card number, possibly containing separators
# + return - Masked card number in "**** **** **** 1234" form
isolated function maskCardNumber(string cardNumber) returns string {
    string digits = re `\D`.replaceAll(cardNumber, "");
    if digits.length() < 4 {
        return "**** **** **** ****";
    }
    string last4 = digits.substring(digits.length() - 4);
    return string `**** **** **** ${last4}`;
}

# Build the effective application configuration, applying any admin overrides stored in the database
# on top of the Config.toml defaults.
#
# + return - Effective application configuration
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

# Derive a human-readable display name from an email address.
#
# + email - Email address to derive a name from
# + return - Capitalized name derived from the email prefix
isolated function deriveDisplayName(string email) returns string {
    string prefix = email;
    int? atIndex = email.indexOf("@");
    if atIndex is int {
        prefix = email.substring(0, atIndex);
    }

    string[] parts = [];
    string current = "";
    foreach string:Char ch in prefix {
        if ch == "." || ch == "_" || ch == "-" {
            if current.length() > 0 {
                parts.push(current);
            }
            current = "";
        } else {
            current = current + ch;
        }
    }
    if current.length() > 0 {
        parts.push(current);
    }

    string result = "";
    foreach int i in 0 ..< parts.length() {
        if i > 0 {
            result = result + " ";
        }
        result = result + capitalizeWord(parts[i]);
    }
    return result;
}

# Capitalize the first letter of a word.
#
# + word - Word to capitalize
# + return - Capitalized word
isolated function capitalizeWord(string word) returns string {
    if word.length() == 0 {
        return word;
    }
    string first = word.substring(0, 1).toUpperAscii();
    if word.length() == 1 {
        return first;
    }
    return first + word.substring(1);
}

# Extract the main expense category from a composite expense type label.
#
# + expenseType - Full expense type label (e.g. "Foreign Travel - Accommodation")
# + return - Part before the first separator, or the full string if no separator is found
isolated function getMainCategory(string expenseType) returns string {
    foreach string sep in [" - ", " \u{2013} ", " \u{2014} "] {
        int? idx = expenseType.indexOf(sep);
        if idx is int {
            return expenseType.substring(0, idx);
        }
    }
    return expenseType;
}

# Split a comma-separated email field into individual trimmed email addresses.
# Handles the case where lead_email stores multiple approvers as "a@x.com,b@x.com".
#
# + emailField - Raw email field value, possibly comma-separated
# + return - Array of individual trimmed email addresses, excluding empty strings
isolated function splitEmails(string emailField) returns string[] {
    string[] emails = [];
    foreach string part in re `,`.split(emailField) {
        string trimmed = part.trim();
        if trimmed.length() > 0 {
            emails.push(trimmed);
        }
    }
    return emails;
}
