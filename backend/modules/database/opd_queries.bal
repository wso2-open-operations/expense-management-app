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

# Build the query for aggregated claim amount filtered by year and optional month.
#
# + year - Year used to filter claims, if provided
# + month - Month used to filter claims, if provided
# + return - Parameterized SQL query for aggregated claim amount
isolated function getClaimAmountQuery(int? year = (), int? month = ()) returns sql:ParameterizedQuery => `
    SELECT COALESCE(SUM(CAST(t.txn_amount AS DECIMAL(10,2))), 0) AS total
    FROM opd_claim_transaction t
    INNER JOIN opd_claim c
        ON c.id = t.claim_id
    WHERE (YEAR(c.added_date) = ${year} OR ${year} IS NULL)
      AND (MONTH(c.added_date) = ${month} OR ${month} IS NULL)
      AND c.status IN (
            ${OPD_CLAIM_STATUS_PENDING_APPROVAL},
            ${OPD_CLAIM_STATUS_APPROVED}
          )
`;

# Build the query for the total number of claims submitted during a given year.
#
# + year - Year used to filter claims
# + return - Parameterized SQL query for annual claim count
isolated function getClaimCountQuery(int year) returns sql:ParameterizedQuery => `
    SELECT COUNT(DISTINCT c.id) AS count
    FROM opd_claim c
    WHERE YEAR(c.added_date) = ${year}
      AND c.status IN (
            ${OPD_CLAIM_STATUS_PENDING_APPROVAL},
            ${OPD_CLAIM_STATUS_APPROVED}
          )
`;

# Build the query for the number of claims submitted during the January grace period.
#
# + year - Year used to evaluate the grace-period submission window
# + gracePeriodDays - Number of days included in the grace period
# + return - Parameterized SQL query for grace-period claim count
isolated function getGracePeriodClaimCountQuery(int year, int gracePeriodDays) returns sql:ParameterizedQuery => `
    SELECT COUNT(DISTINCT c.id) AS count
    FROM opd_claim c
    WHERE c.added_date >= STR_TO_DATE(CONCAT(${year}, '-01-01'), '%Y-%m-%d')
      AND c.added_date < DATE_ADD(
            STR_TO_DATE(CONCAT(${year}, '-01-01'), '%Y-%m-%d'),
            INTERVAL ${gracePeriodDays} DAY
          )
      AND c.status IN (
            ${OPD_CLAIM_STATUS_PENDING_APPROVAL},
            ${OPD_CLAIM_STATUS_APPROVED}
          )
`;

# Build the query for all employee emails that have accepted OPD claims.
#
# + return - Parameterized SQL query for distinct employee emails in OPD claims
isolated function getAllClaimEmployeeEmailsQuery() returns sql:ParameterizedQuery => `
    SELECT DISTINCT employee_email AS employeeEmail
    FROM opd_claim
    WHERE status IN (
            ${OPD_CLAIM_STATUS_PENDING_APPROVAL},
            ${OPD_CLAIM_STATUS_APPROVED}
          )
      AND employee_email IS NOT NULL
      AND employee_email <> ''
`;

# Build the query for per-employee claim totals across the selected reporting range.
#
# + year - Ending year of the reporting range
# + monthRange - Ending month of the reporting range
# + months - Number of months included in the reporting range
# + return - Parameterized SQL query for per-employee claim totals
isolated function getEmployeeTotalsForRangeQuery(int year, int monthRange, int months) returns sql:ParameterizedQuery => `
    SELECT c.employee_email AS employeeEmail,
           COALESCE(SUM(CAST(t.txn_amount AS DECIMAL(10,2))), 0) AS totalAmount
    FROM opd_claim_transaction t
    INNER JOIN opd_claim c
        ON c.id = t.claim_id
    WHERE c.added_date >= DATE_SUB(
            STR_TO_DATE(CONCAT(${year}, '-', LPAD(${monthRange}, 2, '0'), '-01'), '%Y-%m-%d'),
            INTERVAL ${months - 1} MONTH
          )
      AND c.added_date < DATE_ADD(
            STR_TO_DATE(CONCAT(${year}, '-', LPAD(${monthRange}, 2, '0'), '-01'), '%Y-%m-%d'),
            INTERVAL 1 MONTH
          )
      AND c.status IN (
            ${OPD_CLAIM_STATUS_PENDING_APPROVAL},
            ${OPD_CLAIM_STATUS_APPROVED}
          )
      AND c.employee_email IS NOT NULL
      AND c.employee_email <> ''
    GROUP BY c.employee_email
`;

# Build the query for claim transaction amounts across the selected reporting range.
#
# + year - Ending year of the reporting range
# + monthRange - Ending month of the reporting range
# + months - Number of months included in the reporting range
# + return - Parameterized SQL query for claim transaction amounts
isolated function getMonthlyClaimTransactionsQuery(int year, int monthRange, int months) returns sql:ParameterizedQuery => `
    SELECT c.employee_email AS employeeEmail,
           CAST(t.txn_amount AS DECIMAL(10,2)) AS amount
    FROM opd_claim_transaction t
    INNER JOIN opd_claim c
        ON c.id = t.claim_id
    WHERE c.added_date >= DATE_SUB(
            STR_TO_DATE(CONCAT(${year}, '-', LPAD(${monthRange}, 2, '0'), '-01'), '%Y-%m-%d'),
            INTERVAL ${months - 1} MONTH
          )
      AND c.added_date < DATE_ADD(
            STR_TO_DATE(CONCAT(${year}, '-', LPAD(${monthRange}, 2, '0'), '-01'), '%Y-%m-%d'),
            INTERVAL 1 MONTH
          )
      AND c.status IN (
            ${OPD_CLAIM_STATUS_PENDING_APPROVAL},
            ${OPD_CLAIM_STATUS_APPROVED}
          )
      AND c.employee_email IS NOT NULL
      AND c.employee_email <> ''
`;
