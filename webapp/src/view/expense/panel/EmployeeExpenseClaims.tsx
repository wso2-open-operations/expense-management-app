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
import { Activity, DollarSign, FileText } from "lucide-react";

import { useState } from "react";

import SummaryCard from "@component/card/SummaryCard";
import ChartCard from "@component/chart/ChartCard";
import ChartPeriodFilter from "@component/chart/ChartPeriodFilter";
import ExpenseCategoryTransactionsModal from "@component/chart/ExpenseCategoryTransactionsModal";
import CurrencySelector from "@component/common/CurrencySelector";
import PaginationBar from "@component/common/PaginationBar";
import { DEFAULT_CURRENCY, MONTH_OPTIONS, PERIOD_TO_DATE_RANGE } from "@config/constant";
import {
  useMyExpenseBreakdown,
  useMyExpenseSummary,
  useMyExpenseTransactions,
} from "@slices/expenseSlice/useMyExpense";
import { type CurrencyCode, formatWithSymbol } from "@utils/currency";

import type { ExpenseTransaction } from "@component/chart/ExpenseCategoryTransactionsModal";

const SEGMENT_COLORS = ["#2E8B57", "#4A8EDB", "#AB7AE0", "#FF8A4C", "#E85D75"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function EmployeeExpenseClaims() {
  const [chartPeriod, setChartPeriod] = useState("all");
  const [modalCategory, setModalCategory] = useState<string | null>(null);
  const [catPage, setCatPage] = useState(0);
  const [currency, setCurrency] = useState<CurrencyCode>(
    () => (localStorage.getItem("defaultCurrency") as CurrencyCode) ?? DEFAULT_CURRENCY,
  );

  const dateRange = PERIOD_TO_DATE_RANGE[chartPeriod] ?? "All Time";

  const currentYear = new Date().getFullYear();
  const currentMonthIdx = new Date().getMonth();
  const currentMonthShort = MONTHS[currentMonthIdx];
  const prevMonthShort = MONTHS[(currentMonthIdx + 11) % 12];

  const { data: yearData, loading: yearLoading, error: yearError } = useMyExpenseSummary("Year to Date");
  const { data: thisMonthData, loading: thisMonthLoading } = useMyExpenseSummary("This Month");
  const { data: lastMonthData } = useMyExpenseSummary("Last Month");
  const { breakdown, loading: breakdownLoading } = useMyExpenseBreakdown(dateRange, "All");
  const { transactions: liveTxns, loading: txnLoading, error: txnError } = useMyExpenseTransactions(modalCategory, dateRange, "All");

  const fmtSym = (v: number) => formatWithSymbol(v, currency);

  const cardsLoading = yearLoading || thisMonthLoading;

  const yearTotal = yearData?.totalAmount ?? 0;
  const totalCount = yearData?.totalCount ?? 0;
  const approvedCount = yearData?.approvedCount ?? 0;
  const pendingCount = yearData?.pendingCount ?? 0;
  const thisMonthTotal = thisMonthData?.totalAmount ?? 0;
  const prevMonthTotal = lastMonthData?.totalAmount ?? 0;
  const monthTrend = prevMonthTotal > 0 ? Math.round(((thisMonthTotal - prevMonthTotal) / prevMonthTotal) * 100) : 0;

  const categories = breakdown?.categories ?? [];
  const modalTransactions = liveTxns as ExpenseTransaction[];

  const catTotalPages = Math.ceil(categories.length / 5);
  const paginatedCategories = categories.slice(catPage * 5, (catPage + 1) * 5);
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
        <CurrencySelector value={currency} onChange={setCurrency} />
      </Box>

      {yearError && (
        <Alert severity="error" sx={{ borderRadius: 1 }}>{yearError}</Alert>
      )}

      {/* 3 summary cards */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" }, gap: 2 }}>
        {cardsLoading ? (
          [...Array(3)].map((_, i) => <Skeleton key={i} variant="rectangular" height={130} sx={{ borderRadius: 1 }} />)
        ) : (
          <>
            <SummaryCard
              icon={DollarSign}
              iconBg="#fff8e1"
              iconColor="#f59e0b"
              title="Claim Amount in"
              chipLabel={String(currentYear)}
              value={Math.round(yearTotal).toLocaleString()}
              suffix="LKR"
              trend="+0%"
              trendVariant="positive"
              trendLabel={`VS ${currentYear - 1}`}
            />
            <SummaryCard
              icon={Activity}
              iconBg="#fef3c7"
              iconColor="#d97706"
              title="Claim Amount in"
              chipLabel={currentMonthShort}
              value={Math.round(thisMonthTotal).toLocaleString()}
              suffix="LKR"
              trend={`${monthTrend >= 0 ? "+" : ""}${monthTrend}%`}
              trendVariant={monthTrend < 0 ? "negative" : "positive"}
              trendLabel={`VS ${prevMonthShort}`}
            />
            <SummaryCard
              icon={FileText}
              iconBg="#dbeafe"
              iconColor="#2563eb"
              title="Number of Claims"
              chipLabel={String(currentYear)}
              value={String(totalCount)}
              trend={String(approvedCount)}
              trendVariant="positive"
              trendLabel="Approved"
              footerRight={String(pendingCount)}
              footerRightLabel="Pending"
            />
          </>
        )}
      </Box>

      {/* Expense Categories */}
      <ChartCard
        title="Expense Categories"
        subtitle="Click a category to view transactions"
        action={
          <ChartPeriodFilter
            value={chartPeriod}
            options={MONTH_OPTIONS}
            onChange={(v) => { setChartPeriod(v); setModalCategory(null); setCatPage(0); }}
          />
        }
      >
        {breakdownLoading ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} variant="rectangular" height={44} sx={{ borderRadius: 1 }} />
            ))}
          </Box>
        ) : categories.length === 0 ? (
          <Box sx={{ py: 6, textAlign: "center" }}>
            <Typography sx={{ color: "text.disabled", fontSize: 13 }}>No categories to display</Typography>
          </Box>
        ) : (
          <>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) 80px 110px",
                px: 2,
                py: 1,
                borderBottom: "1px solid",
                borderColor: "divider",
                mb: 0.5,
              }}
            >
              {["Category", "Claims", "Amount"].map((h, i) => (
                <Typography
                  key={h}
                  sx={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "text.disabled",
                    textTransform: "uppercase",
                    letterSpacing: 0.6,
                    textAlign: i === 0 ? "left" : "right",
                  }}
                >
                  {h}
                </Typography>
              ))}
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column" }}>
              {paginatedCategories.map((cat) => {
                const idx = categories.indexOf(cat);
                const color = SEGMENT_COLORS[idx % SEGMENT_COLORS.length];
                return (
                  <Box
                    key={cat.category}
                    onClick={() => setModalCategory(cat.category)}
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "minmax(0, 1fr) 80px 110px",
                      alignItems: "center",
                      px: 2,
                      py: 1.5,
                      borderRadius: 0.5,
                      borderBottom: "1px solid",
                      borderColor: "divider",
                      cursor: "pointer",
                      "&:hover": { bgcolor: "action.hover" },
                      transition: "background 0.12s",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: color, flexShrink: 0 }} />
                      <Typography sx={{ fontSize: 13, fontWeight: 600, color: "text.primary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {cat.category}
                      </Typography>
                    </Box>
                    <Typography sx={{ fontSize: 13, color: "text.secondary", textAlign: "right" }}>
                      {cat.claimCount}
                    </Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: "text.primary", textAlign: "right" }}>
                      {fmtSym(cat.total)}
                    </Typography>
                  </Box>
                );
              })}
            </Box>

            {catTotalPages > 1 && (
              <PaginationBar page={catPage} totalPages={catTotalPages} onPageChange={setCatPage} />
            )}
          </>
        )}
      </ChartCard>

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
        loading={txnLoading}
        error={txnError}
      />
    </Box>
  );
}
