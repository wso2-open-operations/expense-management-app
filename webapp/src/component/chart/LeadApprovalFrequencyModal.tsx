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
import { Box, Skeleton, Typography, Dialog, DialogContent } from "@wso2/oxygen-ui";
import {
  ChevronDown,
  ChevronRight,
  Download,
  Search,
  X,
} from "lucide-react";

import { useEffect, useMemo, useState } from "react";

import ChartPeriodFilter from "@component/chart/ChartPeriodFilter";
import {
  type LeadApprovedClaim,
  calcDaysBetween,
  formatResponseTime,
  useLeadApprovalDetail,
} from "@slices/expenseSlice/useLeadApprovalFrequency";
import {
  DATE_RANGE_TO_PERIOD,
  MONTH_OPTIONS,
  PERIOD_TO_DATE_RANGE,
} from "@config/constant";
import { LEAD_CLAIMS_COLS } from "@config/exportLabels";
import { type CurrencyCode, CURRENCIES, formatWithSymbol } from "@utils/currency";
import { exportLeadApprovals } from "@utils/exportExcel";

type TabId = "summary" | "claims";

const TABS: { id: TabId; label: string }[] = [
  { id: "summary", label: "Summary" },
  { id: "claims", label: "Claims" },
];

const CATEGORY_COLORS = [
  "#E8420A", "#1976D2", "#2E7D32", "#7B1FA2", "#F57C00",
  "#0288D1", "#388E3C", "#C62828", "#5C6BC0", "#00838F",
];

function DelayChip({ days }: { days: number | null }) {
  if (days === null)
    return <Typography sx={{ fontSize: 12, color: "text.disabled" }}>—</Typography>;
  const color = days <= 1 ? "#2E7D32" : days <= 3 ? "#F4B400" : "#C62828";
  const bg = days <= 1 ? "#E8F5E9" : days <= 3 ? "#FFF8E1" : "#FFEBEE";
  return (
    <Box sx={{ px: 0.75, py: 0.2, borderRadius: 1, bgcolor: bg, display: "inline-block" }}>
      <Typography sx={{ fontSize: 11, fontWeight: 700, color, whiteSpace: "nowrap" }}>
        {days === 0 ? "Same day" : `${days}d`}
      </Typography>
    </Box>
  );
}

const TABLE_COLS = LEAD_CLAIMS_COLS.filter((c) => c.key !== "status");

