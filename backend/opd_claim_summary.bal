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
import expense_management.database;

# Convert a decimal value into a whole-number string.
#
# + amount - Decimal value to format
# + return - String representation of the value without decimals
isolated function formatWholeNumber(decimal amount) returns string {
    return (<int>amount).toString();
}

# Build claim range labels for the active claims chart.
#
# + upperLimit - Maximum claim amount represented by the chart
# + rangeStep - Step size used to build each range bucket
# + return - Ordered list of claim range labels
isolated function buildClaimRangeLabels(decimal upperLimit, decimal rangeStep) returns string[] {
    string[] rangeLabels = [];
    decimal currentStart = 0.0d;

    while currentStart < upperLimit {
        decimal currentEnd = currentStart + rangeStep;
        if currentEnd > upperLimit {
            currentEnd = upperLimit;
        }

        rangeLabels.push(
            string `${formatWholeNumber(currentStart)}-${formatWholeNumber(currentEnd)}`
        );
        currentStart = currentEnd;
    }

    return rangeLabels;
}

# Resolve the chart bucket label for a given total claim amount.
#
# + totalAmount - Total claim amount for an employee
# + rangeLabels - Ordered chart range labels
# + rangeStep - Step size used to build the range labels
# + return - Matching range label for the total amount
isolated function resolveClaimRangeLabel(decimal totalAmount, string[] rangeLabels, decimal rangeStep) returns string {
    decimal currentStart = 0.0d;

    foreach string rangeLabel in rangeLabels {
        decimal currentEnd = currentStart + rangeStep;
        if totalAmount < currentEnd {
            return rangeLabel;
        }
        currentStart = currentEnd;
    }

    return rangeLabels[rangeLabels.length() - 1];
}

# Convert employee totals into a lookup set of employees with claims.
#
# + employeeTotals - Per-employee totals for the selected reporting range
# + return - Map keyed by normalized employee email
isolated function toEmployeesWithClaimsSet(database:EmployeeTotalRow[] employeeTotals) returns map<boolean> {
    map<boolean> employeesWithClaimsSet = {};
    foreach database:EmployeeTotalRow row in employeeTotals {
        employeesWithClaimsSet[row.employeeEmail.toLowerAscii()] = true;
    }
    return employeesWithClaimsSet;
}

# Count employees whose total claims reached the annual claim limit.
#
# + employeeTotals - Per-employee totals for the selected reporting range
# + annualClaimLimit - Configured annual claim limit
# + return - Number of fully claimed employees
isolated function countFullyClaimedEmployees(database:EmployeeTotalRow[] employeeTotals, decimal annualClaimLimit)
        returns int {
    int fullyClaimedEmployees = 0;
    foreach database:EmployeeTotalRow row in employeeTotals {
        if row.totalAmount >= annualClaimLimit {
            fullyClaimedEmployees += 1;
        }
    }
    return fullyClaimedEmployees;
}

# Build chart buckets representing the active claim distribution.
#
# + employeeTotals - Per-employee totals for the selected reporting range
# + annualClaimLimit - Configured upper limit for the chart
# + claimRangeStep - Configured amount step used for chart buckets
# + return - Ordered claim bucket data for the chart
isolated function buildActiveClaimsChart(database:EmployeeTotalRow[] employeeTotals, decimal annualClaimLimit,
        decimal claimRangeStep) returns OpdClaimBucket[] {
    string[] rangeLabels = buildClaimRangeLabels(annualClaimLimit, claimRangeStep);
    map<int> rangeCounts = {};
    foreach string rangeLabel in rangeLabels {
        rangeCounts[rangeLabel] = 0;
    }

    foreach database:EmployeeTotalRow row in employeeTotals {
        string rangeLabel = resolveClaimRangeLabel(row.totalAmount, rangeLabels, claimRangeStep);
        rangeCounts[rangeLabel] = (rangeCounts[rangeLabel] ?: 0) + 1;
    }

    return from string rangeLabel in rangeLabels
        select {
            range: rangeLabel,
            count: rangeCounts[rangeLabel] ?: 0
        };
}

# Build the OPD claim summary used by the dashboard.
#
# + year - Reporting year for the summary
# + monthRange - Reporting month for the summary
# + months - Number of months included in the reporting window
# + return - OPD claim summary response if all queries succeed, otherwise an error
public function getOpdClaimSummary(int year, int monthRange, int months = 1) returns OpdClaimSummaryResponse|error {
    decimal lastYearClaimAmount = check database:queryClaimAmount(year);
    decimal currentMonthClaimAmount = check database:queryClaimAmount(year, monthRange);
    int previousYearClaimCount = check database:queryClaimCount(year - 1);
    int gracePeriodClaims = check database:queryGracePeriodClaimCount(
        year,
        getLastYearClaimGracePeriodInDays()
    );
    string[] allEmployeeEmails = check database:queryAllClaimEmployeeEmails();
    int totalEmployees = allEmployeeEmails.length();
    database:EmployeeTotalRow[] employeeTotals = check database:queryEmployeeTotals(year, monthRange, months);

    decimal annualClaimLimit = getAnnualClaimLimit();
    map<boolean> employeesWithClaimsSet = toEmployeesWithClaimsSet(employeeTotals);
    int fullyClaimedEmployees = countFullyClaimedEmployees(employeeTotals, annualClaimLimit);
    OpdClaimBucket[] activeClaimsChart = buildActiveClaimsChart(
        employeeTotals,
        annualClaimLimit,
        getClaimRangeStep()
    );

    int unclaimedEmployees = totalEmployees - employeesWithClaimsSet.length();
    if unclaimedEmployees < 0 {
        unclaimedEmployees = 0;
    }

    return {
        lastYearClaimAmount: lastYearClaimAmount,
        currentMonthClaimAmount: currentMonthClaimAmount,
        previousYearClaimCount: previousYearClaimCount,
        gracePeriodClaims: gracePeriodClaims,
        unclaimedEmployees: unclaimedEmployees,
        fullyClaimedEmployees: fullyClaimedEmployees,
        activeClaimsChart: activeClaimsChart
    };
}
