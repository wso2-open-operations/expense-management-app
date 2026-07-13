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
import { Box, CircularProgress, Typography, Dialog, DialogContent } from "@wso2/oxygen-ui";
import { Download, ChevronDown, ChevronRight, X } from "lucide-react";
// Skeleton, TrendingDown, TrendingUp were used by CCPeriodComparison, which is commented out below

import { useEffect, useState } from "react";

import {
  useCCEmployeeBreakdown,
  useCCEmployeeCategoryTransactions,
} from "@slices/creditCardSlice/useCreditCards";
import { type CurrencyCode, formatWithSymbol } from "@utils/currency";
import { exportCCEmployeeBreakdown } from "@utils/exportExcel";

const SEGMENT_COLORS = [
  "#FF8A4C",
  "#2E8B57",
  "#AB7AE0",
  "#00A6A6",
  "#E85D75",
  "#FF6B9D",
  "#90EE90",
  "#DA70D6",
];

const PERIOD_GRANULARITIES = ["Annually", "Quarterly", "Monthly"] as const;
type PeriodGranularity = (typeof PERIOD_GRANULARITIES)[number];

const PERIOD_COLUMN_COUNT = 5;

// Builds N fixed calendar periods (oldest first) for the chosen granularity, e.g.
// Annually -> last 5 calendar years, Quarterly -> last 5 quarters, Monthly -> last 5 months.
function generatePeriodColumns(
  granularity: PeriodGranularity,
): { label: string; dateRange: string }[] {
  const now = new Date();
  const columns: { label: string; dateRange: string }[] = [];

  if (granularity === "Annually") {
    for (let i = PERIOD_COLUMN_COUNT - 1; i >= 0; i--) {
      const year = now.getFullYear() - i;
      columns.push({ label: String(year), dateRange: `custom:${year}-1:${year}-12` });
    }
  } else if (granularity === "Quarterly") {
    const currentAbsQuarter = now.getFullYear() * 4 + Math.floor(now.getMonth() / 3);
    for (let i = PERIOD_COLUMN_COUNT - 1; i >= 0; i--) {
      const absQuarter = currentAbsQuarter - i;
      const year = Math.floor(absQuarter / 4);
      const q = absQuarter % 4;
      const startMonth = q * 3 + 1;
      const endMonth = q * 3 + 3;
      columns.push({
        label: `Q${q + 1} ${year}`,
        dateRange: `custom:${year}-${startMonth}:${year}-${endMonth}`,
      });
    }
  } else {
    for (let i = PERIOD_COLUMN_COUNT - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      columns.push({
        label: d.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
        dateRange: `custom:${year}-${month}:${year}-${month}`,
      });
    }
  }

  return columns;
}

interface CCSubCategoryPanelProps {
  email: string;
  category: string;
  dateRange: string;
  fmtSym: (v: number) => string;
  color: string;
}

function CCSubCategoryPanel({ email, category, dateRange, fmtSym, color }: CCSubCategoryPanelProps) {
  const { transactions: txns, loading } = useCCEmployeeCategoryTransactions(
    email,
    category,
    dateRange,
  );

  const amountMap = new Map<string, number>();
  txns.forEach((t) => amountMap.set(t.description, (amountMap.get(t.description) ?? 0) + t.amount));

  const allDescs = [...amountMap.keys()].sort();

  return (
    <Box
      sx={{
        mx: 1,
        mb: 1,
        borderRadius: 1.5,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        overflow: "hidden",
      }}
    >
      {loading ? (
        <Box sx={{ p: 2, display: "flex", justifyContent: "center" }}>
          <CircularProgress size={20} />
        </Box>
      ) : allDescs.length === 0 ? (
        <Box sx={{ p: 2 }}>
          <Typography sx={{ fontSize: 12, color: "text.disabled", textAlign: "center" }}>
            No transactions found
          </Typography>
        </Box>
      ) : (
        allDescs.map((desc, idx) => {
          const amount = amountMap.get(desc) ?? 0;
          return (
            <Box
              key={`${desc}-${idx}`}
              sx={{
                display: "flex",
                alignItems: "center",
                px: 2,
                py: 0.9,
                borderBottom: idx < allDescs.length - 1 ? "1px solid" : "none",
                borderColor: "divider",
                "&:hover": { bgcolor: "action.hover" },
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, flex: 1, minWidth: 0 }}>
                <Box
                  sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: color, flexShrink: 0 }}
                />
                <Typography
                  sx={{
                    fontSize: 12,
                    color: "text.primary",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={desc}
                >
                  {desc}
                </Typography>
              </Box>
              <Typography
                sx={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: amount > 0 ? "text.primary" : "text.disabled",
                  minWidth: 110,
                  textAlign: "right",
                  flexShrink: 0,
                }}
              >
                {amount > 0 ? fmtSym(amount) : ""}
              </Typography>
            </Box>
          );
        })
      )}
    </Box>
  );
}

