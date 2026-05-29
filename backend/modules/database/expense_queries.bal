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

# Append an optional status group filter clause to an existing query.
#
# + query - Base parameterized query to extend
# + statusFilter - "Approved", "Pending", or null to skip filtering
# + return - Query extended with the status filter, or the original query unchanged
isolated function appendStatusFilterClause(sql:ParameterizedQuery query, string? statusFilter)
        returns sql:ParameterizedQuery {
    if statusFilter == "Approved" {
        return sql:queryConcat(query, ` AND ec.status IN ('2', '3')`);
    } else if statusFilter == "Pending" {
        return sql:queryConcat(query, ` AND ec.status IN ('0', '1')`);
    }
    return query;
}

# Build the date-range WHERE clause fragment used by all expense claim queries.
#
# + year - Ending year of the reporting range
# + month - Ending month of the reporting range
# + monthRange - Number of months included in the reporting range
# + return - Parameterized SQL fragment for the date range filter
isolated function getExpenseDateRangeClause(int year, int month, int monthRange)
    returns sql:ParameterizedQuery {
    // monthRange=0 means "All Time" — skip date filtering
    if monthRange <= 0 {
        return `1=1`;
    }
    return `ec.txn_date >= DATE_SUB(
            STR_TO_DATE(CONCAT(${year}, '-', LPAD(${month}, 2, '0'), '-01'), '%Y-%m-%d'),
            INTERVAL ${monthRange - 1} MONTH
        )
        AND ec.txn_date < DATE_ADD(
            STR_TO_DATE(CONCAT(${year}, '-', LPAD(${month}, 2, '0'), '-01'), '%Y-%m-%d'),
            INTERVAL 1 MONTH
        )`;
}

# Build the consolidated query for all aggregate statistics in one database round-trip.
#
# + year - Ending year of the reporting range  
# + month - Ending month of the reporting range  
# + monthRange - Number of months included in the reporting range  
# + businessUnit - Optional business unit filter  
# + email - Optional employee email to scope results to a specific employee
# + return - Parameterized SQL query
isolated function getExpenseSummaryStatsQuery(int year, int month, int monthRange,
        string? businessUnit = (), string? email = ()) returns sql:ParameterizedQuery {

    sql:ParameterizedQuery baseQuery = `
        SELECT COALESCE(SUM(CAST(ec.reimbursement_amount AS DECIMAL(10,2))), 0) AS totalAmount,
               COUNT(*) AS totalCount,
               COALESCE(AVG(CAST(ec.reimbursement_amount AS DECIMAL(10,2))), 0) AS avgAmount,
               CAST(COALESCE(SUM(CASE WHEN ec.status = '-1'        THEN 1 ELSE 0 END), 0) AS SIGNED) AS rejectedCount,
               CAST(COALESCE(SUM(CASE WHEN ec.status IN ('0', '1') THEN 1 ELSE 0 END), 0) AS SIGNED) AS pendingCount,
               CAST(COALESCE(SUM(CASE WHEN ec.status IN ('2', '3') THEN 1 ELSE 0 END), 0) AS SIGNED) AS approvedCount
        FROM expense_claims ec
        WHERE `;

    sql:ParameterizedQuery dateClause = getExpenseDateRangeClause(year, month, monthRange);
    sql:ParameterizedQuery query = sql:queryConcat(baseQuery, dateClause);

    if businessUnit is string {
        query = sql:queryConcat(query, ` AND ec.business_unit = ${businessUnit}`);
    }
    if email is string {
        query = sql:queryConcat(query, ` AND ec.employee_email = ${email}`);
    }

    return query;
}

# Build the query for expense amounts grouped by business unit.
#
# + year - Ending year of the reporting range
# + month - Ending month of the reporting range
# + monthRange - Number of months included in the reporting range
# + return - Parameterized SQL query
isolated function getExpenseByBuQuery(int year, int month, int monthRange)
    returns sql:ParameterizedQuery {

    sql:ParameterizedQuery baseQuery = `
        SELECT COALESCE(ec.business_unit, 'Unknown') AS businessUnit,
               COALESCE(SUM(CAST(ec.reimbursement_amount AS DECIMAL(10,2))), 0) AS total
        FROM expense_claims ec
        WHERE `;

    sql:ParameterizedQuery dateClause = getExpenseDateRangeClause(year, month, monthRange);

    return sql:queryConcat(
            sql:queryConcat(baseQuery, dateClause),
            ` AND ec.business_unit IS NOT NULL
          AND ec.business_unit <> ''
          GROUP BY ec.business_unit
          ORDER BY total DESC`
    );
}

