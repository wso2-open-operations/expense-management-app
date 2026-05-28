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
import { Alert, Box, Skeleton, Typography } from "@wso2/oxygen-ui";
import { CheckCircle, Clock, LayoutGrid, XCircle } from "lucide-react";

import { useMemo, useState } from "react";

import SummaryCard from "@component/card/SummaryCard";
import ChartCard from "@component/chart/ChartCard";
import ChartPeriodFilter from "@component/chart/ChartPeriodFilter";
import DoughnutChart from "@component/chart/DoughnutChart";
import ExpenseCategoryTransactionsModal from "@component/chart/ExpenseCategoryTransactionsModal";
import CurrencySelector from "@component/common/CurrencySelector";
import { DEFAULT_CURRENCY, MONTH_OPTIONS, PERIOD_TO_DATE_RANGE } from "@config/constant";
import {
  useMyExpenseBreakdown,
  useMyExpenseSummary,
  useMyExpenseTransactions,
} from "@slices/expenseSlice/useMyExpense";
import { type CurrencyCode, formatWithSymbol } from "@utils/currency";

import type { ExpenseTransaction } from "@component/chart/ExpenseCategoryTransactionsModal";

const SEGMENT_COLORS = ["#2E8B57", "#4A8EDB", "#AB7AE0", "#FF8A4C", "#E85D75"];

const MOCK_SUMMARY = {
  totalCount: 14,
  totalAmount: 187600,
  approvedCount: 9,
  pendingCount: 4,
  rejectedCount: 1,
  avgAmount: 13400,
};

const MOCK_BREAKDOWN_CATEGORIES = [
  { category: "Travel", total: 82400, claimCount: 5, percentage: 43.9 },
  { category: "Accommodation", total: 51200, claimCount: 3, percentage: 27.3 },
  { category: "Meals", total: 28600, claimCount: 4, percentage: 15.2 },
  { category: "Training", total: 18800, claimCount: 1, percentage: 10.0 },
  { category: "Other", total: 6600, claimCount: 1, percentage: 3.5 },
];

const MOCK_TRANSACTIONS: Record<string, ExpenseTransaction[]> = {
  Travel: [
    { description: "Singapore Business Trip — SQ421", txnDate: "2026-05-12", amount: 32000, status: "Approved", submittedDate: "2026-05-13", processedDate: "2026-05-15" },
    { description: "Uber Pool — Airport", txnDate: "2026-05-13", amount: 4200, status: "Approved", submittedDate: "2026-05-13", processedDate: "2026-05-16" },
    { description: "Grab — City Transfer", txnDate: "2026-04-28", amount: 1800, status: "Pending", submittedDate: "2026-04-29", processedDate: null },
    { description: "Train — CMB to Kandy", txnDate: "2026-04-15", amount: 1200, status: "Approved", submittedDate: "2026-04-16", processedDate: "2026-04-18" },
    { description: "Flight — BIA to BOM", txnDate: "2026-03-10", amount: 43200, status: "Rejected", submittedDate: "2026-03-11", processedDate: "2026-03-14" },
  ],
  Accommodation: [
    { description: "Hilton Colombo — 3 nights", txnDate: "2026-05-12", amount: 18000, status: "Approved", submittedDate: "2026-05-15", processedDate: "2026-05-18" },
    { description: "Shangri-La Singapore — 2 nights", txnDate: "2026-04-10", amount: 22000, status: "Approved", submittedDate: "2026-04-12", processedDate: "2026-04-15" },
    { description: "Airbnb — Galle weekend", txnDate: "2026-03-22", amount: 11200, status: "Pending", submittedDate: "2026-03-24", processedDate: null },
  ],
  Meals: [
    { description: "Business Lunch — Ministry of Crab", txnDate: "2026-05-14", amount: 8500, status: "Approved", submittedDate: "2026-05-14", processedDate: "2026-05-16" },
    { description: "Team Dinner — Nihonbashi", txnDate: "2026-04-22", amount: 6200, status: "Approved", submittedDate: "2026-04-22", processedDate: "2026-04-24" },
    { description: "Client Breakfast — Cinnamon Grand", txnDate: "2026-04-05", amount: 3800, status: "Pending", submittedDate: "2026-04-05", processedDate: null },
    { description: "Working Lunch — Barista", txnDate: "2026-03-30", amount: 1400, status: "Approved", submittedDate: "2026-03-30", processedDate: "2026-04-01" },
  ],
  Training: [
    { description: "AWS re:Invent Conference", txnDate: "2026-02-20", amount: 18800, status: "Approved", submittedDate: "2026-02-22", processedDate: "2026-02-25" },
  ],
  Other: [
    { description: "Parking — WTC Colombo", txnDate: "2026-05-08", amount: 6600, status: "Approved", submittedDate: "2026-05-08", processedDate: "2026-05-10" },
  ],
};