interface CCCategoryTableRowProps {
  category: string;
  color: string;
  values: number[];
  columnCount: number;
  fmtSym: (v: number) => string;
  email: string;
  latestDateRange: string;
  isExpanded: boolean;
  onToggle: () => void;
}

function CCCategoryTableRow({
  category,
  color,
  values,
  columnCount,
  fmtSym,
  email,
  latestDateRange,
  isExpanded,
  onToggle,
}: CCCategoryTableRowProps) {
  return (
    <Box>
      <Box
        onClick={onToggle}
        sx={{
          display: "grid",
          gridTemplateColumns: `170px repeat(${columnCount}, 1fr)`,
          alignItems: "center",
          columnGap: 1.5,
          px: 1.5,
          py: 1.2,
          borderRadius: 1.5,
          cursor: "pointer",
          border: "1px solid",
          borderColor: isExpanded ? color : "divider",
          bgcolor: isExpanded ? `${color}11` : "background.default",
          "&:hover": { bgcolor: isExpanded ? `${color}22` : "action.hover" },
          transition: "all 0.2s ease",
          mb: 0.5,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
          <Box sx={{ color: "text.secondary", display: "flex", alignItems: "center", flexShrink: 0 }}>
            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </Box>
          <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: color, flexShrink: 0 }} />
          <Typography
            sx={{
              fontSize: 13,
              fontWeight: 600,
              color: "text.primary",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={category}
          >
            {category}
          </Typography>
        </Box>

        {values.map((value, idx) => (
          <Typography
            key={idx}
            sx={{
              fontSize: 13,
              fontWeight: 600,
              color: value > 0 ? "text.primary" : "text.disabled",
              textAlign: "right",
            }}
          >
            {value > 0 ? fmtSym(value) : ""}
          </Typography>
        ))}
      </Box>

      {isExpanded && (
        <CCSubCategoryPanel
          email={email}
          category={category}
          dateRange={latestDateRange}
          fmtSym={fmtSym}
          color={color}
        />
      )}
    </Box>
  );
}



/* Period comparison summary card — disabled per request, keeping for possible reuse
interface CCPeriodComparisonProps {
  currentBreakdown: CCEmployeeBreakdownResponse | null;
  prevBreakdown: CCEmployeeBreakdownResponse | null;
  loadingCurrent: boolean;
  loadingPrev: boolean;
  fmtSym: (v: number) => string;
  compLabel: string; //comparison range
  curLabel: string;
}

function CCPeriodComparison({
  currentBreakdown,
  prevBreakdown,
  loadingCurrent,
  loadingPrev,
  fmtSym,
  compLabel,
  curLabel,
}: CCPeriodComparisonProps) {
  const prevLabel = compLabel;
  const prevTitle = "Comparison Range";
  const curTitle = "Current Period";


  const curTotal = currentBreakdown?.totalAmount ?? 0;
  const prevTotal = prevBreakdown?.totalAmount ?? 0;
  const pct = prevTotal > 0 ? ((curTotal - prevTotal) / prevTotal) * 100 : null;

  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography sx={{ fontSize: 12, fontWeight: 700, color: "text.primary", mb: 0.75 }}>
        Period comparison
      </Typography>
      <Box
        sx={{
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
          bgcolor: "background.paper",
          px: 2,
          py: 1.25,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: 9,
              fontWeight: 800,
              color: "text.disabled",
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            {prevTitle}
          </Typography>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: "text.primary", mb: 0.25 }}>
            {prevLabel}
          </Typography>
          {loadingPrev ? (
            <Skeleton variant="text" width={100} height={26} />
          ) : (
            <>
              <Typography
                sx={{ fontSize: 16, fontWeight: 800, color: "text.secondary", lineHeight: 1.2 }}
              >
                {fmtSym(prevTotal)}
              </Typography>
              <Typography sx={{ fontSize: 11, color: "text.secondary", mt: 0.2 }}>
                {prevBreakdown?.txnCount ?? 0} txns
              </Typography>
            </>
          )}
        </Box>

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            minWidth: 100,
            gap: 0.5,
          }}
        >
          {pct === null || pct === 0 ? (
            <Typography sx={{ fontSize: 16, fontWeight: 800, color: "text.disabled" }}>＝</Typography>
          ) : (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.4 }}>
              {pct > 0 ? (
                <TrendingUp size={12} color="#e53935" />
              ) : (
                <TrendingDown size={12} color="#2e7d32" />
              )}
              <Typography
                sx={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: pct > 0 ? "error.main" : "success.main",
                }}
              >
                {pct > 0 ? "+" : ""}
                {pct.toFixed(1)}%
              </Typography>
            </Box>
          )}
          <Typography
            sx={{
              fontSize: 9,
              color: "text.disabled",
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
             vs selected range
          </Typography>
        </Box>

        <Box sx={{ flex: 1, minWidth: 0, textAlign: "right" }}>
          <Typography
            sx={{
              fontSize: 9,
              fontWeight: 800,
              color: "text.disabled",
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            {curTitle}
          </Typography>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: "text.primary", mb: 0.25 }}>
            {curLabel}
          </Typography>
          {loadingCurrent ? (
            <Skeleton variant="text" width={100} height={26} sx={{ ml: "auto" }} />
          ) : (
            <>
              <Typography
                sx={{ fontSize: 16, fontWeight: 800, color: "text.primary", lineHeight: 1.2 }}
              >
                {fmtSym(curTotal)}
              </Typography>
              <Typography sx={{ fontSize: 11, color: "text.secondary", mt: 0.2 }}>
                {currentBreakdown?.txnCount ?? 0} txns
              </Typography>
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
}
*/

export interface CCEmployeeBreakdownModalProps {
  open: boolean;
  onClose: () => void;
  employeeEmail: string | null;
  employeeName: string;
  currency: CurrencyCode;
  dateRange: string;
}

export default function CCEmployeeBreakdownModal({
  open,
  onClose,
  employeeEmail,
  employeeName,
  currency,
  dateRange,
}: CCEmployeeBreakdownModalProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [periodGranularity, setPeriodGranularity] = useState<PeriodGranularity>("Annually");

  const fmtSym = (v: number) => formatWithSymbol(v, currency);

  const currentDateRange = dateRange;
  const periodColumns = generatePeriodColumns(periodGranularity);

  const { breakdown } = useCCEmployeeBreakdown(open ? employeeEmail : null, currentDateRange);

  // Rules-of-hooks safe: PERIOD_COLUMN_COUNT is a fixed constant, so this is always 5 calls.
  const period0 = useCCEmployeeBreakdown(open ? employeeEmail : null, periodColumns[0].dateRange);
  const period1 = useCCEmployeeBreakdown(open ? employeeEmail : null, periodColumns[1].dateRange);
  const period2 = useCCEmployeeBreakdown(open ? employeeEmail : null, periodColumns[2].dateRange);
  const period3 = useCCEmployeeBreakdown(open ? employeeEmail : null, periodColumns[3].dateRange);
  const period4 = useCCEmployeeBreakdown(open ? employeeEmail : null, periodColumns[4].dateRange);
  const periodBreakdowns = [period0, period1, period2, period3, period4];

  useEffect(() => {
    if (open) {
      setExpandedCategory(null);
      setPeriodGranularity("Annually");
    }
  }, [open, employeeEmail]);

  const periodCategoryMaps = periodBreakdowns.map(
    (p) => new Map((p.breakdown?.categories ?? []).map((c) => [c.category, c])),
  );
  const latestCategoryMap = periodCategoryMaps[periodCategoryMaps.length - 1];
  const allCategories = [...new Set(periodCategoryMaps.flatMap((m) => [...m.keys()]))].sort(
    (a, b) => (latestCategoryMap.get(b)?.total ?? 0) - (latestCategoryMap.get(a)?.total ?? 0),
  );
  const anyPeriodLoading = periodBreakdowns.some((p) => p.loading);

  const handleDownload = () => {
    if (!breakdown || !employeeEmail) return;
    exportCCEmployeeBreakdown({
      name: employeeName,
      email: employeeEmail,
      dateRange: currentDateRange,
      currency,
      periodLabels: periodColumns.map((c) => c.label),
      periodTotals: periodBreakdowns.map((p) => ({
        totalAmount: p.breakdown?.totalAmount ?? 0,
        txnCount: p.breakdown?.txnCount ?? 0,
      })),
      categories: allCategories.map((catKey) => ({
        category: catKey,
        percentage: latestCategoryMap.get(catKey)?.percentage ?? 0,
        values: periodCategoryMaps.map((m) => ({
          total: m.get(catKey)?.total ?? 0,
          txnCount: m.get(catKey)?.txnCount ?? 0,
        })),
      })),
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          bgcolor: "background.paper",
          border: "1px solid",
          borderColor: "divider",
          backgroundImage: "none",
        },
      }}
    >
      <Box
        sx={{
          px: 3,
          pt: 1.5,
          pb: 1.5,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Box>
          <Typography sx={{ fontSize: 18, fontWeight: 800, color: "text.primary" }}>
            {employeeName}
          </Typography>
          <Typography sx={{ fontSize: 13, color: "text.disabled", mt: 0.2 }}>
            {employeeEmail}
          </Typography>
          {breakdown && (
            <>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: "text.primary", mt: 0.4 }}>
                Total: {fmtSym(breakdown.totalAmount)}
              </Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#9E9E9E" }}>
                No of Transactions: {breakdown.txnCount}
              </Typography>
            </>
          )}
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box
            onClick={breakdown ? handleDownload : undefined}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.6,
              cursor: breakdown ? "pointer" : "not-allowed",
              px: 2,
              py: 0.7,
              borderRadius: 1.5,
              bgcolor: breakdown ? "primary.main" : "text.disabled",
              color: "#fff",
              opacity: breakdown ? 1 : 0.5,
              fontWeight: 700,
              fontSize: 13,
              textTransform: "uppercase",
              letterSpacing: 0.3,
              transition: "all 0.15s ease",
              "&:hover": breakdown ? { bgcolor: "primary.dark" } : {},
              userSelect: "none",
            }}
          >
            <Download size={14} />
            Export
          </Box>
          <Box
            onClick={onClose}
            sx={{
              cursor: "pointer",
              color: "text.secondary",
              p: 0.5,
              borderRadius: 1,
              "&:hover": { bgcolor: "action.hover", color: "text.primary" },
            }}
          >
            <X size={20} />
          </Box>
        </Box>
      </Box>

      <DialogContent sx={{ p: 2.5 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 3,
            mb: 2,
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          {PERIOD_GRANULARITIES.map((granularity) => (
            <Box
              key={granularity}
              onClick={() => setPeriodGranularity(granularity)}
              sx={{
                pb: 1,
                cursor: "pointer",
                borderBottom: "2px solid",
                borderColor: periodGranularity === granularity ? "primary.main" : "transparent",
              }}
            >
              <Typography
                sx={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: periodGranularity === granularity ? "primary.main" : "text.secondary",
                }}
              >
                {granularity}
              </Typography>
            </Box>
          ))}
        </Box>

        <Typography sx={{ fontSize: 14, fontWeight: 700, color: "text.primary", mb: 1 }}>
          Spend breakdown by engagement category
        </Typography>

        {anyPeriodLoading ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 380,
              gap: 1.5,
            }}
          >
            <CircularProgress size={36} />
            <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
              Loading breakdown data...
            </Typography>
          </Box>
        ) : (
          <>
            {allCategories.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 6 }}>
                <Typography sx={{ color: "text.disabled", fontSize: 14 }}>
                  No card transaction data found for this period
                </Typography>
              </Box>
            ) : (
              <>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: `170px repeat(${periodColumns.length}, 1fr)`,
                    columnGap: 1.5,
                    px: 1.5,
                    pb: 0.5,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    mb: 0.5,
                  }}
                >
                  <Box />
                  {periodColumns.map((col) => (
                    <Typography
                      key={col.label}
                      sx={{
                        fontSize: 13,
                        fontWeight: 800,
                        color: "text.disabled",
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                        textAlign: "right",
                      }}
                    >
                      {col.label}
                    </Typography>
                  ))}
                </Box>
                <Box
                  sx={{
                    maxHeight: 460,
                    overflowY: "auto",
                    pr: 0.5,
                    "&::-webkit-scrollbar": { width: 4 },
                    "&::-webkit-scrollbar-track": { bgcolor: "action.hover", borderRadius: 2 },
                    "&::-webkit-scrollbar-thumb": { bgcolor: "text.disabled", borderRadius: 2 },
                  }}
                >
                  {allCategories.map((catKey, i) => (
                    <CCCategoryTableRow
                      key={catKey}
                      category={catKey}
                      color={SEGMENT_COLORS[i % SEGMENT_COLORS.length]}
                      values={periodCategoryMaps.map((m) => m.get(catKey)?.total ?? 0)}
                      columnCount={periodColumns.length}
                      email={employeeEmail ?? ""}
                      latestDateRange={periodColumns[periodColumns.length - 1].dateRange}
                      fmtSym={fmtSym}
                      isExpanded={expandedCategory === catKey}
                      onToggle={() =>
                        setExpandedCategory((prev) => (prev === catKey ? null : catKey))
                      }
                    />
                  ))}
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: `170px repeat(${periodColumns.length}, 1fr)`,
                      columnGap: 1.5,
                      alignItems: "center",
                      px: 1.5,
                      py: 1.2,
                      mt: 0.5,
                      borderTop: "2px solid",
                      borderColor: "divider",
                    }}
                  >
                    <Typography sx={{ fontSize: 13, fontWeight: 800, color: "text.primary" }}>
                      Total
                    </Typography>
                    {periodBreakdowns.map((p, idx) => (
                      <Typography
                        key={idx}
                        sx={{ fontSize: 13, fontWeight: 800, color: "text.primary", textAlign: "right" }}
                      >
                        {fmtSym(p.breakdown?.totalAmount ?? 0)}
                      </Typography>
                    ))}
                  </Box>
                </Box>
              </>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}


