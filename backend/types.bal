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

# Represents the response structure for retrieving user information.
public type UserInfoResponse record {|
    # Email of the employee
    string workEmail;
    # First name of the employee
    string firstName;
    # Last name of the employee
    string lastName;
    # Thumbnail of the employee
    string? employeeThumbnail;
    # User privileges
    int[] privileges;
|};

# Application configuration returned to the frontend
public type AppConfig record {|
    # Annual OPD claim limit per employee
    decimal claimLimit;
    # Allowed employee locations for claim submissions
    string[] submissionsAllowedLocations;
    # Step size used for OPD claim distribution chart buckets
    decimal claimRangeStep;
    # Number of days after year-end that prior-year claims are still accepted
    int lastYearClaimGracePeriodInDays;
|};

# Claim distribution bucket used by OPD summary responses.
public type OpdClaimBucket record {|
    # Amount range label represented by the bucket.
    string range;
    # Number of employees falling within the range.
    int count;
|};

# HTTP response returned by the OPD claim summary endpoint.
public type OpdClaimSummaryResponse record {|
    # Total claim amount submitted during the selected year.
    decimal lastYearClaimAmount;
    # Total claim amount submitted during the selected month.
    decimal currentMonthClaimAmount;
    # Number of claims submitted during the previous year.
    int previousYearClaimCount;
    # Number of claims submitted within the configured grace period.
    int gracePeriodClaims;
    # Number of employees without claims in the selected period.
    int unclaimedEmployees;
    # Number of employees who reached the annual claim limit.
    int fullyClaimedEmployees;
    # Claim distribution data for the active claims chart.
    OpdClaimBucket[] activeClaimsChart;
|};

# Business unit expense item in the summary response.
public type BuExpenseItem record {|
    # Business unit label.
    string label;
    # Total reimbursement amount.
    decimal value;
|};

# Active claim stats item in the summary response.
public type ActiveClaimStatItem record {|
    # Claim status label.
    string label;
    # Number of claims with this status.
    int value;
|};

# Top spending employee item in the summary response.
public type TopEmployeeItem record {|
    # Display name derived from employee email.
    string name;
    # Employee email.
    string email;
    # Business unit.
    string bu;
    # Total reimbursement amount.
    decimal amount;
|};

# Top approving lead item in the summary response.
public type TopLeadItem record {|
    # Display name derived from lead email.
    string name;
    # Lead email.
    string email;
    # Business unit.
    string bu;
    # Number of approved claims.
    int count;
|};

# Lead approval frequency item in the summary response.
public type LeadApprovalFrequencyItem record {|
    # Time-window label.
    string label;
    # Number of lead-approved claims in the window.
    int value;
|};

# Recurring expense type item in the summary response.
public type ExpenseTypeItem record {|
    # Expense type name.
    string name;
    # High-level category this expense type belongs to.
    string category;
    # Total reimbursement amount.
    decimal amount;
|};

# HTTP response returned by the expense claims summary endpoint.
public type ExpenseClaimSummaryResponse record {|
    # Total reimbursement amount for the selected period.
    decimal totalClaimAmount;
    # Total number of claims in the selected period.
    int totalClaimCount;
    # Number of pending claims.
    int pendingClaims;
    # Number of approved claims.
    int approvedClaims;
    # Number of rejected claims.
    int rejectedClaims;
    # Average reimbursement amount per claim.
    decimal avgClaimAmount;
    # Expense amounts grouped by business unit.
    BuExpenseItem[] buExpenses;
    # Claim counts grouped by status.
    ActiveClaimStatItem[] activeClaimStats;
    # Top spending employees.
    TopEmployeeItem[] topSpendingEmployees;
    # Lead approval frequency across date windows.
    LeadApprovalFrequencyItem[] leadApprovalFrequency;
    # Top approving leads.
    TopLeadItem[] topApprovingLeads;
    # Top recurring expense types by total amount.
    ExpenseTypeItem[] recurringExpenseTypes;
    # Trend percentage for total claim amount vs previous period.
    decimal trendTotalAmount;
    # Trend percentage for total claim count vs previous period.
    decimal trendTotalCount;
    # Trend percentage for approved claims vs previous period.
    decimal trendApproved;
    # Trend percentage for average claim amount vs previous period.
    decimal trendAvgAmount;
|};

