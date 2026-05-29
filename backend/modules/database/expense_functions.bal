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

isolated function validateDateRangeInputs(int month, int monthRange, int? 'limit = ()) returns error? {
    if month < 1 || month > 12 {
        return error(string `Invalid month: ${month}. Must be between 1 and 12.`);
    }
    if monthRange < 0 {
        return error(string `Invalid monthRange: ${monthRange}. Must be 0 (all time) or greater.`);
    }
    if 'limit is int && 'limit <= 0 {
        return error(string `Invalid limit: ${'limit}. Must be greater than 0.`);
    }
}

# Query all aggregate statistics for the given date range in one database round-trip.
#
# + year - Ending year of the reporting range  
# + month - Ending month of the reporting range  
# + monthRange - Number of months included in the reporting range  
# + businessUnit - Optional business unit filter  
# + email - Optional employee email to scope results to a specific employee
# + return - Expense summary stats if the query succeeds, otherwise an error
public function queryExpenseSummaryStats(int year, int month, int monthRange,
        string? businessUnit = (), string? email = ()) returns ExpenseSummaryStatsRow|error {
    check validateDateRangeInputs(month, monthRange);
    return expenseDbClient->queryRow(
        getExpenseSummaryStatsQuery(year, month, monthRange, businessUnit, email)
    );
}

# Query expense amounts grouped by business unit for the given date range.
#
# + year - Ending year of the reporting range
# + month - Ending month of the reporting range
# + monthRange - Number of months included in the reporting range
# + return - Business unit expense rows if the query succeeds, otherwise an error
public function queryExpenseByBu(int year, int month, int monthRange) returns BuExpenseRow[]|error {
    check validateDateRangeInputs(month, monthRange);
    stream<BuExpenseRow, sql:Error?> resultStream =
        expenseDbClient->query(getExpenseByBuQuery(year, month, monthRange), BuExpenseRow);
    return check from BuExpenseRow row in resultStream
        select row;
}

# Query claim counts grouped by status for the given date range.
#
# + year - Ending year of the reporting range
# + month - Ending month of the reporting range
# + monthRange - Number of months included in the reporting range
# + businessUnit - Optional business unit filter
# + return - Claim status rows if the query succeeds, otherwise an error
public function queryExpenseClaimsByStatus(int year, int month, int monthRange,
        string? businessUnit = ()) returns ClaimStatusRow[]|error {
    check validateDateRangeInputs(month, monthRange);
    stream<ClaimStatusRow, sql:Error?> resultStream =
        expenseDbClient->query(
            getExpenseClaimsByStatusQuery(year, month, monthRange, businessUnit), ClaimStatusRow
        );
    return check from ClaimStatusRow row in resultStream
        select row;
}

# Query lead-approved claim frequency grouped by month for the given date range.
#
# + year - Ending year of the reporting range
# + month - Ending month of the reporting range
# + monthRange - Number of months included in the reporting range
# + businessUnit - Optional business unit filter
# + return - Lead approval frequency rows if the query succeeds, otherwise an error
public function queryLeadApprovalFrequency(int year, int month, int monthRange,
        string? businessUnit = ()) returns LeadApprovalFrequencyRow[]|error {
    check validateDateRangeInputs(month, monthRange);
    stream<LeadApprovalFrequencyRow, sql:Error?> resultStream =
        expenseDbClient->query(
            getLeadApprovalFrequencyQuery(year, month, monthRange, businessUnit),
            LeadApprovalFrequencyRow
        );
    return check from LeadApprovalFrequencyRow row in resultStream
        select row;
}

