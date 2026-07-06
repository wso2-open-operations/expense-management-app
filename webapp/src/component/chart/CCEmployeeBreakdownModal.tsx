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
import { Box, CircularProgress, Skeleton, Typography, Dialog, DialogContent } from "@wso2/oxygen-ui";
import { Download, ChevronDown, ChevronRight, TrendingDown, TrendingUp, X } from "lucide-react";

import React, { useEffect, useState } from "react";

import {
  type CCEmployeeBreakdownResponse,
  useCCEmployeeBreakdown,
  useCCEmployeeCategoryTransactions,
} from "@slices/creditCardSlice/useCreditCards";
import { type CurrencyCode, formatWithSymbol } from "@utils/currency";
import { exportCCEmployeeBreakdown } from "@utils/exportExcel";

const SEGMENT_COLORS = [
  "#00B4D8",
  "#FF8A4C",
  "#F4B400",
  "#2E8B57",
  "#AB7AE0",
  "#8C9EFF",
  "#00A6A6",
  "#E85D75",
  "#FF6B9D",
  "#4A8EDB",
  "#90EE90",
  "#DA70D6",
];

function formatMonthLabel(ym: string): string {
  const [y, m] = ym.slice(0, 7).split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function getDefaultCompDate(): string {
  const now = new Date();
  const pm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${pm.getFullYear()}-${String(pm.getMonth() + 1).padStart(2, "0")}-01`;
}

interface CCSubCategoryPanelProps {
  email: string;
  category: string;
  dateRange: string;
  compDateRange: string;
  fmtSym: (v: number) => string;
  color: string;
}

function CCSubCategoryPanel({
  email,
  category,
  dateRange,
  compDateRange,
  fmtSym,
  color,
}: CCSubCategoryPanelProps) {
  const { transactions: curTxns, loading: curLoading } = useCCEmployeeCategoryTransactions(
    email,
    category,
    dateRange,
  );
  const { transactions: cmpTxns, loading: cmpLoading } = useCCEmployeeCategoryTransactions(
    email,
    category,
    compDateRange,
  );

  const curMap = new Map<string, number>();
  curTxns.forEach((t) => curMap.set(t.description, (curMap.get(t.description) ?? 0) + t.amount));

  const cmpMap = new Map<string, number>();
  cmpTxns.forEach((t) => cmpMap.set(t.description, (cmpMap.get(t.description) ?? 0) + t.amount));

  const allDescs = [...new Set([...curMap.keys(), ...cmpMap.keys()])].sort();

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
      {curLoading || cmpLoading ? (
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
          const cur = curMap.get(desc) ?? 0;
          const cmp = cmpMap.get(desc) ?? 0;
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
                  fontWeight: 600,
                  color: cmp > 0 ? "text.secondary" : "text.disabled",
                  minWidth: 110,
                  textAlign: "right",
                  flexShrink: 0,
                }}
              >
                {cmp > 0 ? fmtSym(cmp) : "—"}
              </Typography>
              <Typography
                sx={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: cur > 0 ? "text.primary" : "text.disabled",
                  minWidth: 110,
                  textAlign: "right",
                  flexShrink: 0,
                }}
              >
                {cur > 0 ? fmtSym(cur) : "—"}
              </Typography>
            </Box>
          );
        })
      )}
    </Box>
  );
}

interface CCCategoryRowProps {
  category: string;
  total: number;
  txnCount: number;
  percentage: number;
  color: string;
  maxTotal: number;
  compTotal: number;
  compTxnCount: number;
  maxCompTotal: number;
  email: string;
  dateRange: string;
  compDateRange: string;
  fmtSym: (v: number) => string;
  isExpanded: boolean;
  onToggle: () => void;
}

function CCCategoryRow({
  category,
  total,
  txnCount,
  percentage,
  color,
  maxTotal,
  compTotal,
  compTxnCount,
  maxCompTotal,
  email,
  dateRange,
  compDateRange,
  fmtSym,
  isExpanded,
  onToggle,
}: CCCategoryRowProps) {
  const curBarW = maxTotal > 0 ? Math.min(100, (total / maxTotal) * 100) : 0;
  const cmpBarW = maxCompTotal > 0 ? Math.min(100, (compTotal / maxCompTotal) * 100) : 0;

  return (
    <Box>
      <Box
        onClick={onToggle}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
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
        <Box sx={{ color: "text.secondary", display: "flex", alignItems: "center" }}>
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </Box>

        <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: color, flexShrink: 0 }} />

        <Typography
          sx={{
            fontSize: 13,
            fontWeight: 600,
            color: "text.primary",
            width: 130,
            maxWidth: 130,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
          title={category}
        >
          {category}
        </Typography>

        <Box sx={{ flex: 1, mx: 1.5, position: "relative", height: 10 }}>
          <Box sx={{ position: "absolute", inset: 0, bgcolor: "action.hover", borderRadius: 5 }} />
          <Box
            sx={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 0,
              width: `${cmpBarW}%`,
              bgcolor: color,
              opacity: 0.3,
              borderRadius: 5,
              transition: "width 0.4s ease",
            }}
          />
          <Box
            sx={{
              position: "absolute",
              top: 2,
              bottom: 2,
              left: 0,
              width: `${curBarW}%`,
              bgcolor: color,
              borderRadius: 5,
              transition: "width 0.4s ease",
            }}
          />
        </Box>

        <Box sx={{ display: "flex", gap: 2, flexShrink: 0 }}>
          <Box sx={{ textAlign: "right", minWidth: 110 }}>
            <Typography
              sx={{
                fontSize: 13,
                fontWeight: 700,
                color: compTotal > 0 ? "text.primary" : "text.disabled",
              }}
            >
              {compTotal > 0 ? fmtSym(compTotal) : "—"}
            </Typography>
            <Typography sx={{ fontSize: 11, color: "text.disabled" }}>
              {compTxnCount > 0 ? `${compTxnCount} txns` : ""}
            </Typography>
          </Box>
          <Box sx={{ textAlign: "right", minWidth: 110 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: "text.primary" }}>
              {fmtSym(total)}
            </Typography>
            <Typography sx={{ fontSize: 11, color: "text.disabled" }}>
              {txnCount} txns • {percentage.toFixed(1)}%
            </Typography>
          </Box>
        </Box>
      </Box>

      {isExpanded && (
        <CCSubCategoryPanel
          email={email}
          category={category}
          dateRange={dateRange}
          compDateRange={compDateRange}
          fmtSym={fmtSym}
          color={color}
        />
      )}
    </Box>
  );
}



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
  const [compFromDate, setCompFromDate] = useState(getDefaultCompDate);
  const [compToDate, setCompToDate] = useState(getDefaultCompDate);

  const fmtSym = (v: number) => formatWithSymbol(v, currency);

  const currentDateRange = dateRange;
                         // month and a year not a specific day
  const compDateRange = `custom:${compFromDate.slice(0, 7)}:${compToDate.slice(0, 7)}`;
  const compLabel = compFromDate.slice(0, 7) === compToDate.slice(0, 7)
    ? formatMonthLabel(compFromDate)
    : `${formatMonthLabel(compFromDate)} – ${formatMonthLabel(compToDate)}`;
  const curLabel = dateRange.startsWith("custom:")
    ? (() => { const p = dateRange.slice(7).split(":"); return p.length === 2 ? `${formatMonthLabel(p[0])} – ${formatMonthLabel(p[1])}` : dateRange; })()
    : dateRange;


  const { breakdown, loading } = useCCEmployeeBreakdown(open ? employeeEmail : null, currentDateRange);
  const { breakdown: compBreakdown, loading: loadingComp } = useCCEmployeeBreakdown(
    open ? employeeEmail : null,
    compDateRange,
  );

  useEffect(() => {
    if (open) {
      setExpandedCategory(null);
      setCompFromDate(getDefaultCompDate());
      setCompToDate(getDefaultCompDate());
    }
  }, [open, employeeEmail]);

  const currentMap = new Map((breakdown?.categories ?? []).map((c) => [c.category, c]));
  const compMap = new Map((compBreakdown?.categories ?? []).map((c) => [c.category, c]));
  // Merge categories from both periods so all categories show regardless of which period has data
  
  const allCategories = [...new Set([...currentMap.keys(), ...compMap.keys()])];
  const maxCurrent = breakdown ? Math.max(...breakdown.categories.map((c) => c.total), 1) : 1;
  const maxComp = compBreakdown ? Math.max(...compBreakdown.categories.map((c) => c.total), 1) : 1;

  const handleDownload = () => {
    if (!breakdown || !employeeEmail) return;
    exportCCEmployeeBreakdown({
      name: employeeName,
      email: employeeEmail,
      dateRange: currentDateRange,
      currency,
      compLabel,
      totalAmount: breakdown.totalAmount,
      txnCount: breakdown.txnCount,
      prevTotalAmount: compBreakdown?.totalAmount ?? 0,
      prevTxnCount: compBreakdown?.txnCount ?? 0,
      categories: breakdown.categories.map((cat) => {
        const cmp = compMap.get(cat.category);
        return {
          category: cat.category,
          total: cat.total,
          txnCount: cat.txnCount,
          percentage: cat.percentage,
          compTotal: cmp?.total ?? 0,
          compTxnCount: cmp?.txnCount ?? 0,
        };
      }),
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
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: "text.primary", mt: 0.4 }}>
              Total: {fmtSym(breakdown.totalAmount)}
            </Typography>
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
              px: 1.5,
              py: 0.55,
              borderRadius: "20px",
              border: "1.5px solid",
              borderColor: breakdown ? "warning.main" : "text.disabled",
              color: breakdown ? "warning.main" : "text.disabled",
              opacity: breakdown ? 1 : 0.5,
              fontWeight: 700,
              fontSize: 13,
              transition: "all 0.15s ease",
              "&:hover": breakdown ? { bgcolor: "warning.main", color: "#fff" } : {},
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
        <Typography sx={{ fontSize: 14, fontWeight: 700, color: "text.primary", mb: 1 }}>
          Spend breakdown by engagement category
        </Typography>

        {loading ? (
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
            <CCPeriodComparison
              currentBreakdown={breakdown}
              prevBreakdown={compBreakdown}
              loadingCurrent={loading}
              loadingPrev={loadingComp}
              fmtSym={fmtSym}
              compLabel={compLabel}
              curLabel={curLabel}
            />

            <Box sx={{ mb: 1.5, p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 2, bgcolor: "background.paper" }}>
              <Typography sx={{ fontSize: 10, fontWeight: 800, color: "text.disabled", textTransform: "uppercase", letterSpacing: 1, mb: 1 }}>
                Date Range
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.4 }}>
                  <Typography sx={{ fontSize: 10, color: "text.disabled" }}>From</Typography>
                  <Box
                    component="input"
                    type="date"
                    value={compFromDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCompFromDate(e.target.value)}
                    sx={{
                      bgcolor: "background.default",
                      border: "1px solid",
                      borderColor: "text.disabled",
                      borderRadius: "20px",
                      px: 1.5,
                      py: 0.75,
                      color: "text.primary",
                      fontSize: 13,
                      outline: "none",
                      colorScheme: "dark",
                      cursor: "pointer",
                      width: 140,
                      "&:focus": { borderColor: "primary.main", outline: "none" },
                    }}
                  />
                </Box>
                <Typography sx={{ color: "text.disabled", mt: 2 }}>→</Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.4 }}>
                  <Typography sx={{ fontSize: 10, color: "text.disabled" }}>To</Typography>
                  <Box
                    component="input"
                    type="date"
                    value={compToDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCompToDate(e.target.value)}
                    sx={{
                      bgcolor: "background.default",
                      border: "1px solid",
                      borderColor: "text.disabled",
                      borderRadius: "20px",
                      px: 1.5,
                      py: 0.75,
                      color: "text.primary",
                      fontSize: 13,
                      outline: "none",
                      colorScheme: "dark",
                      cursor: "pointer",
                      width: 140,
                      "&:focus": { borderColor: "primary.main", outline: "none" },
                    }}
                  />
                </Box>
              </Box>
            </Box>

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
                    display: "flex",
                    alignItems: "center",
                    pl: 1.5,
                    pr: 2,
                    pb: 0.5,
                    gap: 1.5,
                  }}
                >
                  <Box sx={{ flex: 1 }} />
                  <Box sx={{ display: "flex", gap: 2, flexShrink: 0, alignItems: "center" }}>
                    <Box
                      sx={{
                        minWidth: 110,
                        textAlign: "right",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-end",
                        gap: 0.5,
                      }}
                    >
                      {loadingComp && <CircularProgress size={10} thickness={5} />}
                      <Typography
                        sx={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: "text.disabled",
                          textTransform: "uppercase",
                          letterSpacing: 0.5,
                        }}
                      >
                        Date Range
                      </Typography>
                    </Box>
                    <Typography
                      sx={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: "text.disabled",
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                        minWidth: 110,
                        textAlign: "right",
                      }}
                    >
                      This Period
                    </Typography>
                  </Box>
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
                  {allCategories.map((catKey, i) => {
                    const cur = currentMap.get(catKey);
                    const cmp = compMap.get(catKey);
                    return (
                      <CCCategoryRow
                        key={catKey}
                        category={catKey}
                        total={cur?.total ?? 0}
                        txnCount={cur?.txnCount ?? 0}
                        percentage={cur?.percentage ?? 0}
                        color={SEGMENT_COLORS[i % SEGMENT_COLORS.length]}
                        maxTotal={maxCurrent}
                        compTotal={cmp?.total ?? 0}
                        compTxnCount={cmp?.txnCount ?? 0}
                        maxCompTotal={maxComp}
                        email={employeeEmail ?? ""}
                        dateRange={currentDateRange}
                        compDateRange={compDateRange}
                        fmtSym={fmtSym}
                        isExpanded={expandedCategory === catKey}
                        onToggle={() =>
                          setExpandedCategory((prev) =>
                            prev === catKey ? null : catKey,
                          )
                        }
                      />
                    );
                  })}
                </Box>
              </>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}