# Employee spending item returned in the all-employees list.
public type EmployeeSpendingItem record {|
    # Display name derived from employee email.
    string name;
    # Employee email.
    string email;
    # Total reimbursement amount.
    decimal totalAmount;
    # Number of claims submitted.
    int claimCount;
|};

# Single category entry in an employee's spending breakdown.
public type EmployeeCategoryItem record {|
    # Expense category label.
    string category;
    # Total reimbursement amount for the category.
    decimal total;
    # Number of claims in this category.
    int claimCount;
    # Percentage of the employee's total spend.
    decimal percentage;
|};

# Full spending breakdown response for a single employee.
public type EmployeeSpendingBreakdownResponse record {|
    # Display name derived from employee email.
    string name;
    # Employee email.
    string email;
    # Total reimbursement amount across all categories.
    decimal totalAmount;
    # Total number of claims.
    int claimCount;
    # Per-category breakdown.
    EmployeeCategoryItem[] categories;
|};

# Individual transaction within an employee's expense category.
public type EmployeeCategoryTransactionItem record {|
    # Description of the expense (sub-type name).
    string description;
    # Formatted transaction date string.
    string txnDate;
    # Reimbursement amount for this transaction.
    decimal amount;
    # Human-readable status label.
    string status;
|};

# Response item for a single lead in the approval frequency list.
public type LeadFrequencyItemResponse record {|
    # Display name of the lead.
    string name;
    # Lead email.
    string email;
    # Business unit (empty string when not applicable).
    string bu;
    # Total number of claims approved.
    int totalApproved;
    # Average approval frequency in claims per day.
    decimal avgFrequencyPerDay;
    # Average number of days between claim submission and lead approval.
    decimal avgResponseDays;
    # Date of the first approval in the range (YYYY-MM-DD), or null.
    string? firstApprovedDate;
    # Date of the most recent approval in the range (YYYY-MM-DD), or null.
    string? lastApprovedDate;
|};

# Claim type breakdown entry in a lead's approval detail.
public type LeadClaimTypeBreakdownItem record {|
    # Expense type label.
    string 'type;
    # Number of claims of this type approved by the lead.
    int count;
    # Total reimbursement amount for this type.
    decimal totalAmount;
|};

# Individual approved claim in a lead's approval detail.
public type LeadApprovedClaimItem record {|
    # Expense claim sequence number or ID.
    string claimId;
    # Display name of the employee who submitted the claim.
    string employeeName;
    # Main expense category label.
    string claimType;
    # Full expense type name (sub-category).
    string subCategory;
    # Reimbursement amount.
    decimal amount;
    # Main expense category, or null.
    string? category;
    # Formatted submission date (YYYY-MM-DD), or null.
    string? submittedDate;
    # Formatted lead approval date (YYYY-MM-DD), or null.
    string? approvedDate;
    # Human-readable approval status.
    string status;
|};

# Full approval detail response for a single lead.
public type LeadApprovalDetailResponse record {|
    # Display name of the lead.
    string name;
    # Lead email.
    string email;
    # Total number of claims approved in the range.
    int totalApproved;
    # Average approval frequency in claims per day (0 means caller should compute from dates).
    decimal avgFrequencyPerDay;
    # Date of the first approval (YYYY-MM-DD), or null.
    string? firstApprovedDate;
    # Date of the most recent approval (YYYY-MM-DD), or null.
    string? lastApprovedDate;
    # Breakdown of approved claims by expense category.
    LeadClaimTypeBreakdownItem[] claimTypeBreakdown;
    # Individual approved claims.
    LeadApprovedClaimItem[] claims;
|};

# ─── Credit Card types ──────────────────────────────────────────────────────

# Summary metrics returned by the credit card dashboard summary endpoint.
public type CCSummaryResponse record {|
    # Total CC spend in the current calendar year
    decimal totalSpend;
    # Number of active corporate cards
    int activeCardCount;
    # Average transaction amount this month
    decimal avgTransaction;
    # Display name of the highest-spending card holder
    string highestSpendCardName;
    # Total spend of the highest-spending card holder
    decimal highestSpendCardAmount;
    # Year-over-year trend for total spend (percentage)
    decimal trendTotalSpend;
    # Year-over-year trend for active card count (percentage, currently 0)
    decimal trendActiveCards;
    # Month-over-month trend for average transaction (percentage)
    decimal trendAvgTransaction;
|};