# Build the query for claim counts grouped by status with readable labels.
#
# + year - Ending year of the reporting range
# + month - Ending month of the reporting range
# + monthRange - Number of months included in the reporting range
# + businessUnit - Optional business unit filter
# + return - Parameterized SQL query
isolated function getExpenseClaimsByStatusQuery(int year, int month, int monthRange,
        string? businessUnit = ()) returns sql:ParameterizedQuery {

    sql:ParameterizedQuery baseQuery = `
        SELECT CASE ec.status
                 WHEN '-1' THEN 'Rejected'
                 WHEN '0' THEN 'Draft'
                 WHEN '1' THEN 'Submitted'
                 WHEN '2' THEN 'Lead Approved'
                 WHEN '3' THEN 'Finance Approved'
                 ELSE CONCAT('Status ', ec.status)
               END AS status,
               COUNT(*) AS count
        FROM expense_claims ec
        WHERE `;

    sql:ParameterizedQuery dateClause = getExpenseDateRangeClause(year, month, monthRange);
    sql:ParameterizedQuery query = sql:queryConcat(baseQuery, dateClause);

    if businessUnit is string {
        query = sql:queryConcat(query, ` AND ec.business_unit = ${businessUnit}`);
    }

    return sql:queryConcat(query,
            ` AND ec.status IS NOT NULL
          AND ec.status <> ''
          GROUP BY ec.status
          ORDER BY count DESC`
    );
}

# Build the query for lead-approved claim frequency grouped by month.
#
# + year - Ending year of the reporting range
# + month - Ending month of the reporting range
# + monthRange - Number of months included in the reporting range
# + businessUnit - Optional business unit filter
# + return - Parameterized SQL query
isolated function getLeadApprovalFrequencyQuery(int year, int month, int monthRange,
        string? businessUnit = ()) returns sql:ParameterizedQuery {

    sql:ParameterizedQuery baseQuery = `
        SELECT DATE_FORMAT(ec.txn_date, '%b %Y') AS label,
               YEAR(ec.txn_date) AS year,
               MONTH(ec.txn_date) AS month,
               COUNT(*) AS count
        FROM expense_claims ec
        WHERE `;

    sql:ParameterizedQuery dateClause = getExpenseDateRangeClause(year, month, monthRange);
    sql:ParameterizedQuery query = sql:queryConcat(baseQuery, dateClause);
    query = sql:queryConcat(query, ` AND ec.status IN ('2', '3') AND ec.txn_date IS NOT NULL`);

    if businessUnit is string {
        query = sql:queryConcat(query, ` AND ec.business_unit = ${businessUnit}`);
    }

    return sql:queryConcat(query,
            ` GROUP BY DATE_FORMAT(ec.txn_date, '%b %Y'), YEAR(ec.txn_date), MONTH(ec.txn_date)
          ORDER BY YEAR(ec.txn_date), MONTH(ec.txn_date)`
    );
}

# Build the query for spending employees ordered by reimbursement amount.
# Omit 'limit to fetch all employees, or pass a value to cap at top-N.
#
# + year - Ending year of the reporting range
# + month - Ending month of the reporting range
# + monthRange - Number of months included in the reporting range
# + businessUnit - Optional business unit filter
# + 'limit - Optional maximum number of results to return
# + return - Parameterized SQL query
isolated function getSpendingEmployeesQuery(int year, int month, int monthRange,
        string? businessUnit = (), int? 'limit = ()) returns sql:ParameterizedQuery {

    sql:ParameterizedQuery baseQuery = `
        SELECT ec.employee_email AS employeeEmail,
               COALESCE(SUM(CAST(ec.reimbursement_amount AS DECIMAL(10,2))), 0) AS total,
               COUNT(*) AS claimCount
        FROM expense_claims ec
        WHERE `;

    sql:ParameterizedQuery dateClause = getExpenseDateRangeClause(year, month, monthRange);
    sql:ParameterizedQuery query = sql:queryConcat(baseQuery, dateClause);

    if businessUnit is string {
        query = sql:queryConcat(query, ` AND ec.business_unit = ${businessUnit}`);
    }

    query = sql:queryConcat(query,
            ` AND ec.employee_email IS NOT NULL
          AND ec.employee_email <> ''
          GROUP BY ec.employee_email
          ORDER BY total DESC`
    );

    if 'limit is int {
        query = sql:queryConcat(query, ` LIMIT ${'limit}`);
    }

    return query;
}

