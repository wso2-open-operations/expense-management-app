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

import SideCountCard from "@component/card/SideCountCard";
import SummaryCard from "@component/card/SummaryCard";
import ChartPeriodFilter from "@component/chart/ChartPeriodFilter";
import PaginationBar from "@component/common/PaginationBar";
import { CC_DATE_RANGE_OPTIONS } from "@config/constant";
import { useMyOpdSummary } from "@slices/expenseSlice/useMyExpense";
import { formatWithSymbol } from "@utils/currency";

const OPD_CLAIM_LIMIT = 40000;
const PAGE_SIZE = 3;

const STATUS_COLORS: Record<string, string> = {
  Approved: "#2E8B57",
  Pending: "#f97316",
  Rejected: "#ef4444",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const DATE_RANGE_OPTIONS = CC_DATE_RANGE_OPTIONS.map((o) => ({ value: o.value, label: o.label }));

function filterClaimsByRange(claims: OpdClaim[], range: string): OpdClaim[] {
  const now = new Date();
  switch (range) {
    case "This Month": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return claims.filter((c) => new Date(c.date) >= start);
    }
    case "Last Month": {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return claims.filter((c) => { const d = new Date(c.date); return d >= start && d <= end; });
    }
    case "Last 3 Months": {
      const cutoff = new Date(now); cutoff.setMonth(cutoff.getMonth() - 3);
      return claims.filter((c) => new Date(c.date) >= cutoff);
    }
    case "Last 6 Months": {
      const cutoff = new Date(now); cutoff.setMonth(cutoff.getMonth() - 6);
      return claims.filter((c) => new Date(c.date) >= cutoff);
    }
    case "Last Year": {
      const cutoff = new Date(now); cutoff.setFullYear(cutoff.getFullYear() - 1);
      return claims.filter((c) => new Date(c.date) >= cutoff);
    }
    default:
      return claims;
  }
}

interface OpdClaim {
  id: string;
  description: string;
  date: string;
  amount: number;
  status: string;
  hospital: string;
  submittedDate: string;
  processedDate?: string | null;
}

const MOCK_CLAIMS: OpdClaim[] = [
  { id: "OPD-2026-001", description: "General Consultation", date: "2026-02-15", amount: 8500, status: "Approved", hospital: "Nawaloka Hospital", submittedDate: "2026-02-16", processedDate: "2026-02-18" },
  { id: "OPD-2026-002", description: "Specialist Consultation", date: "2026-04-08", amount: 12500, status: "Approved", hospital: "Asiri Medical Center", submittedDate: "2026-04-09", processedDate: "2026-04-12" },
  { id: "OPD-2026-003", description: "Pharmacy — Prescribed Medication", date: "2026-04-20", amount: 2700, status: "Approved", hospital: "Osu Sala Pharmacy", submittedDate: "2026-04-21", processedDate: "2026-04-24" },
  { id: "OPD-2026-004", description: "Laboratory Tests", date: "2026-05-10", amount: 15200, status: "Pending", hospital: "Durdans Hospital", submittedDate: "2026-05-11", processedDate: null },
  { id: "OPD-2026-005", description: "Physiotherapy Session", date: "2026-05-22", amount: 3600, status: "Pending", hospital: "Hemas Hospital Wattala", submittedDate: "2026-05-23", processedDate: null },
];

function claimMonth(c: OpdClaim): string {
  return MONTHS[new Date(c.date).getMonth()];
}

