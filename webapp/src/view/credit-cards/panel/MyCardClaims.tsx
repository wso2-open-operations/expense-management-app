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

import { Box, Skeleton, Typography } from "@wso2/oxygen-ui";
import { DollarSign, Hash } from "lucide-react";

import { useState } from "react";

import SummaryCard from "@component/card/SummaryCard";
import ChartCard from "@component/chart/ChartCard";
import ChartPeriodFilter from "@component/chart/ChartPeriodFilter";
import DoughnutChart from "@component/chart/DoughnutChart";
import ExpenseCategoryTransactionsModal, {
  type ExpenseTransaction,
} from "@component/chart/ExpenseCategoryTransactionsModal";
import CurrencySelector from "@component/common/CurrencySelector";
import { CC_DATE_RANGE_OPTIONS, DEFAULT_CURRENCY } from "@config/constant";
import {
  useCCEmployeeBreakdown,
  useCCEmployeeCategoryTransactions,
} from "@slices/creditCardSlice/useCreditCards";
import { useAppSelector } from "@slices/store";
import { type CurrencyCode, formatWithSymbol } from "@utils/currency";

const SEGMENT_COLORS = ["#2E8B57", "#4A8EDB", "#AB7AE0", "#FF8A4C", "#E85D75"];

const MOCK_BREAKDOWN = {
  totalAmount: 128450,
  txnCount: 23,
  categories: [
    { category: "Travel", total: 54200, txnCount: 8, percentage: 42.2 },
    { category: "Accommodation", total: 38750, txnCount: 6, percentage: 30.2 },
    { category: "Meals", total: 21300, txnCount: 5, percentage: 16.6 },
    { category: "Office Supplies", total: 9800, txnCount: 3, percentage: 7.6 },
    { category: "Other", total: 4400, txnCount: 1, percentage: 3.4 },
  ],
};

const MOCK_TRANSACTIONS: Record<string, ExpenseTransaction[]> = {
  Travel: [
    { description: "Singapore Airlines SQ421", txnDate: "2026-05-12", amount: 32000, status: "Approved" },
    { description: "Uber — Airport Transfer", txnDate: "2026-05-13", amount: 4200, status: "Approved" },
    { description: "Grab — City Trip", txnDate: "2026-04-28", amount: 1800, status: "Pending" },
    { description: "Train — Colombo to Kandy", txnDate: "2026-04-15", amount: 1200, status: "Approved" },
    { description: "Taxi — Office Transfer", txnDate: "2026-03-20", amount: 800, status: "Approved" },
    { description: "PickMe — Late Night Ride", txnDate: "2026-03-18", amount: 650, status: "Pending" },
    { description: "Colombo Port City Shuttle", txnDate: "2026-02-14", amount: 900, status: "Approved" },
    { description: "Taxi — Kandy Airport", txnDate: "2026-01-08", amount: 1650, status: "Approved" },
  ],
  Accommodation: [
    { description: "Hilton Colombo — 3 nights", txnDate: "2026-05-12", amount: 18000, status: "Approved" },
    { description: "Shangri-La Singapore — 2 nights", txnDate: "2026-04-10", amount: 14500, status: "Approved" },
    { description: "Airbnb — Galle", txnDate: "2026-03-22", amount: 3500, status: "Pending" },
    { description: "Hotel Suisse — Kandy", txnDate: "2026-02-18", amount: 1800, status: "Approved" },
    { description: "Inn on the Green — Nuwara Eliya", txnDate: "2026-01-30", amount: 950, status: "Approved" },
  ],
  Meals: [
    { description: "Business Lunch — Ministry of Crab", txnDate: "2026-05-14", amount: 8500, status: "Approved" },
    { description: "Team Dinner — Nihonbashi", txnDate: "2026-04-22", amount: 6200, status: "Approved" },
    { description: "Client Breakfast — Cinnamon Grand", txnDate: "2026-04-05", amount: 3800, status: "Pending" },
    { description: "Working Lunch — Barista", txnDate: "2026-03-30", amount: 1400, status: "Approved" },
    { description: "Team Coffee — Commons", txnDate: "2026-03-10", amount: 1400, status: "Approved" },
  ],
  "Office Supplies": [
    { description: "Logitech MX Keys Keyboard", txnDate: "2026-05-02", amount: 5200, status: "Approved" },
    { description: "Monitor Stand — Amazon", txnDate: "2026-04-18", amount: 2800, status: "Pending" },
    { description: "USB-C Hub — Baseus", txnDate: "2026-03-15", amount: 1800, status: "Approved" },
  ],
  Other: [
    { description: "Parking — WTC Colombo", txnDate: "2026-05-08", amount: 4400, status: "Approved" },
  ],
};