# Build the query for top approving leads by number of approved claims.
#
# + year - Ending year of the reporting range
# + month - Ending month of the reporting range
# + monthRange - Number of months included in the reporting range
# + 'limit - Maximum number of results to return
# + businessUnit - Optional business unit filter
# + return - Parameterized SQL query
isolated function getTopApprovingLeadsQuery(int year, int month, int monthRange,
        int 'limit = 7, string? businessUnit = ()) returns sql:ParameterizedQuery {

    sql:ParameterizedQuery baseQuery = `
        SELECT TRIM(SUBSTRING_INDEX(ec.lead_email, ',', 1)) AS leadEmail,
               COALESCE(ec.business_unit, '') AS businessUnit,
               COUNT(*) AS count
        FROM expense_claims ec
        WHERE `;

    sql:ParameterizedQuery dateClause = getExpenseDateRangeClause(year, month, monthRange);
    sql:ParameterizedQuery query = sql:queryConcat(baseQuery, dateClause);
    query = sql:queryConcat(query, ` AND ec.lead_approved_date IS NOT NULL AND ec.status IN ('2', '3')`);

    if businessUnit is string {
        query = sql:queryConcat(query, ` AND ec.business_unit = ${businessUnit}`);
    }

    return sql:queryConcat(query,
            ` AND ec.lead_email IS NOT NULL
          AND ec.lead_email <> ''
          GROUP BY TRIM(SUBSTRING_INDEX(ec.lead_email, ',', 1)), ec.business_unit
          ORDER BY count DESC
          LIMIT ${'limit}`
    );
}

# Build the query for top recurring expense types by total amount.
#
# + year - Ending year of the reporting range
# + month - Ending month of the reporting range
# + monthRange - Number of months included in the reporting range
# + 'limit - Maximum number of results to return
# + businessUnit - Optional business unit filter
# + return - Parameterized SQL query
isolated function getRecurringExpenseTypesQuery(int year, int month, int monthRange,
        int 'limit = 25, string? businessUnit = ()) returns sql:ParameterizedQuery {

    sql:ParameterizedQuery baseQuery = `
        SELECT et.expense_type AS expenseType,
               COALESCE(SUM(CAST(ec.reimbursement_amount AS DECIMAL(10,2))), 0) AS total
        FROM expense_claims ec
        INNER JOIN expense_type et
            ON et.id = ec.expense_type_id
        WHERE `;

    sql:ParameterizedQuery dateClause = getExpenseDateRangeClause(year, month, monthRange);
    sql:ParameterizedQuery query = sql:queryConcat(baseQuery, dateClause);

    if businessUnit is string {
        query = sql:queryConcat(query, ` AND ec.business_unit = ${businessUnit}`);
    }

    return sql:queryConcat(query,
            ` AND ec.expense_type_id IS NOT NULL
          GROUP BY et.expense_type
          ORDER BY total DESC
          LIMIT ${'limit}`
    );
}

# Build the query for an employee's expense breakdown grouped by category.
#
# + email - Employee email to filter on
# + year - Ending year of the reporting range
# + month - Ending month of the reporting range
# + monthRange - Number of months included in the reporting range
# + statusFilter - Optional status group filter: "Approved" or "Pending"
# + return - Parameterized SQL query
isolated function getEmployeeCategoryBreakdownQuery(string email, int year, int month, int monthRange,
        string? statusFilter = ()) returns sql:ParameterizedQuery {

    sql:ParameterizedQuery baseQuery = `
        SELECT SUBSTRING_INDEX(et.expense_type, ' - ', 1) AS category,
               COALESCE(SUM(CAST(ec.reimbursement_amount AS DECIMAL(10,2))), 0) AS total,
               COUNT(*) AS claimCount
        FROM expense_claims ec
        INNER JOIN expense_type et ON et.id = ec.expense_type_id
        WHERE `;

    sql:ParameterizedQuery dateClause = getExpenseDateRangeClause(year, month, monthRange);
    sql:ParameterizedQuery query = sql:queryConcat(baseQuery, dateClause);
    query = sql:queryConcat(query, ` AND ec.employee_email = ${email}`);
    query = appendStatusFilterClause(query, statusFilter);

    return sql:queryConcat(query,
            ` AND ec.expense_type_id IS NOT NULL
          GROUP BY category
          ORDER BY total DESC`
    );
}

