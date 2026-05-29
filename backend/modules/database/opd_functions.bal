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
import ballerina/sql;

# Query an aggregated claim amount for the given year and optional month.
#
# + year - Year used to filter the claim amount query
# + month - Optional month used to narrow the claim amount query
# + return - Aggregated claim amount if the query succeeds, otherwise an error
public function queryClaimAmount(int? year = (), int? month = ()) returns decimal|error {
    AmountRow amountResult = check expenseDbClient->queryRow(getClaimAmountQuery(year, month));

    return amountResult.total;
}

# Query the number of claims submitted during the given year.
#
# + year - Reporting year used to filter claims
# + return - Claim count for the given year if the query succeeds, otherwise an error
public function queryClaimCount(int year) returns int|error {
    CountRow countResult = check expenseDbClient->queryRow(getClaimCountQuery(year));

    return countResult.count;
}

# Query the number of claims submitted during the configured grace period.
#
# + year - Current reporting year used to evaluate the January grace window
# + gracePeriodDays - Number of days included in the grace period
# + return - Grace period claim count if the query succeeds, otherwise an error
public function queryGracePeriodClaimCount(int year, int gracePeriodDays) returns int|error {
    CountRow countResult = check expenseDbClient->queryRow(getGracePeriodClaimCountQuery(year, gracePeriodDays));

    return countResult.count;
}

# Query all employee emails that have ever appeared in OPD claims.
#
# + return - Normalized employee emails from OPD claims if the query succeeds, otherwise an error
public function queryAllClaimEmployeeEmails() returns string[]|error {
    stream<EmployeeEmailRow, sql:Error?> allEmployeesStream =
        expenseDbClient->query(getAllClaimEmployeeEmailsQuery(), EmployeeEmailRow);
    EmployeeEmailRow[] allEmployeeRowsResult = check from EmployeeEmailRow row in allEmployeesStream
        select row;

    return from EmployeeEmailRow row in allEmployeeRowsResult
        select row.employeeEmail.toLowerAscii();
}

# Query an employee's personal OPD summary for a given year.
#
# + email - Employee email to filter on
# + year - Reporting year
# + return - OPD summary row if the query succeeds, otherwise an error
public function queryMyOpdClaims(string email, int year) returns MyOpdClaimRow[]|error {
    stream<MyOpdClaimRow, sql:Error?> claimsStream =
        expenseDbClient->query(getMyOpdClaimsQuery(email, year), MyOpdClaimRow);
    return check from MyOpdClaimRow row in claimsStream
        select row;
}

public function queryMyOpdSummary(string email, int year) returns MyOpdSummaryRow|error {
    return expenseDbClient->queryRow(getMyOpdSummaryQuery(email, year));
}

# Query total claim amounts per employee for the selected reporting range.
#
# + year - Year used for the reporting range
# + monthRange - Ending month of the reporting range
# + months - Number of months included in the reporting range
# + return - Per-employee totals if the query succeeds, otherwise an error
public function queryEmployeeTotals(int year, int monthRange, int months) returns EmployeeTotalRow[]|error {
    stream<EmployeeTotalRow, sql:Error?> employeeTotalsStream =
        expenseDbClient->query(getEmployeeTotalsForRangeQuery(year, monthRange, months), EmployeeTotalRow);
    return check from EmployeeTotalRow row in employeeTotalsStream
        select row;
}