export default function MyExpenseClaims() {
  const [chartPeriod, setChartPeriod] = useState("all");
  const [statusFilter, setStatusFilter] = useState("All");
  const [modalCategory, setModalCategory] = useState<string | null>(null);
  const [currency, setCurrency] = useState<CurrencyCode>(
    () => (localStorage.getItem("defaultCurrency") as CurrencyCode) ?? DEFAULT_CURRENCY,
  );

  const dateRange = PERIOD_TO_DATE_RANGE[chartPeriod] ?? "All Time";

  const { data: liveSum, loading: summaryLoading, error: summaryError } = useMyExpenseSummary(dateRange);
  const { breakdown: liveBreakdown, loading: breakdownLoading, error: breakdownError } = useMyExpenseBreakdown(dateRange, statusFilter);
  const { transactions: liveTxns, loading: txnLoading, error: txnError } = useMyExpenseTransactions(modalCategory, dateRange, statusFilter);

  const USE_MOCK = true;
  const summary = USE_MOCK ? MOCK_SUMMARY : liveSum;
  const breakdown = USE_MOCK
    ? { totalAmount: MOCK_SUMMARY.totalAmount, claimCount: MOCK_SUMMARY.totalCount, categories: MOCK_BREAKDOWN_CATEGORIES, name: "", email: "" }
    : liveBreakdown;
  const modalTransactions: ExpenseTransaction[] = USE_MOCK
    ? (modalCategory ? (MOCK_TRANSACTIONS[modalCategory] ?? []) : [])
    : liveTxns;

  const fmtSym = (v: number) => formatWithSymbol(v, currency);

  const categories = breakdown?.categories ?? [];

  const donutData = useMemo(
    () => categories.map((c) => ({
      label: c.category,
      value: c.total,
      sublabel: `${c.claimCount} claim${c.claimCount !== 1 ? "s" : ""}`,
    })),
    [categories],
  );

  const selectedCat = categories.find((c) => c.category === modalCategory);

  return (
    <Box sx={{ p: 3, display: "flex", flexDirection: "column", gap: 3 }}>
      {/* Page header */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Expense Claims</Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
            Your submitted expense claims
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <CurrencySelector value={currency} onChange={setCurrency} />
          <ChartPeriodFilter
            value={chartPeriod}
            options={MONTH_OPTIONS}
            onChange={(v) => { setChartPeriod(v); setModalCategory(null); }}
          />
        </Box>
      </Box>

      {summaryError && (
        <Alert severity="error" sx={{ borderRadius: 1 }}>{summaryError}</Alert>
      )}

      {/* 4 summary cards */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" }, gap: 2 }}>
        <SummaryCard
          icon={LayoutGrid}
          iconBg="#ede9fe"
          iconColor="#7c3aed"
          title="Total Claims"
          value={summaryLoading ? "—" : String(summary?.totalCount ?? 0)}
          trend={summaryLoading ? "—" : fmtSym(summary?.totalAmount ?? 0)}
          trendVariant="positive"
          trendLabel="Total Amount"
        />
        <SummaryCard
          icon={CheckCircle}
          iconBg="#dcfce7"
          iconColor="#16a34a"
          title="Approved"
          value={summaryLoading ? "—" : String(summary?.approvedCount ?? 0)}
          trend={summaryLoading ? "—" : `${summary?.totalCount ? Math.round((summary.approvedCount / summary.totalCount) * 100) : 0}%`}
          trendVariant="positive"
          trendLabel="of total"
        />
        <SummaryCard
          icon={Clock}
          iconBg="#fff7ed"
          iconColor="#ea580c"
          title="Pending"
          value={summaryLoading ? "—" : String(summary?.pendingCount ?? 0)}
          trend={summaryLoading ? "—" : `${summary?.totalCount ? Math.round((summary.pendingCount / summary.totalCount) * 100) : 0}%`}
          trendVariant="negative"
          trendLabel="of total"
        />
        <SummaryCard
          icon={XCircle}
          iconBg="#fee2e2"
          iconColor="#dc2626"
          title="Rejected"
          value={summaryLoading ? "—" : String(summary?.rejectedCount ?? 0)}
          trend={summaryLoading ? "—" : `${summary?.totalCount ? Math.round((summary.rejectedCount / summary.totalCount) * 100) : 0}%`}
          trendVariant="negative"
          trendLabel="of total"
        />
      </Box>

      {/* Full-width: Expense Categories */}
      <ChartCard
        title="Expense Categories"
        subtitle="Click a category or chart segment to view transactions"
      >
        {breakdownLoading ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} variant="rectangular" height={68} sx={{ borderRadius: 1 }} />
            ))}
          </Box>
        ) : categories.length === 0 ? (
          <Box sx={{ py: 6, textAlign: "center" }}>
            <Typography sx={{ color: "text.disabled", fontSize: 13 }}>No categories to display</Typography>
          </Box>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {categories.map((cat, idx) => (
              <Box
                key={cat.category}
                onClick={() => setModalCategory(cat.category)}
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  px: 2,
                  py: 1.5,
                  borderRadius: 1,
                  border: "1px solid",
                  borderColor: "divider",
                  cursor: "pointer",
                  "&:hover": { bgcolor: "action.hover", borderColor: "primary.main" },
                  transition: "all 0.15s",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: SEGMENT_COLORS[idx % SEGMENT_COLORS.length], flexShrink: 0 }} />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: "text.primary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {cat.category}
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: "text.disabled", mt: 0.2 }}>
                      {cat.claimCount} claim{cat.claimCount !== 1 ? "s" : ""} · {cat.percentage.toFixed(1)}%
                    </Typography>
                  </Box>
                </Box>
                <Typography sx={{ fontSize: 14, fontWeight: 700, color: "text.primary", flexShrink: 0, ml: 2 }}>
                  {fmtSym(cat.total)}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </ChartCard>

      {/* Full-width: Expense Type Breakdown */}
      <ChartCard
        title="Expense Type Breakdown"
        subtitle="Grouped expense categories"
        action={
          <Box sx={{ display: "flex", gap: 1 }}>
            {["All", "Approved", "Pending"].map((f) => (
              <Box
                key={f}
                onClick={() => { setStatusFilter(f); setModalCategory(null); }}
                sx={{
                  px: 1.2, py: 0.35, borderRadius: 1,
                  fontSize: 11, fontWeight: 700, cursor: "pointer",
                  border: "1px solid",
                  borderColor: statusFilter === f ? "primary.main" : "divider",
                  color: statusFilter === f ? "primary.main" : "text.secondary",
                  bgcolor: statusFilter === f ? "action.selected" : "transparent",
                  transition: "all 0.15s",
                }}
              >
                {f}
              </Box>
            ))}
          </Box>
        }
      >
        {breakdownLoading ? (
          <Box sx={{ display: "flex", gap: 4, alignItems: "center", px: 2, py: 2 }}>
            <Skeleton variant="circular" width={300} height={300} sx={{ flexShrink: 0 }} />
            <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 1.5 }}>
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} variant="rectangular" height={40} sx={{ borderRadius: 1 }} />
              ))}
            </Box>
          </Box>
        ) : breakdownError ? (
          <Typography sx={{ color: "error.main", fontSize: 13, py: 4, textAlign: "center" }}>
            {breakdownError}
          </Typography>
        ) : donutData.length === 0 ? (
          <Box sx={{ py: 6, textAlign: "center" }}>
            <Typography sx={{ color: "text.disabled", fontSize: 13 }}>No expense data for this period</Typography>
          </Box>
        ) : (
          <DoughnutChart
            data={donutData}
            size={300}
            thickness={36}
            formatValue={(v) => fmtSym(v)}
            centerLabel="Total"
            centerValue={fmtSym(breakdown?.totalAmount ?? 0)}
            onItemClick={(item) => setModalCategory(item.label)}
          />
        )}
      </ChartCard>

      {/* Transactions modal */}
      <ExpenseCategoryTransactionsModal
        open={modalCategory !== null}
        onClose={() => setModalCategory(null)}
        category={modalCategory}
        totalAmount={selectedCat?.total ?? 0}
        claimCount={selectedCat?.claimCount ?? 0}
        percentage={selectedCat?.percentage ?? 0}
        color={SEGMENT_COLORS[categories.findIndex((c) => c.category === modalCategory) % SEGMENT_COLORS.length]}
        currency={currency}
        transactions={modalTransactions}
        loading={!USE_MOCK && txnLoading}
        error={!USE_MOCK ? txnError : null}
      />
    </Box>
  );
}