# Single category entry in the Card Type Analysis chart.
public type CCCardTypeItem record {|
    # Derived engagement category label (e.g. "Sales", "R&D")
    string cardType;
    # Total spend in the category
    decimal totalSpend;
    # Number of transactions in the category
    int txnCount;
    # Percentage of total CC spend
    decimal percentage;
|};

# Top-spending corporate card item.
public type CCTopCardItem record {|
    # Corporate card number
    string cardNumber;
    # Display name of the card holder
    string holderName;
    # Total spend on the card
    decimal usedAmount;
    # Number of transactions on the card
    int txnCount;
|};

# Full corporate card record for the cards list table.
public type CCCardListItem record {|
    # Database row ID of the card
    string cardId;
    # Corporate card number
    string cardNumber;
    # Display name of the card holder
    string holderName;
    # Email / login of the card holder
    string holderEmail;
    # Total spend on the card
    decimal usedAmount;
    # Card provider code (AMEX, SVB, etc.)
    string cardType;
    # Card status (Active / Inactive)
    string status;
|};

# Employee CC spending summary item (used in list and category drill-down).
public type CCEmployeeSpendingItem record {|
    # Display name of the employee
    string name;
    # Employee email
    string email;
    # Total CC spend amount
    decimal totalAmount;
    # Number of CC transactions
    int txnCount;
|};

# Single category entry in an employee's CC spending breakdown.
public type CCEmployeeCategoryItem record {|
    # Derived engagement category label
    string category;
    # Total spend in the category
    decimal total;
    # Number of transactions in the category
    int txnCount;
    # Percentage of the employee's total CC spend
    decimal percentage;
|};

# Full CC spending breakdown for a single employee.
public type CCEmployeeBreakdownResponse record {|
    # Display name of the employee
    string name;
    # Employee email
    string email;
    # Total CC spend across all categories
    decimal totalAmount;
    # Total number of CC transactions
    int txnCount;
    # Per-category breakdown sorted by total spend
    CCEmployeeCategoryItem[] categories;
|};

# Individual CC transaction within an employee's category drill-down.
public type CCEmployeeCategoryTransactionItem record {|
    # Transaction description or reference
    string description;
    # Transaction date formatted as YYYY-MM-DD
    string txnDate;
    # Transaction amount
    decimal amount;
    # Transaction status
    string status;
|};

# ─── Application Configuration update ────────────────────────────────────────

# Request body for updating application configuration via the admin PUT endpoint.
public type AppConfigUpdateRequest record {|
    # Updated annual OPD claim limit, or null to leave unchanged
    decimal? claimLimit = ();
    # Updated chart bucket step size, or null to leave unchanged
    decimal? claimRangeStep = ();
    # Updated grace period in days, or null to leave unchanged
    int? lastYearClaimGracePeriodInDays = ();
    # Updated list of allowed submission locations, or null to leave unchanged
    string[]? submissionsAllowedLocations = ();
|};

# Standard error payload returned to API clients.
# Consolidated expense summary statistics for the authenticated employee's own claims.
public type ExpenseSummaryStatsResponse record {|
    # Total reimbursement amount.
    decimal totalAmount;
    # Total number of claims.
    int totalCount;
    # Average reimbursement amount.
    decimal avgAmount;
    # Number of approved claims.
    int approvedCount;
    # Number of pending claims (submitted or awaiting lead approval).
    int pendingCount;
    # Number of rejected claims.
    int rejectedCount;
|};

# An individual OPD claim belonging to the authenticated employee.
public type MyOpdClaimResponse record {|
    # Claim identifier.
    string id;
    # Formatted claim date (YYYY-MM-DD).
    string date;
    # Total transaction amount for the claim.
    decimal amount;
    # Human-readable status label.
    string status;
    # Description from the first transaction, or null if no transactions.
    string? description;
    # Number of transactions linked to the claim.
    int txnCount;
|};

# OPD claim summary for the authenticated employee for a given year.
public type MyOpdSummaryResponse record {|
    # Total amount claimed in OPD transactions.
    decimal claimedAmount;
    # Total number of distinct OPD claims.
    int claimCount;
|};

public type ErrorResponse record {|
    # Client-safe error message.
    string message;
|};

# Internal server error response shape for API resources.
public type HttpInternalServerError record {|
    *http:InternalServerError;
    # Error payload returned in the response body.
    ErrorResponse body;
|};