const DATE_RANGE_OPTIONS = CC_DATE_RANGE_OPTIONS.map((o) => ({ value: o.value, label: o.label }));

export default function MyCardClaims() {
  const [currency, setCurrency] = useState<CurrencyCode>(DEFAULT_CURRENCY as CurrencyCode);
  const [dateRange, setDateRange] = useState("All Time");
  const [modalCategory, setModalCategory] = useState<string | null>(null);

  const email = useAppSelector((state) => state.user.userInfo?.workEmail ?? null);

  const { breakdown, loading, error } = useCCEmployeeBreakdown(email, dateRange);
  const {
    transactions: liveTxns,
    loading: txnLoading,
    error: txnError,
  } = useCCEmployeeCategoryTransactions(email, modalCategory, dateRange);

  const fmtSym = (v: number) => formatWithSymbol(v, currency);

  const USE_MOCK = true;
  const totalSpend = USE_MOCK ? MOCK_BREAKDOWN.totalAmount : (breakdown?.totalAmount ?? 0);
  const txnCount = USE_MOCK ? MOCK_BREAKDOWN.txnCount : (breakdown?.txnCount ?? 0);
  const categories = USE_MOCK ? MOCK_BREAKDOWN.categories : (breakdown?.categories ?? []);
  const modalTransactions: ExpenseTransaction[] = USE_MOCK
    ? (modalCategory ? (MOCK_TRANSACTIONS[modalCategory] ?? []) : [])
    : (liveTxns as ExpenseTransaction[]);

  const doughnutData = categories.map((c) => ({
    label: c.category,
    value: c.total,
    sublabel: `${c.txnCount} txns`,
  }));

  const selectedCat = categories.find((c) => c.category === modalCategory);

  return (
    <Box sx={{ p: 3, display: "flex", flexDirection: "column", gap: 3 }}>

      {/* Page header + controls row */}
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: "text.primary", lineHeight: 1.2 }}>
            Card Claims
          </Typography>
          <Typography sx={{ fontSize: 13, color: "text.secondary", mt: 0.5 }}>
            Your corporate card spending
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <CurrencySelector value={currency} onChange={setCurrency} />
          <ChartPeriodFilter
            value={dateRange}
            options={DATE_RANGE_OPTIONS}
            onChange={(v) => { setDateRange(v); setModalCategory(null); }}
          />
        </Box>
      </Box>

      {/* Summary cards */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
        <SummaryCard
          icon={DollarSign}
          iconBg="#fff8e1"
          iconColor="#f59e0b"
          title="Total Spend"
          value={loading ? "—" : fmtSym(totalSpend)}
          trend={loading ? "—" : `${txnCount} txns`}
          trendVariant="positive"
          trendLabel="transactions"
        />
        <SummaryCard
          icon={Hash}
          iconBg="#f3e8ff"
          iconColor="#9333ea"
          title="Total Transactions"
          value={loading ? "—" : txnCount.toLocaleString()}
          trend={loading ? "—" : fmtSym(totalSpend)}
          trendVariant="positive"
          trendLabel="Total Spend"
        />
      </Box>

      {error && !loading && (
        <Typography sx={{ color: "error.main", fontSize: 13 }}>{error}</Typography>
      )}

      {/* Transaction Categories — full-width list */}
      <ChartCard
        title="Transaction Categories"
        subtitle="Click a category to view transactions"
      >
        {loading ? (
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
                      {cat.txnCount} txn{cat.txnCount !== 1 ? "s" : ""} · {cat.percentage.toFixed(1)}%
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

      {/* Spending by Category — doughnut */}
      <ChartCard
        title="Spending by Category"
        subtitle="Click a category or chart segment to view transactions"
      >
        {loading ? (
          <Box sx={{ display: "flex", gap: 4, alignItems: "center", px: 2, py: 2 }}>
            <Skeleton variant="circular" width={300} height={300} sx={{ flexShrink: 0 }} />
            <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 1.5 }}>
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} variant="rectangular" height={40} sx={{ borderRadius: 1 }} />
              ))}
            </Box>
          </Box>
        ) : doughnutData.length === 0 ? (
          <Box sx={{ py: 6, textAlign: "center" }}>
            <Typography sx={{ color: "text.disabled", fontSize: 13 }}>
              No spending data for this period
            </Typography>
          </Box>
        ) : (
          <DoughnutChart
            data={doughnutData}
            size={300}
            thickness={36}
            formatValue={(v) => fmtSym(v)}
            centerLabel="Total Spend"
            centerValue={fmtSym(totalSpend)}
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
        claimCount={selectedCat?.txnCount ?? 0}
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