# Build the query to list all leads with their approval counts and date range.
#
# + year - Ending year of the reporting range
# + month - Ending month of the reporting range
# + monthRange - Number of months included in the reporting range
# + businessUnit - Optional business unit filter
# + return - Parameterized SQL query
isolated function getLeadFrequencyListQuery(int year, int month, int monthRange,
        string? businessUnit = ()) returns sql:ParameterizedQuery {

    sql:ParameterizedQuery baseQuery = `
        SELECT TRIM(SUBSTRING_INDEX(ec.lead_email, ',', 1)) AS leadEmail,
               COUNT(*) AS totalApproved,
               DATE_FORMAT(MIN(ec.lead_approved_date), '%Y-%m-%d') AS firstApprovedDate,
               DATE_FORMAT(MAX(ec.lead_approved_date), '%Y-%m-%d') AS lastApprovedDate,
               GREATEST(1, DATEDIFF(MAX(ec.lead_approved_date), MIN(ec.lead_approved_date))) AS daySpan,
               COALESCE(AVG(DATEDIFF(ec.lead_approved_date, ec.txn_date)), 0) AS avgResponseDays
        FROM expense_claims ec
        WHERE `;

    sql:ParameterizedQuery dateClause = getExpenseDateRangeClause(year, month, monthRange);
    sql:ParameterizedQuery query = sql:queryConcat(baseQuery, dateClause);

    if businessUnit is string {
        query = sql:queryConcat(query, ` AND ec.business_unit = ${businessUnit}`);
    }

    return sql:queryConcat(query,
            ` AND ec.lead_email IS NOT NULL
          AND ec.lead_email <> ''
          AND ec.lead_approved_date IS NOT NULL
          AND ec.status IN ('2', '3')
          GROUP BY TRIM(SUBSTRING_INDEX(ec.lead_email, ',', 1))
          ORDER BY totalApproved DESC`
    );
}

# Build the query for individual approved claims under a specific lead.
#
# + leadEmail - Lead email to filter on
# + year - Ending year of the reporting range
# + month - Ending month of the reporting range
# + monthRange - Number of months included in the reporting range
# + return - Parameterized SQL query
isolated function getLeadApprovalDetailQuery(string leadEmail, int year, int month, int monthRange)
        returns sql:ParameterizedQuery {

    sql:ParameterizedQuery baseQuery = `
        SELECT COALESCE(ec.report_seq_number, '') AS claimId,
               COALESCE(ec.employee_email, '') AS employeeEmail,
               COALESCE(et.expense_type, 'Unknown') AS expenseType,
               COALESCE(CAST(ec.reimbursement_amount AS DECIMAL(10,2)), 0) AS amount,
               DATE_FORMAT(ec.txn_date, '%Y-%m-%d') AS submittedDate,
               DATE_FORMAT(ec.lead_approved_date, '%Y-%m-%d') AS approvedDate,
               'Lead Approved' AS status
        FROM expense_claims ec
        LEFT JOIN expense_type et ON et.id = ec.expense_type_id
        WHERE `;

    sql:ParameterizedQuery dateClause = getExpenseDateRangeClause(year, month, monthRange);
    sql:ParameterizedQuery query = sql:queryConcat(baseQuery, dateClause);
    query = sql:queryConcat(query, ` AND FIND_IN_SET(${leadEmail}, ec.lead_email) > 0`);

    return sql:queryConcat(query,
            ` AND ec.status IN ('2', '3')
          AND ec.lead_approved_date IS NOT NULL
          ORDER BY ec.lead_approved_date DESC`
    );
}

# Build the query for individual transactions for an employee within a specific category.
#
# + email - Employee email to filter on
# + category - Expense category label to filter on
# + year - Ending year of the reporting range
# + month - Ending month of the reporting range
# + monthRange - Number of months included in the reporting range
# + statusFilter - Optional status group filter: "Approved" or "Pending"
# + return - Parameterized SQL query
isolated function getEmployeeCategoryTransactionsQuery(string email, string category,
        int year, int month, int monthRange, string? statusFilter = ()) returns sql:ParameterizedQuery {

    sql:ParameterizedQuery baseQuery = `
        SELECT et.expense_type AS description,
               DATE_FORMAT(ec.txn_date, '%b %e, %Y') AS txnDate,
               CAST(ec.reimbursement_amount AS DECIMAL(10,2)) AS amount,
               CASE ec.status
                 WHEN '-1' THEN 'Rejected'
                 WHEN '0'  THEN 'Pending'
                 WHEN '1'  THEN 'Pending'
                 WHEN '2'  THEN 'Approved'
                 WHEN '3'  THEN 'Approved'
                 ELSE 'Unknown'
               END AS status
        FROM expense_claims ec
        INNER JOIN expense_type et ON et.id = ec.expense_type_id
        WHERE `;

    sql:ParameterizedQuery dateClause = getExpenseDateRangeClause(year, month, monthRange);
    sql:ParameterizedQuery query = sql:queryConcat(baseQuery, dateClause);
    query = sql:queryConcat(query, ` AND ec.employee_email = ${email}`);
    query = sql:queryConcat(query,
            ` AND SUBSTRING_INDEX(et.expense_type, ' - ', 1) = ${category}`
    );
    query = appendStatusFilterClause(query, statusFilter);

    return sql:queryConcat(query,
            ` AND ec.expense_type_id IS NOT NULL
          ORDER BY ec.txn_date DESC`
    );
}
