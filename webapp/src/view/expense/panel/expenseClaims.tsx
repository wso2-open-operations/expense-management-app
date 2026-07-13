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
import { Alert, Box, Button, Skeleton, Stack, Typography } from "@wso2/oxygen-ui";
import dayjs from "dayjs";

import { useEffect, useState } from "react";

import SummaryCard from "@component/card/SummaryCard";
import BarChart from "@component/chart/BarChart";
import ChartCard from "@component/chart/ChartCard";
import DoughnutChart from "@component/chart/DoughnutChart";
import EmployeeSpendingBreakdownPanel from "@component/chart/EmployeeSpendingBreakdownPanel";
import LeadApprovalFrequencyPanel from "@component/chart/LeadApprovalFrequencyPanel";
import CurrencySelector from "@component/common/CurrencySelector";
import DateRangePickerButton from "@component/common/DateRangePickerButton";
import {
  DEFAULT_CURRENCY,
  EXPENSE_DATE_RANGE_TO_PERIOD,
  OPD_SUMMARY_CARDS_CONFIG,
  PAGE_SIZE_RECURRING,
} from "@config/constant";
import PaginationBar from "@component/common/PaginationBar";
import {
  resetExpenseClaims,
  useExpenseClaims,
  useRecurringExpenseTypes,
} from "@slices/expenseSlice/useExpenseClaims";
import { useAppDispatch } from "@slices/store";
import {
  CURRENCIES,
  type CurrencyCode,
  formatCurrencyValue,
  formatWithSymbol,
} from "@utils/currency";


const prevMonth = new Date(new Date().setMonth(new Date().getMonth() - 1)).toLocaleString(
  "default",
  { month: "long" },
);

// Default window for the panels that got their own independent date-range picker
// (Employee Spending Breakdown, Lead Approval Breakdown, Expense Type Breakdown),
// decoupled from the page-wide chartPeriod filter.
function getDefaultPanelToDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

function getDefaultPanelFromDate(): string {
  return "2022-01-01";
}

