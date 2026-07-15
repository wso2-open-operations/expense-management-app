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
import dayjs, { type Dayjs } from "dayjs";
import { DollarSign, Hash } from "lucide-react";

import { useMemo, useState } from "react";

import SummaryCard from "@component/card/SummaryCard";
import CCCardDetailsModal from "@component/chart/CCCardDetailsModal";
import CCCategoryBreakdownModal from "@component/chart/CCCategoryBreakdownModal";
import CCEmployeeSpendingBreakdownPanel from "@component/chart/CCEmployeeSpendingBreakdownPanel";
import ChartCard from "@component/chart/ChartCard";
import DonutChart from "@component/chart/DonutChart";
import CurrencySelector from "@component/common/CurrencySelector";
import DateRangePickerButton from "@component/common/DateRangePickerButton";
import PaginationBar from "@component/common/PaginationBar";
import SearchBox from "@component/common/SearchBox";
import { DEFAULT_CURRENCY, PAGE_SIZE_CC_CARDS } from "@config/constant";
import {
  type CCCardListItem,
  type CCCardTypeItem,
  useCCCardList,
  useCCCardTypeAnalysis,
  useCCSummary,
} from "@slices/creditCardSlice/useCreditCards";
import { type CurrencyCode, formatWithSymbol } from "@utils/currency";


const CATEGORY_COLORS = [
  "#00B4D8", "#FF8A4C", "#F4B400", "#2E8B57", "#AB7AE0",
  "#8C9EFF", "#00A6A6", "#E85D75", "#FF6B9D", "#4A8EDB",
  "#90EE90", "#DA70D6",
];

const nowJs = new Date();
const currentYear = nowJs.getFullYear();
const currentMonth = nowJs.toLocaleString("default", { month: "long" });

const nowDayjs = dayjs();
const DEFAULT_FROM_DATE = dayjs("2022-01-01").startOf("month").startOf("day");
const DEFAULT_TO_DATE = nowDayjs;

function buildDateRange(from: Dayjs, to: Dayjs): string {
  return `custom:${from.year()}-${from.month() + 1}:${to.year()}-${to.month() + 1}`;
}

type StatusFilter = "All" | "Active" | "Inactive";
const STATUS_OPTIONS: StatusFilter[] = ["All", "Active", "Inactive"];