function ClaimsTable({ claims, fmtSym }: { claims: LeadApprovedClaim[]; fmtSym: (v: number) => string }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return claims;
    return claims.filter(
      (c) =>
        c.employeeName.toLowerCase().includes(q) ||
        (c.claimId ?? "").toLowerCase().includes(q) ||
        (c.category ?? "").toLowerCase().includes(q),
    );
  }, [claims, search]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <Box
        sx={{
          display: "flex", alignItems: "center", gap: 1,
          px: 1.5, py: 0.75, mb: 1,
          border: "1px solid", borderColor: "divider", borderRadius: 1.5,
          bgcolor: "background.paper", flexShrink: 0,
        }}
      >
        <Search size={14} style={{ color: "var(--mui-palette-text-disabled, #888)", flexShrink: 0 }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by employee, claim ID, or category..."
          style={{ border: "none", outline: "none", background: "transparent", fontSize: 13, color: "inherit", width: "100%" }}
        />
      </Box>

      <Box
        sx={{
          flex: 1, display: "flex", flexDirection: "column", minHeight: 0,
          border: "1px solid", borderColor: "divider", borderRadius: 1.5, overflow: "hidden",
        }}
      >
        <Box
          sx={{
            display: "flex", px: 2, py: 0.85,
            bgcolor: "action.hover", borderBottom: "1px solid", borderColor: "divider", flexShrink: 0,
          }}
        >
          {TABLE_COLS.map((col, idx) => (
            <Typography key={col.label} sx={{ flex: col.flex, fontSize: 10, fontWeight: 700, color: "text.disabled", textTransform: "uppercase", letterSpacing: 0.6, minWidth: 0, pr: idx < TABLE_COLS.length - 1 ? 1 : 0 }}>
              {col.label}
            </Typography>
          ))}
        </Box>

        <Box sx={{ flex: 1, overflowY: "auto", "&::-webkit-scrollbar": { width: 4 }, "&::-webkit-scrollbar-track": { bgcolor: "action.hover", borderRadius: 2 }, "&::-webkit-scrollbar-thumb": { bgcolor: "text.disabled", borderRadius: 2 } }}>
          {filtered.length === 0 ? (
            <Box sx={{ py: 5, textAlign: "center" }}>
              <Typography sx={{ fontSize: 13, color: "text.disabled" }}>No claims found</Typography>
            </Box>
          ) : (
            filtered.map((claim, idx) => {
              const delay = calcDaysBetween(claim.submittedDate, claim.approvedDate);
              const isLast = idx === filtered.length - 1;
              return (
                <Box
                  key={claim.claimId ?? idx}
                  sx={{ display: "flex", alignItems: "center", px: 2, py: 0.9, borderBottom: isLast ? "none" : "1px solid", borderColor: "divider", "&:hover": { bgcolor: "action.hover" }, transition: "background 0.12s" }}
                >
                  <Box sx={{ flex: 1.4, minWidth: 0, pr: 1 }}>
                    <Typography title={claim.employeeName} sx={{ fontSize: 13, fontWeight: 600, color: "text.primary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {claim.employeeName}
                    </Typography>
                    {claim.claimId && <Typography sx={{ fontSize: 10, color: "text.disabled" }}>{claim.claimId}</Typography>}
                  </Box>

                  <Typography title={claim.subCategory ?? claim.claimType} sx={{ flex: 1.5, fontSize: 12, color: "text.primary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", pr: 1 }}>
                    {claim.subCategory ?? claim.claimType}
                  </Typography>

                  <Typography title={claim.category ?? undefined} sx={{ flex: 1, fontSize: 12, color: "text.secondary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", pr: 1 }}>
                    {claim.category ?? "—"}
                  </Typography>
                  <Typography sx={{ flex: 0.9, fontSize: 13, fontWeight: 700, color: "text.primary", pr: 1 }}>{fmtSym(claim.amount)}</Typography>
                  <Typography sx={{ flex: 0.9, fontSize: 11, color: "text.secondary", pr: 1 }}>
                    {claim.submittedDate ? new Date(claim.submittedDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—"}
                  </Typography>
                  <Typography sx={{ flex: 0.9, fontSize: 11, color: "text.secondary", pr: 1 }}>
                    {claim.approvedDate ? new Date(claim.approvedDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—"}
                  </Typography>
                  <Box sx={{ flex: 0.65 }}><DelayChip days={delay} /></Box>
                </Box>
              );
            })
          )}
        </Box>
      </Box>

      {filtered.length > 0 && (
        <Typography sx={{ fontSize: 11, color: "text.disabled", mt: 0.75, textAlign: "right", flexShrink: 0 }}>
          {filtered.length} claim{filtered.length !== 1 ? "s" : ""}
        </Typography>
      )}
    </Box>
  );
}

export interface LeadApprovalFrequencyModalProps {
  open: boolean;
  onClose: () => void;
  leadEmail: string | null;
  leadName: string;
  dateRange: string;
  currency: CurrencyCode;
}

export default function LeadApprovalFrequencyModal({
  open,
  onClose,
  leadEmail,
  leadName,
  dateRange,
  currency,
}: LeadApprovalFrequencyModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>("summary");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [localPeriod, setLocalPeriod] = useState<string>(DATE_RANGE_TO_PERIOD[dateRange] ?? "all");

  const localDateRange = PERIOD_TO_DATE_RANGE[localPeriod] ?? dateRange;

  const { detail, loading, error } = useLeadApprovalDetail(open ? leadEmail : null, localDateRange);

  useEffect(() => {
    if (open) {
      setActiveTab("summary");
      setExpandedCategories(new Set());
      setLocalPeriod(DATE_RANGE_TO_PERIOD[dateRange] ?? "all");
    }
  }, [open, leadEmail, dateRange]);

  const toggleCategory = (type: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const fmtSym = (v: number) => formatWithSymbol(v, currency);

  const employeeBreakdown = useMemo(() => {
    if (!detail?.claims?.length) return [];
    const map = new Map<string, { count: number; amount: number }>();
    detail.claims.forEach((c) => {
      const prev = map.get(c.employeeName) ?? { count: 0, amount: 0 };
      map.set(c.employeeName, { count: prev.count + 1, amount: prev.amount + c.amount });
    });
    return Array.from(map.entries())
      .map(([name, d]) => ({ name, count: d.count, amount: d.amount }))
      .sort((a, b) => b.count - a.count);
  }, [detail]);

  const categoryBreakdown = useMemo(() => {
    if (!detail?.claims?.length) return [];
    const mainMap = new Map<string, { totalAmount: number; count: number; subs: Map<string, { totalAmount: number; count: number }> }>();
    detail.claims.forEach((c) => {
      const main = c.claimType;
      const sub = c.subCategory || c.claimType;
      const mainEntry = mainMap.get(main) ?? { totalAmount: 0, count: 0, subs: new Map() };
      mainEntry.totalAmount += c.amount;
      mainEntry.count += 1;
      const subEntry = mainEntry.subs.get(sub) ?? { totalAmount: 0, count: 0 };
      subEntry.totalAmount += c.amount;
      subEntry.count += 1;
      mainEntry.subs.set(sub, subEntry);
      mainMap.set(main, mainEntry);
    });
    return Array.from(mainMap.entries())
      .map(([type, data]) => ({
        type,
        totalAmount: data.totalAmount,
        count: data.count,
        subCategories: Array.from(data.subs.entries())
          .map(([name, d]) => ({ name, totalAmount: d.totalAmount, count: d.count }))
          .sort((a, b) => b.totalAmount - a.totalAmount),
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);
  }, [detail]);

  const totalAmount = useMemo(
    () => detail?.claims?.reduce((sum, c) => sum + c.amount, 0) ?? 0,
    [detail],
  );
  const grandTotal = totalAmount > 0 ? totalAmount : 1;

  const freqLabel = detail ? formatResponseTime(detail.avgResponseDays) : null;

  const lastDate = detail?.lastApprovedDate
    ? new Date(detail.lastApprovedDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : null;

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
          height: "88vh",
          maxHeight: "88vh",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      <Box
        sx={{
          px: 3, pt: 2, pb: 0,
          display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        }}
      >
        <Box>
          <Typography sx={{ fontSize: 20, fontWeight: 800, color: "text.primary" }}>{leadName}</Typography>
          <Typography sx={{ fontSize: 13, color: "text.disabled", mt: 0.2 }}>{leadEmail}</Typography>
          {lastDate && (
            <Typography sx={{ fontSize: 12, color: "text.disabled", mt: 0.4 }}>
              Last approved: {lastDate}
            </Typography>
          )}
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <ChartPeriodFilter
            value={localPeriod}
            options={MONTH_OPTIONS}
            onChange={(p) => {
              setLocalPeriod(p);
              setExpandedCategories(new Set());
            }}
          />
          <Box
            onClick={() => {
              if (!detail) return;
              exportLeadApprovals({
                name: leadName,
                email: leadEmail ?? "",
                dateRange: localDateRange,
                currency: CURRENCIES[currency].code,
                totalApproved: detail.totalApproved,
                avgResponseDays: detail.avgResponseDays,
                firstApprovedDate: null,
                lastApprovedDate: detail.lastApprovedDate,
                categoryBreakdown,
                employeeBreakdown,
                claims: detail.claims.map((c) => ({ ...c, subCategory: c.subCategory ?? c.claimType })),
              });
            }}
            sx={{
              display: "flex", alignItems: "center", gap: 0.6,
              cursor: detail ? "pointer" : "not-allowed",
              opacity: detail ? 1 : 0.5,
              px: 2, py: 0.7,
              borderRadius: 1.5,
              bgcolor: "primary.main",
              color: "#fff",
              fontWeight: 700,
              fontSize: 13,
              transition: "all 0.15s ease",
              "&:hover": detail ? { bgcolor: "primary.dark" } : {},
              userSelect: "none",
            }}
          >
            <Download size={14} />
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: "inherit", textTransform: "uppercase", letterSpacing: 0.3 }}>Export</Typography>
          </Box>
          <Box
            onClick={onClose}
            sx={{ cursor: "pointer", color: "text.secondary", p: 0.5, borderRadius: 1, "&:hover": { bgcolor: "action.hover", color: "text.primary" } }}
          >
            <X size={20} />
          </Box>
        </Box>
      </Box>

      <Box sx={{ px: 3, mt: 1.5, display: "flex", borderBottom: "1px solid", borderColor: "divider" }}>
        {TABS.map((tab) => (
          <Box
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            sx={{
              px: 2, py: 1, cursor: "pointer",
              borderBottom: "2px solid",
              borderColor: activeTab === tab.id ? "primary.main" : "transparent",
              mb: "-1px",
              transition: "border-color 0.15s",
              "&:hover": { borderColor: activeTab === tab.id ? "primary.main" : "divider" },
            }}
          >
            <Typography
              sx={{
                fontSize: 13,
                fontWeight: activeTab === tab.id ? 700 : 500,
                color: activeTab === tab.id ? "primary.main" : "text.secondary",
                transition: "color 0.15s",
                userSelect: "none",
              }}
            >
              {tab.label}
            </Typography>
          </Box>
        ))}
      </Box>

      <DialogContent sx={{ p: 2.5, flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {loading ? (
          <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 0.5 }}>
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} variant="rectangular" height={44} sx={{ borderRadius: 1 }} />
            ))}
          </Box>
        ) : error ? (
          <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Typography sx={{ color: "error.main", fontSize: 14 }}>{error}</Typography>
          </Box>
        ) : !detail ? (
          <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Typography sx={{ color: "text.disabled", fontSize: 14 }}>No approval data found for this period</Typography>
          </Box>
        ) : activeTab === "summary" ? (
          <Box sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, gap: 2, overflowY: "auto" }}>
            <Box
              sx={{
                border: "1px solid", borderColor: "divider",
                borderRadius: 2,
                bgcolor: "background.paper",
                px: 2, py: 1.25,
                display: "flex", alignItems: "center", gap: 1.5,
                flexShrink: 0,
              }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: 9, fontWeight: 800, color: "text.disabled", textTransform: "uppercase", letterSpacing: 1 }}>
                  Total Approvals
                </Typography>
                <Typography sx={{ fontSize: 16, fontWeight: 800, color: "text.primary", lineHeight: 1.2 }}>
                  {detail.totalApproved.toLocaleString()}
                </Typography>
                <Typography sx={{ fontSize: 11, color: "text.secondary", mt: 0.2 }}>
                  claims approved
                </Typography>
              </Box>

              <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 130, gap: 0.25 }}>
                <Typography sx={{ fontSize: 9, fontWeight: 800, color: "text.disabled", textTransform: "uppercase", letterSpacing: 1 }}>
                  Avg Response
                </Typography>
                <Typography sx={{ fontSize: 14, fontWeight: 800, color: "#E8420A" }}>
                  {freqLabel ?? "—"}
                </Typography>
                <Typography sx={{ fontSize: 9, color: "text.disabled", textTransform: "uppercase", letterSpacing: 0.5, textAlign: "center" }}>
                  submission to approval
                </Typography>
              </Box>

              <Box sx={{ flex: 1, minWidth: 0, textAlign: "right" }}>
                <Typography sx={{ fontSize: 9, fontWeight: 800, color: "text.disabled", textTransform: "uppercase", letterSpacing: 1 }}>
                  Total Amount
                </Typography>
                <Typography sx={{ fontSize: 16, fontWeight: 800, color: "text.primary", lineHeight: 1.2 }}>
                  {fmtSym(totalAmount)}
                </Typography>
                <Typography sx={{ fontSize: 11, color: "text.secondary", mt: 0.2 }}>
                  reimbursed
                </Typography>
              </Box>
            </Box>

            <Box sx={{ flexShrink: 0 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: "text.primary", mb: 1 }}>
                Lead Approval Breakdown
              </Typography>
              {categoryBreakdown.length === 0 ? (
                <Typography sx={{ fontSize: 13, color: "text.disabled" }}>No category data</Typography>
              ) : (
                <Box
                  sx={{
                    border: "1px solid", borderColor: "divider",
                    borderRadius: 1.5, overflow: "hidden",
                  }}
                >
                  {categoryBreakdown.map((cat, idx) => {
                    const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
                    const isExpanded = expandedCategories.has(cat.type);
                    const pct = ((cat.totalAmount / grandTotal) * 100).toFixed(1);
                    const hasSubs =
                      cat.subCategories.length > 1 ||
                      (cat.subCategories.length === 1 && cat.subCategories[0].name !== cat.type);
                    const isLast = idx === categoryBreakdown.length - 1 && !isExpanded;

                    return (
                      <Box key={cat.type}>
                          <Box
                          onClick={() => hasSubs && toggleCategory(cat.type)}
                          sx={{
                            display: "flex", alignItems: "center",
                            px: 2, py: 1.1,
                            borderBottom: isLast ? "none" : "1px solid",
                            borderColor: "divider",
                            cursor: hasSubs ? "pointer" : "default",
                            bgcolor: isExpanded ? "action.hover" : "background.paper",
                            "&:hover": hasSubs ? { bgcolor: "action.hover" } : {},
                            transition: "background 0.12s",
                          }}
                        >
                          <Box sx={{ color: "text.disabled", display: "flex", alignItems: "center", mr: 1, flexShrink: 0 }}>
                            {hasSubs
                              ? isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                              : <Box sx={{ width: 14 }} />}
                          </Box>

                          <Box sx={{ width: 9, height: 9, borderRadius: "50%", bgcolor: color, flexShrink: 0, mr: 1.25 }} />

                          <Typography
                            title={cat.type}
                            sx={{
                              fontSize: 13, fontWeight: 600, color: "text.primary",
                              flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            }}
                          >
                            {cat.type}
                          </Typography>

                          <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
                            <Typography sx={{ fontSize: 12, color: "text.disabled", minWidth: 76, textAlign: "right" }}>
                              {cat.count} {cat.count === 1 ? "claim" : "claims"}
                            </Typography>
                            <Typography sx={{ fontSize: 13, fontWeight: 700, color: "text.primary", minWidth: 120, textAlign: "right" }}>
                              {fmtSym(cat.totalAmount)}
                            </Typography>
                            <Typography sx={{ fontSize: 12, color, fontWeight: 600, minWidth: 48, textAlign: "right" }}>
                              {pct}%
                            </Typography>
                          </Box>
                        </Box>

                        {isExpanded && hasSubs && cat.subCategories.map((sub, si) => {
                          const subPct = ((sub.totalAmount / grandTotal) * 100).toFixed(1);
                          const isSubLast = si === cat.subCategories.length - 1 && idx === categoryBreakdown.length - 1;
                          return (
                            <Box
                              key={sub.name}
                              sx={{
                                display: "flex", alignItems: "center",
                                pl: 6.5, pr: 2, py: 0.85,
                                borderBottom: isSubLast ? "none" : "1px solid",
                                borderColor: "divider",
                                bgcolor: "background.default",
                              }}
                            >
                              <Box sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: color, opacity: 0.6, flexShrink: 0, mr: 1.5 }} />

                              <Typography
                                title={sub.name}
                                sx={{
                                  fontSize: 12, color: "text.secondary",
                                  flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                }}
                              >
                                {sub.name}
                              </Typography>

                              <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
                                <Typography sx={{ fontSize: 11, color: "text.disabled", minWidth: 76, textAlign: "right" }}>
                                  {sub.count} {sub.count === 1 ? "claim" : "claims"}
                                </Typography>
                                <Typography sx={{ fontSize: 12, fontWeight: 600, color: "text.secondary", minWidth: 120, textAlign: "right" }}>
                                  {fmtSym(sub.totalAmount)}
                                </Typography>
                                <Typography sx={{ fontSize: 11, color: "text.disabled", minWidth: 48, textAlign: "right" }}>
                                  {subPct}%
                                </Typography>
                              </Box>
                            </Box>
                          );
                        })}
                      </Box>
                    );
                  })}
                </Box>
              )}
            </Box>
          </Box>

        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, gap: 2 }}>
            {employeeBreakdown.length > 0 && (
              <Box sx={{ flexShrink: 0 }}>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: "text.primary", mb: 1 }}>
                  Approvals by employee
                </Typography>
                <Box
                  sx={{
                    maxHeight: 180, overflowY: "auto", pr: 0.5,
                    "&::-webkit-scrollbar": { width: 4 },
                    "&::-webkit-scrollbar-track": { bgcolor: "action.hover", borderRadius: 2 },
                    "&::-webkit-scrollbar-thumb": { bgcolor: "text.disabled", borderRadius: 2 },
                  }}
                >
                  {employeeBreakdown.map((emp) => (
                    <Box key={emp.name} sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 0.75 }}>
                      <Typography
                        title={emp.name}
                        sx={{
                          fontSize: 13, fontWeight: 600, color: "text.primary",
                          minWidth: 160, maxWidth: 160,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}
                      >
                        {emp.name}
                      </Typography>
                      <Box sx={{ flex: 1 }} />
                      <Typography sx={{ fontSize: 12, color: "text.disabled", minWidth: 76, textAlign: "right" }}>
                        {emp.count} {emp.count === 1 ? "claim" : "claims"}
                      </Typography>
                      <Typography sx={{ fontSize: 12, fontWeight: 600, color: "text.secondary", minWidth: 120, textAlign: "right" }}>
                        {fmtSym(emp.amount)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            <Box sx={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
              {detail.claims.length === 0 ? (
                <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid", borderColor: "divider", borderRadius: 1.5 }}>
                  <Typography sx={{ fontSize: 13, color: "text.disabled" }}>No claims found for this period</Typography>
                </Box>
              ) : (
                <ClaimsTable claims={detail.claims} fmtSym={fmtSym} />
              )}
            </Box>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
