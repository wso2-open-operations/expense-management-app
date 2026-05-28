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

# OPD claim status codes stored in the database.
public enum OpdClaimStatus {
    OPD_CLAIM_STATUS_DELETED = "-1",
    OPD_CLAIM_STATUS_PENDING_APPROVAL = "0",
    OPD_CLAIM_STATUS_REJECTED = "1",
    OPD_CLAIM_STATUS_APPROVED = "3"
}

public type ConnectionPoolConfig record {|
    int maxOpenConnections;
    decimal maxConnectionLifeTime;
    int minIdleConnections;
|};

# Configurable database connection settings.
public type DatabaseConfig record {|
    # Host name or IP address of the database server
    string host;
    # User name used to connect to the database
    string user;
    # Password used to connect to the database
    string password;
    # Name of the target database schema
    string database;
    # Port used by the database server
    int port = 3306;
    # Maximum time in seconds to wait when establishing a connection
    decimal connectTimeout;
    # Connection pool settings for the database client
    ConnectionPoolConfig connectionPool;
|};

# Query result containing a single aggregated decimal total.
public type AmountRow record {|
    # Aggregated total amount returned by the query
    decimal total;
|};

# Query result containing a single aggregated count.
public type CountRow record {|
    # Aggregated count returned by the query
    int count;
|};

# Query result containing an employee email.
public type EmployeeEmailRow record {|
    # Employee work email associated with a claim
    string employeeEmail;
|};

# Query result containing a claim total for an employee.
public type EmployeeTotalRow record {|
    # Employee work email associated with the total
    string employeeEmail;
    # Total claim amount calculated for the employee
    decimal totalAmount;
|};

# Query result for expense amount grouped by business unit.
public type BuExpenseRow record {|
    # Business unit label.
    string businessUnit;
    # Total reimbursement amount for the business unit.
    decimal total;
|};

# Query result for claim count grouped by status.
public type ClaimStatusRow record {|
    # Claim status label.
    string status;
    # Number of claims with this status.
    int count;
|};

# Query result for top approving leads.
public type TopApprovingLeadRow record {|
    # Lead email.
    string leadEmail;
    # Business unit associated with the lead's approved claims.
    string businessUnit;
    # Number of claims approved by the lead.
    int count;
|};

# Query result for lead-approved claim frequency over time.
public type LeadApprovalFrequencyRow record {|
    # Display label for the approval window.
    string label;
    # Calendar year for sorting.
    int year;
    # Calendar month for sorting.
    int month;
    # Number of lead-approved claims in the window.
    int count;
|};

# Query result for recurring expense types.
public type RecurringExpenseTypeRow record {|
    # Expense type name.
    string expenseType;
    # Total reimbursement amount for the expense type.
    decimal total;
|};

# Query result for all spending employees with claim count.
public type AllSpendingEmployeeRow record {|
    # Employee email.
    string employeeEmail;
    # Total reimbursement amount.
    decimal total;
    # Number of claims submitted.
    int claimCount;
|};

# Query result for employee expense breakdown by category.
public type EmployeeCategoryRow record {|
    # Expense category label.
    string category;
    # Total reimbursement amount for the category.
    decimal total;
    # Number of claims in this category.
    int claimCount;
|};

# Query result for lead approval frequency list (per lead aggregation).
public type LeadFrequencyRow record {|
    # Lead email address.
    string leadEmail;
    # Total number of claims approved by this lead.
    int totalApproved;
    # Date of the first approval (YYYY-MM-DD).
    string? firstApprovedDate;
    # Date of the most recent approval (YYYY-MM-DD).
    string? lastApprovedDate;
    # Number of days between first and last approval (minimum 1).
    int daySpan;
    # Average number of days between claim submission and lead approval.
    decimal avgResponseDays;
|};

# Query result for individual approved claims under a specific lead.
public type LeadApprovalDetailRow record {|
    # Expense claim sequence number.
    string claimId;
    # Email of the employee who submitted the claim.
    string employeeEmail;
    # Full expense type label.
    string expenseType;
    # Reimbursement amount.
    decimal amount;
    # Formatted transaction date (YYYY-MM-DD).
    string? submittedDate;
    # Formatted lead approval date (YYYY-MM-DD).
    string? approvedDate;
    # Human-readable approval status.
    string status;
|};

# Consolidated query result for all expense claim aggregate statistics in one pass.
public type ExpenseSummaryStatsRow record {|
    # Total reimbursement amount.
    decimal totalAmount;
    # Total number of claims.
    int totalCount;
    # Average reimbursement amount.
    decimal avgAmount;
    # Number of rejected claims (status = '-1').
    int rejectedCount;
    # Number of pending claims (status in '0', '1').
    int pendingCount;
    # Number of approved claims (status in '2', '3').
    int approvedCount;
|};

# Query result for individual transactions within an employee's expense category.
public type EmployeeCategoryTransactionRow record {|
    # Description of the individual expense.
    string description;
    # Formatted transaction date string.
    string txnDate;
    # Reimbursement amount for the transaction.
    decimal amount;
    # Human-readable status label.
    string status;
|};

# Query result for an employee's personal OPD claim summary.
public type MyOpdSummaryRow record {|
    # Total amount claimed in OPD transactions.
    decimal claimedAmount;
    # Total number of distinct OPD claims.
    int claimCount;
|};

# Query result for a single application setting key-value pair.
public type AppSettingRow record {|
    # Setting identifier
    string settingKey;
    # Setting value stored as a string
    string settingValue;
|};