export default function MyOpdClaims() {
  const [dateRange, setDateRange] = useState("All Time");
  const [page, setPage] = useState(0);

  const currentYear = new Date().getFullYear();
  const currentMonthIdx = new Date().getMonth();
  const currentMonthShort = MONTHS[currentMonthIdx];
  const prevMonthShort = MONTHS[(currentMonthIdx + 11) % 12];

  const { loading } = useMyOpdSummary(currentYear);
  const fmtSym = (v: number) => formatWithSymbol(v, "LKR");

  const USE_MOCK = true;
  const claims = USE_MOCK ? MOCK_CLAIMS : [];

  const yearTotal = claims.reduce((s, c) => s + c.amount, 0);
  const approvedClaims = claims.filter((c) => c.status === "Approved");
  const pendingClaims = claims.filter((c) => c.status === "Pending");

  const thisMonthTotal = claims.filter((c) => claimMonth(c) === currentMonthShort).reduce((s, c) => s + c.amount, 0);
  const prevMonthTotal = claims.filter((c) => claimMonth(c) === prevMonthShort).reduce((s, c) => s + c.amount, 0);
  const monthTrend = prevMonthTotal > 0 ? Math.round(((thisMonthTotal - prevMonthTotal) / prevMonthTotal) * 100) : 0;

  const filteredClaims = filterClaimsByRange(claims, dateRange);
  const filteredTotal = filteredClaims.reduce((s, c) => s + c.amount, 0);
  const filteredApproved = filteredClaims.filter((c) => c.status === "Approved").reduce((s, c) => s + c.amount, 0);
  const filteredPending = filteredClaims.filter((c) => c.status === "Pending").reduce((s, c) => s + c.amount, 0);

  const totalPages = Math.ceil(filteredClaims.length / PAGE_SIZE);
  const paginatedClaims = filteredClaims.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <Box
      sx={{
        p: 2,
        bgcolor: "background.default",
        height: "100%",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
      }}
    >
      {/* Top row — 3 summary cards */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" }, gap: 2, flexShrink: 0 }}>
        {loading ? (
          [...Array(3)].map((_, i) => (
            <Skeleton key={i} variant="rectangular" height={130} sx={{ borderRadius: 1 }} />
          ))
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
              value={String(claims.length)}
              trend={`${OPD_CLAIM_LIMIT.toLocaleString()} limit`}
              trendVariant="positive"
              trendLabel="Annual OPD limit"
              footerRight={String(pendingClaims.length)}
              footerRightLabel="Pending Claims"
            />
          </>
        )}
      </Box>

      {/* Bottom row — claim summary (3fr) + side cards (1fr) */}
      <Box
        sx={{
          mt: 2,
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 4fr) minmax(220px, 1fr)" },
          gap: 2,
          alignItems: "stretch",
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* Claim Summary panel */}
        <Box
          sx={{
            p: 2.5,
            borderRadius: 1,
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
            display: "flex",
            flexDirection: "column",
            gap: 2,
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          {/* Header row */}
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1, flexShrink: 0 }}>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: 16, color: "text.primary", lineHeight: 1.3 }}>
                Claim Summary
              </Typography>
              <Typography sx={{ fontSize: 12, color: "text.disabled", mt: 0.3 }}>
                All submitted OPD claims
              </Typography>
            </Box>
            <ChartPeriodFilter
              value={dateRange}
              options={DATE_RANGE_OPTIONS}
              onChange={(v) => { setDateRange(v); setPage(0); }}
            />
          </Box>

          {loading ? (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} variant="rectangular" height={64} sx={{ borderRadius: 1 }} />
              ))}
            </Box>
          ) : (
            <>
              {/* Period stats strip */}
              {filteredClaims.length > 0 && (
                <Box
                  sx={{
                    display: "flex",
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 2,
                    bgcolor: "background.paper",
                    overflow: "hidden",
                    flexShrink: 0,
                  }}
                >
                  {[
                    { label: "Total", amount: filteredTotal, count: filteredClaims.length, color: "text.primary" },
                    { label: "Approved", amount: filteredApproved, count: filteredClaims.filter((c) => c.status === "Approved").length, color: STATUS_COLORS.Approved },
                    { label: "Pending", amount: filteredPending, count: filteredClaims.filter((c) => c.status === "Pending").length, color: STATUS_COLORS.Pending },
                  ].map((col, i) => (
                    <Box
                      key={col.label}
                      sx={{
                        flex: 1,
                        px: 2,
                        py: 0.75,
                        textAlign: i === 0 ? "left" : i === 1 ? "center" : "right",
                        borderRight: i < 2 ? "1px solid" : "none",
                        borderColor: "divider",
                      }}
                    >
                      <Typography sx={{ fontSize: 9, fontWeight: 800, color: col.color, textTransform: "uppercase", letterSpacing: 1, mb: 0.3 }}>
                        {col.label}
                      </Typography>
                      <Typography sx={{ fontSize: 16, fontWeight: 800, color: "text.primary", lineHeight: 1.2 }}>
                        {fmtSym(col.amount)}
                      </Typography>
                      <Typography sx={{ fontSize: 11, color: "text.secondary", mt: 0.2 }}>
                        {col.count} claim{col.count !== 1 ? "s" : ""}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}

              {filteredClaims.length === 0 ? (
                <Box sx={{ py: 5, textAlign: "center", flexShrink: 0 }}>
                  <Typography sx={{ color: "text.disabled", fontSize: 13 }}>
                    No claims in this period
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1, flex: 1, minHeight: 0, overflowY: "auto" }}>
                  {paginatedClaims.map((claim) => {
                    const color = STATUS_COLORS[claim.status] ?? "#9e9e9e";
                    return (
                      <Box
                        key={claim.id}
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          px: 2,
                          py: 1.5,
                          borderRadius: 1,
                          border: "1px solid",
                          borderColor: "divider",
                          transition: "all 0.15s",
                          "&:hover": { bgcolor: "action.hover", borderColor: "primary.main" },
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
                          <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: color, flexShrink: 0 }} />
                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontSize: 13, fontWeight: 600, color: "text.primary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {claim.description}
                            </Typography>
                            <Typography sx={{ fontSize: 11, color: "text.disabled", mt: 0.2 }}>
                              {claim.hospital} · {claim.date}
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ textAlign: "right", flexShrink: 0, ml: 2 }}>
                          <Typography sx={{ fontSize: 14, fontWeight: 700, color: "text.primary" }}>
                            {fmtSym(claim.amount)}
                          </Typography>
                          <Typography sx={{ fontSize: 11, fontWeight: 700, color, mt: 0.2 }}>
                            {claim.status}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              )}
              {totalPages > 1 && (
                <PaginationBar page={page} totalPages={totalPages} onPageChange={setPage} />
              )}
            </>
          )}
        </Box>

        {/* Side cards */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, height: "100%" }}>
          <SideCountCard
            title="APPROVED"
            value={String(approvedClaims.length)}
            subtitle="Claims"
            period="This Year"
          />
          <SideCountCard
            title="PENDING"
            value={String(pendingClaims.length)}
            subtitle="Claims"
            period="This Year"
          />
        </Box>
      </Box>
    </Box>
  );
}