# Query spending employees ordered by reimbursement amount.
# Pass a limit to get the top-N employees, or omit it to fetch all employees.
#
# + year - Ending year of the reporting range
# + month - Ending month of the reporting range
# + monthRange - Number of months included in the reporting range
# + businessUnit - Optional business unit filter
# + 'limit - Optional maximum number of results to return
# + return - Spending employee rows if the query succeeds, otherwise an error
public function querySpendingEmployees(int year, int month, int monthRange,
        string? businessUnit = (), int? 'limit = ()) returns AllSpendingEmployeeRow[]|error {
    check validateDateRangeInputs(month, monthRange, 'limit);
    stream<AllSpendingEmployeeRow, sql:Error?> resultStream =
        expenseDbClient->query(
            getSpendingEmployeesQuery(year, month, monthRange, businessUnit, 'limit),
            AllSpendingEmployeeRow
        );
    return check from AllSpendingEmployeeRow row in resultStream
        select row;
}

# Query the top approving leads for the given date range.
#
# + year - Ending year of the reporting range
# + month - Ending month of the reporting range
# + monthRange - Number of months included in the reporting range
# + 'limit - Maximum number of results to return
# + businessUnit - Optional business unit filter
# + return - Top approving lead rows if the query succeeds, otherwise an error
public function queryTopApprovingLeads(int year, int month, int monthRange,
        int 'limit = 7, string? businessUnit = ()) returns TopApprovingLeadRow[]|error {
    check validateDateRangeInputs(month, monthRange, 'limit);
    stream<TopApprovingLeadRow, sql:Error?> resultStream =
        expenseDbClient->query(
            getTopApprovingLeadsQuery(year, month, monthRange, 'limit, businessUnit),
            TopApprovingLeadRow
        );
    return check from TopApprovingLeadRow row in resultStream
        select row;
}

# Query the top recurring expense types for the given date range.
#
# + year - Ending year of the reporting range
# + month - Ending month of the reporting range
# + monthRange - Number of months included in the reporting range
# + 'limit - Maximum number of results to return
# + businessUnit - Optional business unit filter
# + return - Recurring expense type rows if the query succeeds, otherwise an error
public function queryRecurringExpenseTypes(int year, int month, int monthRange,
        int 'limit = 25, string? businessUnit = ()) returns RecurringExpenseTypeRow[]|error {
    check validateDateRangeInputs(month, monthRange, 'limit);
    stream<RecurringExpenseTypeRow, sql:Error?> resultStream =
        expenseDbClient->query(
            getRecurringExpenseTypesQuery(year, month, monthRange, 'limit, businessUnit),
            RecurringExpenseTypeRow
        );
    return check from RecurringExpenseTypeRow row in resultStream
        select row;
}

# Query an employee's expense breakdown grouped by category.
#
# + email - Employee email to filter on
# + year - Ending year of the reporting range
# + month - Ending month of the reporting range
# + monthRange - Number of months included in the reporting range
# + statusFilter - Optional status group filter: "Approved" or "Pending"
# + return - Employee category rows if the query succeeds, otherwise an error
public function queryEmployeeCategoryBreakdown(string email, int year, int month, int monthRange,
        string? statusFilter = ()) returns EmployeeCategoryRow[]|error {
    check validateDateRangeInputs(month, monthRange);
    stream<EmployeeCategoryRow, sql:Error?> resultStream =
        expenseDbClient->query(
            getEmployeeCategoryBreakdownQuery(email, year, month, monthRange, statusFilter),
            EmployeeCategoryRow
        );
    return check from EmployeeCategoryRow row in resultStream
        select row;
}

# Query the list of leads with their approval counts and date span.
#
# + year - Ending year of the reporting range
# + month - Ending month of the reporting range
# + monthRange - Number of months included in the reporting range
# + businessUnit - Optional business unit filter
# + return - Lead frequency rows if the query succeeds, otherwise an error
public function queryLeadFrequencyList(int year, int month, int monthRange,
        string? businessUnit = ()) returns LeadFrequencyRow[]|error {
    check validateDateRangeInputs(month, monthRange);
    stream<LeadFrequencyRow, sql:Error?> resultStream =
        expenseDbClient->query(
            getLeadFrequencyListQuery(year, month, monthRange, businessUnit),
            LeadFrequencyRow
        );
    return check from LeadFrequencyRow row in resultStream
        select row;
}

# Query individual approved claims for a specific lead.
#
# + leadEmail - Lead email to filter on
# + year - Ending year of the reporting range
# + month - Ending month of the reporting range
# + monthRange - Number of months included in the reporting range
# + return - Lead approval detail rows if the query succeeds, otherwise an error
public function queryLeadApprovalDetail(string leadEmail, int year, int month, int monthRange) returns LeadApprovalDetailRow[]|error {
    check validateDateRangeInputs(month, monthRange);
    stream<LeadApprovalDetailRow, sql:Error?> resultStream =
        expenseDbClient->query(
            getLeadApprovalDetailQuery(leadEmail, year, month, monthRange),
            LeadApprovalDetailRow
        );
    return check from LeadApprovalDetailRow row in resultStream
        select row;
}

# Query individual transactions for an employee within a specific expense category.
#
# + email - Employee email to filter on
# + category - Expense category label to filter on
# + year - Ending year of the reporting range
# + month - Ending month of the reporting range
# + monthRange - Number of months included in the reporting range
# + statusFilter - Optional status group filter: "Approved" or "Pending"
# + return - Employee category transaction rows if the query succeeds, otherwise an error
public function queryEmployeeCategoryTransactions(string email, string category,
        int year, int month, int monthRange, string? statusFilter = ()) returns EmployeeCategoryTransactionRow[]|error {
    check validateDateRangeInputs(month, monthRange);
    stream<EmployeeCategoryTransactionRow, sql:Error?> resultStream =
        expenseDbClient->query(
            getEmployeeCategoryTransactionsQuery(email, category, year, month, monthRange, statusFilter),
            EmployeeCategoryTransactionRow
        );
    return check from EmployeeCategoryTransactionRow row in resultStream
        select row;
}
