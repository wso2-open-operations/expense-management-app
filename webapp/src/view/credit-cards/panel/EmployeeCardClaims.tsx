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
import { Activity, DollarSign, FileText } from "lucide-react";

import { useState } from "react";

import SummaryCard from "@component/card/SummaryCard";
import ChartCard from "@component/chart/ChartCard";
import ChartPeriodFilter from "@component/chart/ChartPeriodFilter";
import ExpenseCategoryTransactionsModal, {
  type ExpenseTransaction,
} from "@component/chart/ExpenseCategoryTransactionsModal";
import CurrencySelector from "@component/common/CurrencySelector";
import PaginationBar from "@component/common/PaginationBar";
import { CC_DATE_RANGE_OPTIONS, DEFAULT_CURRENCY } from "@config/constant";
import {
  useCCEmployeeBreakdown,
  useCCEmployeeCategoryTransactions,
} from "@slices/creditCardSlice/useCreditCards";
import { useAppSelector } from "@slices/store";
import { type CurrencyCode, formatWithSymbol } from "@utils/currency";

const SEGMENT_COLORS = ["#2E8B57", "#4A8EDB", "#AB7AE0", "#FF8A4C", "#E85D75"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const DATE_RANGE_OPTIONS = CC_DATE_RANGE_OPTIONS.map((o) => ({ value: o.value, label: o.label }));

export default function EmployeeCardClaims() {
  const [currency, setCurrency] = useState<CurrencyCode>(DEFAULT_CURRENCY as CurrencyCode);
  const [dateRange, setDateRange] = useState("All Time");
  const [modalCategory, setModalCategory] = useState<string | null>(null);
  const [catPage, setCatPage] = useState(0);

  const email = useAppSelector((state) => state.user.userInfo?.workEmail ?? null);

  const { breakdown: yearData, loading: yearLoading } = useCCEmployeeBreakdown(email, "This Year");
  const { breakdown: thisMonthData, loading: thisMonthLoading } = useCCEmployeeBreakdown(email, "This Month");
  const { breakdown: lastMonthData } = useCCEmployeeBreakdown(email, "Last Month");
  const { breakdown, loading, error } = useCCEmployeeBreakdown(email, dateRange);
  const { transactions, loading: txnLoading, error: txnError } = useCCEmployeeCategoryTransactions(email, modalCategory, dateRange);

  const fmtSym = (v: number) => formatWithSymbol(v, currency);

  const currentYear = new Date().getFullYear();
  const currentMonthIdx = new Date().getMonth();
  const currentMonthShort = MONTHS[currentMonthIdx];
  const prevMonthShort = MONTHS[(currentMonthIdx + 11) % 12];

  const cardsLoading = yearLoading || thisMonthLoading;

  const totalSpend = yearData?.totalAmount ?? 0;
  const txnCount = yearData?.txnCount ?? 0;
  const thisMonthSpend = thisMonthData?.totalAmount ?? 0;
  const prevMonthSpend = lastMonthData?.totalAmount ?? 0;
  const monthTrend = prevMonthSpend > 0 ? Math.round(((thisMonthSpend - prevMonthSpend) / prevMonthSpend) * 100) : 0;

  const categories = breakdown?.categories ?? [];
  const catTotalPages = Math.ceil(categories.length / 5);
  const paginatedCategories = categories.slice(catPage * 5, (catPage + 1) * 5);

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
            onChange={(v) => { setDateRange(v); setModalCategory(null); setCatPage(0); }}
          />
        </Box>
      </Box>

      {/* Summary cards */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" }, gap: 2 }}>
        {cardsLoading ? (
          [...Array(3)].map((_, i) => <Skeleton key={i} variant="rectangular" height={130} sx={{ borderRadius: 1 }} />)
        ) : (
          <>
            <SummaryCard
              icon={DollarSign}
              iconBg="#fff8e1"
              iconColor="#f59e0b"
              title="Card Spend in"
              chipLabel={String(currentYear)}
              value={Math.round(totalSpend).toLocaleString()}
              suffix="LKR"
              trend="+0%"
              trendVariant="positive"
              trendLabel={`VS ${currentYear - 1}`}
            />
            <SummaryCard
              icon={Activity}
              iconBg="#fef3c7"
              iconColor="#d97706"
              title="Card Spend in"
              chipLabel={currentMonthShort}
              value={Math.round(thisMonthSpend).toLocaleString()}
              suffix="LKR"
              trend={`${monthTrend >= 0 ? "+" : ""}${monthTrend}%`}
              trendVariant={monthTrend < 0 ? "negative" : "positive"}
              trendLabel={`VS ${prevMonthShort}`}
            />
            <SummaryCard
              icon={FileText}
              iconBg="#dbeafe"
              iconColor="#2563eb"
              title="Transactions in"
              chipLabel={String(currentYear)}
              value={String(txnCount)}
              trend={fmtSym(totalSpend)}
              trendVariant="positive"
              trendLabel="Total Spend"
            />
          </>
        )}
      </Box>

      {error && !loading && (
        <Typography sx={{ color: "error.main", fontSize: 13 }}>{error}</Typography>
      )}

      {/* Transaction Categories — tabular list */}
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
          <>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {paginatedCategories.map((cat) => {
                const idx = categories.indexOf(cat);
                return (
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
                );
              })}
            </Box>
            {catTotalPages > 1 && (
              <PaginationBar page={catPage} totalPages={catTotalPages} onPageChange={setCatPage} />
            )}
          </>
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
        transactions={transactions as unknown as ExpenseTransaction[]}
        loading={txnLoading}
        error={txnError}
      />
    </Box>
  );
}