export default function ExpenseClaims() {
  const dispatch = useAppDispatch();
  const { data, filters, loading, error } = useExpenseClaims();
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [chartPeriod, setChartPeriod] = useState("annually");
  const [currency, setCurrency] = useState<CurrencyCode>(DEFAULT_CURRENCY as CurrencyCode);
  const [selectedRecurringCategory, setSelectedRecurringCategory] = useState<string | null>(null);
  const [recurringPage, setRecurringPage] = useState(0);
  const [panelFromDate, setPanelFromDate] = useState(getDefaultPanelFromDate);
  const [panelToDate, setPanelToDate] = useState(getDefaultPanelToDate);

  const fmt = (v: number) => formatCurrencyValue(v, currency);
  const fmtSym = (v: number) => formatWithSymbol(v, currency);

  // Employee Spending Breakdown, Lead Approval Breakdown, and Expense Type Breakdown
  // each run off this independent custom range instead of the page-wide chartPeriod filter.
  const safePanelFrom = panelFromDate || getDefaultPanelFromDate();
  const safePanelTo = panelToDate || safePanelFrom;
  const standardPanelFrom = safePanelFrom > safePanelTo ? safePanelTo : safePanelFrom;
  const standardPanelTo = safePanelFrom > safePanelTo ? safePanelFrom : safePanelTo;
  const panelDateRange = `custom:${standardPanelFrom}:${standardPanelTo}`;

  const { recurringExpenseTypes: panelRecurringExpenseTypes } = useRecurringExpenseTypes(
    panelDateRange,
    filters.businessUnit,
  );

  const {
    buExpenses,
    activeClaimStats: claimStats,
    topApprovingLeads: topLeads,
  } = data;
  const recurringExpenses = panelRecurringExpenseTypes;

  const buMaxValue = Math.max(...buExpenses.map((d) => d.value), 1);
  const claimStatsMaxValue = Math.max(...claimStats.map((d) => d.value), 1);

  const recurringExpenseGroups = recurringExpenses.reduce<
    Record<string, { total: number; items: { name: string; amount: number }[] }>
  >((acc, expense) => {
    const category = expense.category || expense.name;
    const existingGroup = acc[category] ?? { total: 0, items: [] };

    existingGroup.total += expense.amount;
    existingGroup.items.push(expense);
    acc[category] = existingGroup;

    return acc;
  }, {});

  const recurringCategorySorted = Object.entries(recurringExpenseGroups)
    .sort(([, a], [, b]) => b.total - a.total);

  const recurringCategoryKeys = recurringCategorySorted.map(([key]) => key);

  const recurringCategoryItems = recurringCategorySorted.map(([label, group]) => ({
    label,
    value: group.total,
    sublabel: `${group.items.length} expense type${group.items.length === 1 ? "" : "s"}`,
  }));

  const recurringDetailItems = selectedRecurringCategory
    ? (recurringExpenseGroups[selectedRecurringCategory]?.items ?? [])
        .map((expense) => ({
          label: expense.name,
          value: expense.amount,
        }))
        .sort((a, b) => b.value - a.value)
    : [];

  const recurringTotalPages = Math.max(1, Math.ceil(recurringCategoryItems.length / PAGE_SIZE_RECURRING));
  const recurringPageItems = recurringCategoryItems.slice(
    recurringPage * PAGE_SIZE_RECURRING,
    (recurringPage + 1) * PAGE_SIZE_RECURRING,
  );
  const recurringPageKeys = recurringCategoryKeys.slice(
    recurringPage * PAGE_SIZE_RECURRING,
    (recurringPage + 1) * PAGE_SIZE_RECURRING,
  );

  useEffect(() => {
    setChartPeriod(EXPENSE_DATE_RANGE_TO_PERIOD[filters.dateRange] ?? "annually");
  }, [filters.dateRange]);

  useEffect(() => {
    return () => {
      dispatch(resetExpenseClaims());
    };
  }, [dispatch]);

  useEffect(() => {
    if (!loading && !error) {
      setHasLoadedOnce(true);
    }
  }, [loading, error]);

  useEffect(() => {
    if (
      selectedRecurringCategory &&
      recurringExpenseGroups[selectedRecurringCategory] === undefined
    ) {
      setSelectedRecurringCategory(null);
    }
  }, [recurringExpenseGroups, selectedRecurringCategory]);

  useEffect(() => {
    setRecurringPage(0);
  }, [chartPeriod, selectedRecurringCategory]);

  if (loading && !hasLoadedOnce) {
    return (
      <Box
        sx={{
          p: 2,
          bgcolor: "background.default",
          height: "100%",
          width: "100%",
          boxSizing: "border-box",
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        <Skeleton variant="rectangular" width={100} height={32} sx={{ borderRadius: 1, mb: 2 }} />
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" },
            gap: 2,
          }}
        >
          {[0, 1, 2].map((i) => (
            <Skeleton
              key={i}
              variant="rectangular"
              height={130}
              sx={{ borderRadius: 1 }}
              animation="wave"
            />
          ))}
        </Box>
        <Box
          sx={{ mt: 2, display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 2 }}
        >
          <Skeleton variant="rectangular" height={340} sx={{ borderRadius: 1 }} animation="wave" />
          <Skeleton variant="rectangular" height={340} sx={{ borderRadius: 1 }} animation="wave" />
        </Box>
        <Box
          sx={{ mt: 2, display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 2 }}
        >
          <Skeleton variant="rectangular" height={340} sx={{ borderRadius: 1 }} animation="wave" />
          <Skeleton variant="rectangular" height={340} sx={{ borderRadius: 1 }} animation="wave" />
        </Box>
        <Box sx={{ mt: 2 }}>
          <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 1 }} animation="wave" />
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          p: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "70vh",
          bgcolor: "background.default",
          overflow: "hidden",
        }}
      >
        <Stack sx={{ width: "fit-content", minWidth: 400, maxWidth: "90%" }} spacing={2}>
          <Alert severity="error" sx={{ width: "100%" }}>
            {error}
          </Alert>
        </Stack>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        p: 2,
        bgcolor: "background.default",
        height: "100%",
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        overflowY: "auto",
        overflowX: "hidden",
      }}
    >
      <Box sx={{ mb: 2, display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 1.5 }}>
        <CurrencySelector value={currency} onChange={setCurrency} />
      </Box>

      <Box
        sx={{
          width: "100%",
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" },
          gap: 2,
        }}
      >
        <SummaryCard
          icon={OPD_SUMMARY_CARDS_CONFIG.lastYearCard.icon}
          iconBg={OPD_SUMMARY_CARDS_CONFIG.lastYearCard.iconBg}
          iconColor={OPD_SUMMARY_CARDS_CONFIG.lastYearCard.iconColor}
          title={OPD_SUMMARY_CARDS_CONFIG.lastYearCard.title}
          chipLabel={OPD_SUMMARY_CARDS_CONFIG.lastYearCard.chipLabel}
          value={fmtSym(data.totalClaimAmount)}
          suffix={CURRENCIES[currency].code}
          trend={`${data.trendTotalAmount > 0 ? "+" : ""}${data.trendTotalAmount}%`}
          trendVariant={data.trendTotalAmount < 0 ? "negative" : "positive"}
        />

        <SummaryCard
          icon={OPD_SUMMARY_CARDS_CONFIG.currentMonthCard.icon}
          iconBg={OPD_SUMMARY_CARDS_CONFIG.currentMonthCard.iconBg}
          iconColor={OPD_SUMMARY_CARDS_CONFIG.currentMonthCard.iconColor}
          title={OPD_SUMMARY_CARDS_CONFIG.currentMonthCard.title}
          chipLabel={OPD_SUMMARY_CARDS_CONFIG.currentMonthCard.chipLabel}
          value={fmtSym(data.avgClaimAmount)}
          suffix={CURRENCIES[currency].code}
          trend={`${data.trendAvgAmount > 0 ? "+" : ""}${data.trendAvgAmount}%`}
          trendVariant={data.trendAvgAmount < 0 ? "negative" : "positive"}
          trendLabel={`VS ${prevMonth}`}
        />

        <SummaryCard
          icon={OPD_SUMMARY_CARDS_CONFIG.previousYearCard.icon}
          iconBg={OPD_SUMMARY_CARDS_CONFIG.previousYearCard.iconBg}
          iconColor={OPD_SUMMARY_CARDS_CONFIG.previousYearCard.iconColor}
          title={OPD_SUMMARY_CARDS_CONFIG.previousYearCard.title}
          chipLabel={OPD_SUMMARY_CARDS_CONFIG.previousYearCard.chipLabel}
          value={data.totalClaimCount.toLocaleString()}
          trend={`${data.trendTotalCount > 0 ? "+" : ""}${data.trendTotalCount}%`}
          trendVariant={data.trendTotalCount < 0 ? "negative" : "positive"}
          footerRight={data.pendingClaims.toString()}
          footerRightLabel="Grace Period Claims"
        />
      </Box>

      <Box
        sx={{
          mt: 2,
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
          gap: 2,
        }}
      >
        <ChartCard
          title="Expense from BU"
          subtitle="Total expense amount by Business Unit"
        >
          <BarChart
            data={buExpenses.map((d) => ({ label: d.label, value: d.value }))}
            formatValue={fmt}
            yAxisLabel={`Amount (${CURRENCIES[currency].code})`}
            xAxisLabel="Business Unit"
            maxValue={buMaxValue}
          />
        </ChartCard>

        <ChartCard
          title="Active Claim Stats"
          subtitle="Claim counts by status"
        >
          <BarChart
            data={claimStats.map((d) => ({ label: d.label, value: d.value }))}
            barWidth="72%"
            yAxisLabel="Count"
            xAxisLabel="Status"
            maxValue={claimStatsMaxValue}
          />
        </ChartCard>
      </Box>

      <Box sx={{ mt: 2 }}>
        <EmployeeSpendingBreakdownPanel
          dateRange={panelDateRange}
          businessUnit={filters.businessUnit}
          currency={currency}
          rangeFromDate={panelFromDate}
          rangeToDate={panelToDate}
          onRangeFromChange={(d) => setPanelFromDate(d.format("YYYY-MM-DD"))}
          onRangeToChange={(d) => setPanelToDate(d.format("YYYY-MM-DD"))}
        />
      </Box>

      <Box sx={{ mt: 2 }}>
        <LeadApprovalFrequencyPanel
          dateRange={panelDateRange}
          businessUnit={filters.businessUnit}
          currency={currency}
          rangeFromDate={panelFromDate}
          rangeToDate={panelToDate}
          onRangeFromChange={(d) => setPanelFromDate(d.format("YYYY-MM-DD"))}
          onRangeToChange={(d) => setPanelToDate(d.format("YYYY-MM-DD"))}
          fallbackLeads={topLeads}
        />
      </Box>

      <Box sx={{ mt: 2 }}>
        <ChartCard
          title="Expense Type Breakdown"
          subtitle={
            selectedRecurringCategory
              ? `${selectedRecurringCategory} sub-expenses`
              : "Grouped expense categories"
          }
          action={
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {selectedRecurringCategory ? (
                <Button
                  variant="text"
                  onClick={() => setSelectedRecurringCategory(null)}
                  sx={{ minWidth: "auto", px: 1.25, textTransform: "none", fontWeight: 600 }}
                >
                  Back
                </Button>
              ) : null}
              <DateRangePickerButton
                fromDate={dayjs(panelFromDate)}
                toDate={dayjs(panelToDate)}
                onFromChange={(d) => setPanelFromDate(d.format("YYYY-MM-DD"))}
                onToChange={(d) => setPanelToDate(d.format("YYYY-MM-DD"))}
                maxTo={dayjs()}
              />
            </Box>
          }
        >
          {selectedRecurringCategory === null ? (
            <Box>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                {recurringPageItems.map((item, index) => {
                  const categoryKey = recurringPageKeys[index];
                  return (
                    <Box
                      key={categoryKey}
                      onClick={() => setSelectedRecurringCategory(categoryKey ?? null)}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        px: 2,
                        py: 1.2,
                        borderRadius: 1.5,
                        border: "1px solid",
                        borderColor: "divider",
                        cursor: "pointer",
                        "&:hover": { bgcolor: "action.hover", borderColor: "primary.main" },
                        transition: "all 0.15s ease",
                        gap: 1.5,
                      }}
                    >
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography
                          sx={{
                            fontSize: 14, fontWeight: 600, color: "text.primary",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}
                        >
                          {item.label}
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: 12, color: "text.disabled",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}
                        >
                          {item.sublabel}
                        </Typography>
                      </Box>

                      <Box
                        sx={{
                          px: 1, py: 0.25, borderRadius: 1,
                          bgcolor: "#FEF0EB", minWidth: 140, textAlign: "center", flexShrink: 0,
                        }}
                      >
                        <Typography sx={{ fontSize: 11, fontWeight: 700, color: "#E8420A", whiteSpace: "nowrap" }}>
                          {fmtSym(item.value)}
                        </Typography>
                      </Box>

                    </Box>
                  );
                })}
              </Box>

              <PaginationBar
                page={recurringPage}
                totalPages={recurringTotalPages}
                onPageChange={setRecurringPage}
              />
            </Box>
          ) : (
            <DoughnutChart
              data={recurringDetailItems}
              formatValue={(v) => fmtSym(v)}
              centerLabel={selectedRecurringCategory}
              centerValue={fmtSym(recurringExpenseGroups[selectedRecurringCategory]?.total ?? 0)}
            />
          )}
        </ChartCard>
      </Box>
    </Box>
  );
}