export default function CreditCard() {
  const [currency, setCurrency] = useState<CurrencyCode>(DEFAULT_CURRENCY);
  const [cardSearch, setCardSearch] = useState("");
  const [cardsPage, setCardsPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [selectedCategory, setSelectedCategory] = useState<CCCardTypeItem | null>(null);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<CCCardListItem | null>(null);
  const [cardDetailsOpen, setCardDetailsOpen] = useState(false);
  const [hoveredCategoryIdx, setHoveredCategoryIdx] = useState<number | null>(null);
  const [fromDate, setFromDate] = useState<Dayjs>(DEFAULT_FROM_DATE);
  const [toDate, setToDate] = useState<Dayjs>(DEFAULT_TO_DATE);

  const fmtSym = (v: number) => formatWithSymbol(v, currency);

  const dateRange = buildDateRange(fromDate, toDate);

  const { data: summary, loading: summaryLoading } = useCCSummary();
  const { items: cardTypes, loading: cardTypesLoading } = useCCCardTypeAnalysis(dateRange);
  const { cards: cardList, loading: cardListLoading } = useCCCardList(dateRange);

  const filteredCards = useMemo(() => {
    let list = cardList;
    if (statusFilter !== "All") {
      list = list.filter((c) => c.status === statusFilter);
    }
    const q = cardSearch.toLowerCase().trim();
    if (q) {
      list = list.filter(
        (c) =>
          c.holderName.toLowerCase().includes(q) ||
          c.cardNumber.toLowerCase().includes(q) ||
          c.cardType.toLowerCase().includes(q),
      );
    }
    return list;
  }, [cardList, cardSearch, statusFilter]);

  const totalCardPages = Math.ceil(filteredCards.length / PAGE_SIZE_CC_CARDS);
  const paginatedCards = filteredCards.slice(
    cardsPage * PAGE_SIZE_CC_CARDS,
    (cardsPage + 1) * PAGE_SIZE_CC_CARDS,
  );

  const trendLabel = `VS ${currentYear - 1}`;

  const handleCategoryClick = (item: CCCardTypeItem) => {
    setSelectedCategory({ ...item });
    setCategoryModalOpen(true);
  };

  const handleStatusFilter = (s: StatusFilter) => {
    setStatusFilter(s);
    setCardsPage(0);
  };

  const handleSearch = (val: string) => {
    setCardSearch(val);
    setCardsPage(0);
  };

const totalCCSpend = cardTypes.reduce((s, i) => s + i.totalSpend, 0);

  return (
    <Box sx={{ p: 3, display: "flex", flexDirection: "column", gap: 3 }}>

      {/* Filters bar */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <DateRangePickerButton
          fromDate={fromDate}
          toDate={toDate}
          onFromChange={setFromDate}
          onToChange={setToDate}
          maxTo={nowDayjs}
        />
        <CurrencySelector
          value={currency}
          onChange={(val) => setCurrency(val)}
        />
      </Box>

      {/* Summary KPI cards */}
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2 }}>
        {summaryLoading ? (
          [...Array(3)].map((_, i) => (
            <Skeleton key={i} variant="rectangular" height={120} sx={{ borderRadius: 2 }} />
          ))
        ) : (
          <>
            <SummaryCard
              icon={DollarSign}
              iconBg="#fff8e1"
              iconColor="#f59e0b"
              title="Total Card Spend"
              chipLabel={String(currentYear)}
              value={fmtSym(summary?.totalSpend ?? 0)}
              trend={`${summary?.trendTotalSpend !== undefined ? (summary.trendTotalSpend >= 0 ? "+" : "") + summary.trendTotalSpend.toFixed(1) : "0"}%`}
              trendVariant={(summary?.trendTotalSpend ?? 0) >= 0 ? "positive" : "negative"}
              trendLabel={trendLabel}
            />
            <SummaryCard
              icon={DollarSign}
              iconBg="#fff3e0"
              iconColor="#f57c00"
              title="Avg Transaction"
              chipLabel={currentMonth}
              value={fmtSym(summary?.avgTransaction ?? 0)}
              trend={`${summary?.trendAvgTransaction !== undefined ? (summary.trendAvgTransaction >= 0 ? "+" : "") + summary.trendAvgTransaction.toFixed(1) : "0"}%`}
              trendVariant={(summary?.trendAvgTransaction ?? 0) >= 0 ? "positive" : "negative"}
              trendLabel="vs last month"
            />
            <SummaryCard
              icon={Hash}
              iconBg="#FEF0EB"
              iconColor="#E8420A"
              title="Active Cards"
              chipLabel={String(currentYear)}
              value={String(summary?.activeCardCount ?? 0)}
              trend={`${summary?.trendActiveCards !== undefined ? (summary.trendActiveCards >= 0 ? "+" : "") + summary.trendActiveCards.toFixed(1) : "0"}`}
              trendVariant={(summary?.trendActiveCards ?? 0) >= 0 ? "positive" : "negative"}
              trendLabel={trendLabel}
              footerRight={fmtSym(summary?.highestSpendCardAmount ?? 0)}
              footerRightLabel="Highest Spend (LKR)"
            />
          </>
        )}
      </Box>

      {/* Overall Expense Breakdown + Category Drill-down */}
      <ChartCard
        title="Expense Breakdown by Type"
        subtitle="Overall CC spend by engagement area — click a category to view cardholders"
        minHeight={220}
      >
        {cardTypesLoading ? (
          <Box sx={{ display: "flex", gap: 3, alignItems: "flex-start" }}>
            <Skeleton variant="circular" width={190} height={190} sx={{ flexShrink: 0 }} />
            <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 1 }}>
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} variant="rectangular" height={46} sx={{ borderRadius: 1.5 }} />
              ))}
            </Box>
          </Box>
        ) : cardTypes.length === 0 ? (
          <Box sx={{ py: 6, textAlign: "center" }}>
            <Typography sx={{ color: "text.disabled", fontSize: 13 }}>No data available</Typography>
          </Box>
        ) : (
          <Box sx={{ display: "flex", gap: 3, alignItems: "flex-start" }}>
            <DonutChart
              segments={cardTypes.map((item, idx) => ({
                label: item.cardType,
                value: item.totalSpend,
                color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
              }))}
              size={190}
              thickness={42}
              centerLabel="Total CC Spend"
              centerValue={fmtSym(totalCCSpend)}
              hoveredIndex={hoveredCategoryIdx}
              onHoverChange={setHoveredCategoryIdx}
            />

            <Box sx={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, alignContent: "start" }}>
              {cardTypes.map((item, idx) => {
                const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
                const isHovered = hoveredCategoryIdx === idx;
                return (
                  <Box
                    key={item.cardType}
                    onClick={() => handleCategoryClick(item)}
                    onMouseEnter={() => setHoveredCategoryIdx(idx)}
                    onMouseLeave={() => setHoveredCategoryIdx(null)}
                    sx={{
                      px: 2, py: 1.2, borderRadius: 1.5,
                      border: "1px solid",
                      borderColor: isHovered ? "primary.main" : "divider",
                      bgcolor: isHovered ? "action.hover" : "transparent",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.3 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: color, flexShrink: 0 }} />
                      <Typography sx={{ fontSize: 13, fontWeight: 600, color: "text.primary", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.cardType}
                      </Typography>
                      <Typography sx={{ fontSize: 13, fontWeight: 700, color: "text.primary" }}>
                        {fmtSym(item.totalSpend)}
                      </Typography>
                    </Box>
                    <Box sx={{ pl: 2.25, display: "flex", alignItems: "center", gap: 1.5 }}>
                      <Typography sx={{ fontSize: 11, color: "text.disabled" }}>
                        {item.txnCount.toLocaleString()} txns
                      </Typography>
                      <Typography sx={{ fontSize: 11, color: "text.disabled" }}>
                        {item.percentage.toFixed(1)}%
                      </Typography>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}
      </ChartCard>

      {/* Employee-wise CC Spending Breakdown */}
      <CCEmployeeSpendingBreakdownPanel currency={currency} dateRange={dateRange} />

      {/* Corporate Cards table */}
      <ChartCard
        title="Corporate Cards"
        subtitle="All issued corporate cards — Total Spend reflects the selected period"
        minHeight={300}
      >
        {/* Search + Status filter bar */}
        <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", flexWrap: "wrap" }}>
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <SearchBox
              value={cardSearch}
              onChange={handleSearch}
              placeholder="Search by name, card number, type..."
            />
          </Box>

          {/* Active / Inactive toggle */}
          <Box
            sx={{
              display: "flex",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            {STATUS_OPTIONS.map((opt) => (
              <Box
                key={opt}
                onClick={() => handleStatusFilter(opt)}
                sx={{
                  px: 1.5,
                  py: 0.55,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  userSelect: "none",
                  bgcolor: statusFilter === opt ? "primary.main" : "transparent",
                  color: statusFilter === opt ? "#fff" : "text.secondary",
                  borderRight: opt !== "Inactive" ? "1px solid" : "none",
                  borderColor: "divider",
                  transition: "all 0.15s ease",
                  "&:hover": statusFilter !== opt ? { bgcolor: "action.hover" } : {},
                }}
              >
                {opt}
              </Box>
            ))}
          </Box>
        </Box>

        {cardListLoading ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            {[...Array(PAGE_SIZE_CC_CARDS)].map((_, i) => (
              <Skeleton key={i} variant="rectangular" height={44} sx={{ borderRadius: 1 }} />
            ))}
          </Box>
        ) : filteredCards.length === 0 ? (
          <Box sx={{ py: 4, textAlign: "center" }}>
            <Typography sx={{ color: "text.disabled", fontSize: 13 }}>
              {cardSearch || statusFilter !== "All"
                ? "No cards match your filters"
                : "No card data available"}
            </Typography>
          </Box>
        ) : (
          <>
            <Box sx={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr>
                    {["Card ID", "Card Number", "Cardholder", "Total Spend", "Provider", "Status"].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: "left",
                          padding: "8px 12px",
                          fontWeight: 600,
                          color: "#6b7280",
                          borderBottom: "1px solid #e5e7eb",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedCards.map((card) => (
                    <tr
                      key={card.cardId}
                      tabIndex={0}
                      role="button"
                      aria-label={`View details for ${card.holderName}`}
                      onClick={() => { setSelectedCard(card); setCardDetailsOpen(true); }}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedCard(card); setCardDetailsOpen(true); } }}
                      style={{ borderBottom: "1px solid #f3f4f6", cursor: "pointer" }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f9fafb")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "")}
                    >
                      <td style={{ padding: "10px 12px", color: "#374151" }}>{card.cardId}</td>
                      <td style={{ padding: "10px 12px", color: "#374151" }}>{card.cardNumber}</td>
                      <td style={{ padding: "10px 12px", color: "#374151" }}>{card.holderName}</td>
                      <td style={{ padding: "10px 12px", fontWeight: 600, color: "#111827" }}>
                        {fmtSym(card.usedAmount)}
                      </td>
                      <td style={{ padding: "10px 12px", color: "#374151" }}>{card.cardType}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <Box
                          sx={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 0.5,
                            px: 1,
                            py: 0.3,
                            borderRadius: 1,
                            bgcolor: card.status === "Active" ? "#f0fdf4" : "#fff1f2",
                            color: card.status === "Active" ? "#15803d" : "#be123c",
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          <Box
                            sx={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              bgcolor: card.status === "Active" ? "#22c55e" : "#f43f5e",
                            }}
                          />
                          {card.status}
                        </Box>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>

            {totalCardPages > 1 && (
              <PaginationBar
                page={cardsPage}
                totalPages={totalCardPages}
                onPageChange={setCardsPage}
              />
            )}
          </>
        )}
      </ChartCard>

      {/* Card details modal */}
      {selectedCard && (
        <CCCardDetailsModal
          open={cardDetailsOpen}
          onClose={() => setCardDetailsOpen(false)}
          cardId={selectedCard.cardId}
          cardNumber={selectedCard.cardNumber}
          holderName={selectedCard.holderName}
          holderEmail={selectedCard.holderEmail}
          cardType={selectedCard.cardType}
          status={selectedCard.status}
          totalSpend={selectedCard.usedAmount}
          currency={currency}
        />
      )}

      {/* Category drill-down modal */}
      {selectedCategory && (
        <CCCategoryBreakdownModal
          open={categoryModalOpen}
          onClose={() => setCategoryModalOpen(false)}
          category={selectedCategory.cardType}
          totalSpend={selectedCategory.totalSpend}
          txnCount={selectedCategory.txnCount}
          percentage={selectedCategory.percentage}
          color={CATEGORY_COLORS[cardTypes.findIndex((i) => i.cardType === selectedCategory.cardType) % CATEGORY_COLORS.length]}
          currency={currency}
        />
      )}
    </Box>
  );
}
