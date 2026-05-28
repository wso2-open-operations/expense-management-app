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
import { Box, Dialog, DialogContent, Skeleton, Typography } from "@wso2/oxygen-ui";
import { ChevronDown, ChevronRight, X } from "lucide-react";

import { useState, useEffect } from "react";

import { type CurrencyCode, formatWithSymbol } from "@utils/currency";

export interface ExpenseTransaction {
  description: string;
  txnDate: string;
  amount: number;
  status: string;
  submittedDate?: string;
  processedDate?: string | null;
}

export interface ExpenseCategoryTransactionsModalProps {
  open: boolean;
  onClose: () => void;
  category: string | null;
  totalAmount: number;
  claimCount: number;
  percentage: number;
  color: string;
  currency: CurrencyCode;
  transactions: ExpenseTransaction[];
  loading?: boolean;
  error?: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  Approved: "#2E8B57",
  Pending: "#f97316",
  Rejected: "#ef4444",
};

function StatusSummaryBar({
  transactions,
  fmtSym,
}: {
  transactions: ExpenseTransaction[];
  fmtSym: (v: number) => string;
}) {
  const approved = transactions.filter((t) => t.status === "Approved");
  const pending = transactions.filter((t) => t.status === "Pending");
  const rejected = transactions.filter((t) => t.status === "Rejected");
  const approvedAmt = approved.reduce((s, t) => s + t.amount, 0);
  const pendingAmt = pending.reduce((s, t) => s + t.amount, 0);
  const rejectedAmt = rejected.reduce((s, t) => s + t.amount, 0);

  const cols = [
    { label: "Approved", count: approved.length, amount: approvedAmt, color: STATUS_COLORS.Approved },
    { label: "Pending", count: pending.length, amount: pendingAmt, color: STATUS_COLORS.Pending },
    { label: "Rejected", count: rejected.length, amount: rejectedAmt, color: STATUS_COLORS.Rejected },
  ];

  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        bgcolor: "background.paper",
        display: "flex",
        mb: 2,
        overflow: "hidden",
      }}
    >
      {cols.map((col, i) => (
        <Box
          key={col.label}
          sx={{
            flex: 1,
            px: 2,
            py: 1.25,
            textAlign: i === 1 ? "center" : i === 2 ? "right" : "left",
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
  );
}

function TransactionRow({
  txn,
  maxAmount,
  fmtSym,
  isExpanded,
  onToggle,
}: {
  txn: ExpenseTransaction;
  maxAmount: number;
  fmtSym: (v: number) => string;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const color = STATUS_COLORS[txn.status] ?? "#9e9e9e";
  const barW = maxAmount > 0 ? Math.min(100, (txn.amount / maxAmount) * 100) : 0;

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
            width: 220,
            maxWidth: 220,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
          title={txn.description}
        >
          {txn.description}
        </Typography>

        <Box sx={{ flex: 1, mx: 1.5, position: "relative", height: 10 }}>
          <Box sx={{ position: "absolute", inset: 0, bgcolor: "action.hover", borderRadius: 5 }} />
          <Box
            sx={{
              position: "absolute",
              top: 2,
              bottom: 2,
              left: 0,
              width: `${barW}%`,
              bgcolor: color,
              borderRadius: 5,
              transition: "width 0.4s ease",
            }}
          />
        </Box>

        <Box sx={{ display: "flex", gap: 2, flexShrink: 0 }}>
          <Box sx={{ textAlign: "right", minWidth: 100 }}>
            <Typography sx={{ fontSize: 12, color: "text.disabled" }}>
              {txn.txnDate}
            </Typography>
            {txn.submittedDate && (
              <Typography sx={{ fontSize: 11, color: "text.disabled" }}>
                sub: {txn.submittedDate}
              </Typography>
            )}
          </Box>
          <Box sx={{ textAlign: "right", minWidth: 110 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: "text.primary" }}>
              {fmtSym(txn.amount)}
            </Typography>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color }}>
              {txn.status}
            </Typography>
          </Box>
        </Box>
      </Box>

      {isExpanded && (
        <Box
          sx={{
            mx: 1,
            mb: 1,
            borderRadius: 1.5,
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
            overflow: "hidden",
            px: 2,
            py: 1.2,
            display: "flex",
            gap: 3,
            flexWrap: "wrap",
          }}
        >
          <Box>
            <Typography sx={{ fontSize: 10, color: "text.disabled", textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 700 }}>
              Transaction Date
            </Typography>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: "text.primary" }}>
              {txn.txnDate}
            </Typography>
          </Box>
          {txn.submittedDate && (
            <Box>
              <Typography sx={{ fontSize: 10, color: "text.disabled", textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 700 }}>
                Submitted
              </Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: "text.primary" }}>
                {txn.submittedDate}
              </Typography>
            </Box>
          )}
          {txn.processedDate && (
            <Box>
              <Typography sx={{ fontSize: 10, color: "text.disabled", textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 700 }}>
                {txn.status === "Rejected" ? "Rejected On" : "Approved On"}
              </Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: STATUS_COLORS[txn.status] ?? "#9e9e9e" }}>
                {txn.processedDate}
              </Typography>
            </Box>
          )}
          <Box sx={{ ml: "auto", textAlign: "right" }}>
            <Typography sx={{ fontSize: 10, color: "text.disabled", textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 700 }}>
              Amount
            </Typography>
            <Typography sx={{ fontSize: 16, fontWeight: 800, color: "text.primary" }}>
              {fmtSym(txn.amount)}
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
}

const STATUS_FILTERS = ["All", "Approved", "Pending", "Rejected"] as const;
type StatusFilter = typeof STATUS_FILTERS[number];

export default function ExpenseCategoryTransactionsModal({
  open,
  onClose,
  category,
  totalAmount,
  claimCount,
  percentage,
  color,
  currency,
  transactions,
  loading,
  error,
}: ExpenseCategoryTransactionsModalProps) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");

  useEffect(() => {
    if (open) {
      setExpandedIdx(null);
      setStatusFilter("All");
    }
  }, [open, category]);

  const fmtSym = (v: number) => formatWithSymbol(v, currency);
  const displayedTxns = statusFilter === "All" ? transactions : transactions.filter((t) => t.status === statusFilter);
  const maxAmount = Math.max(...displayedTxns.map((t) => t.amount), 1);

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
      {/* Header */}
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
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.3 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: color, flexShrink: 0 }} />
            <Typography sx={{ fontSize: 18, fontWeight: 800, color: "text.primary" }}>
              {category}
            </Typography>
          </Box>
          <Typography sx={{ fontSize: 13, color: "text.disabled" }}>
            {fmtSym(totalAmount)} total · {claimCount} claim{claimCount !== 1 ? "s" : ""} · {percentage.toFixed(1)}% of total spend
          </Typography>
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

      <DialogContent sx={{ p: 2.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 700, color: "text.primary" }}>
            Claim breakdown by status
          </Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            {STATUS_FILTERS.map((f) => (
              <Box
                key={f}
                onClick={() => { setStatusFilter(f); setExpandedIdx(null); }}
                sx={{
                  cursor: "pointer",
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 1,
                  border: "1px solid",
                  borderColor: statusFilter === f ? "primary.main" : "divider",
                  bgcolor: statusFilter === f ? "primary.main" : "transparent",
                  color: statusFilter === f ? "#fff" : "text.secondary",
                  fontSize: 12,
                  fontWeight: 600,
                  transition: "all 0.2s",
                  "&:hover": { borderColor: "primary.main" },
                  userSelect: "none",
                }}
              >
                {f}
              </Box>
            ))}
          </Box>
        </Box>

        {loading ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            <Skeleton variant="rectangular" height={72} sx={{ borderRadius: 2, mb: 1.5 }} />
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} variant="rectangular" height={52} sx={{ borderRadius: 1.5 }} />
            ))}
          </Box>
        ) : error ? (
          <Box sx={{ py: 4, textAlign: "center" }}>
            <Typography sx={{ color: "error.main", fontSize: 13 }}>{error}</Typography>
          </Box>
        ) : transactions.length === 0 ? (
          <Box sx={{ py: 6, textAlign: "center" }}>
            <Typography sx={{ color: "text.disabled", fontSize: 13 }}>
              No transactions found for this category
            </Typography>
          </Box>
        ) : (
          <>
            <StatusSummaryBar transactions={transactions} fmtSym={fmtSym} />

            {/* Column headers */}
            <Box sx={{ display: "flex", alignItems: "center", pl: 1.5, pr: 2, pb: 0.5, gap: 1.5 }}>
              <Box sx={{ flex: 1 }} />
              <Box sx={{ display: "flex", gap: 2, flexShrink: 0 }}>
                <Typography sx={{ fontSize: 10, fontWeight: 700, color: "text.disabled", textTransform: "uppercase", letterSpacing: 0.5, minWidth: 100, textAlign: "right" }}>
                  Txn / Submitted
                </Typography>
                <Typography sx={{ fontSize: 10, fontWeight: 700, color: "text.disabled", textTransform: "uppercase", letterSpacing: 0.5, minWidth: 110, textAlign: "right" }}>
                  Amount
                </Typography>
              </Box>
            </Box>

            {displayedTxns.length === 0 ? (
              <Box sx={{ py: 4, textAlign: "center" }}>
                <Typography sx={{ color: "text.disabled", fontSize: 13 }}>
                  No {statusFilter.toLowerCase()} transactions
                </Typography>
              </Box>
            ) : (
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
                {displayedTxns.map((txn, idx) => (
                  <TransactionRow
                    key={idx}
                    txn={txn}
                    maxAmount={maxAmount}
                    fmtSym={fmtSym}
                    isExpanded={expandedIdx === idx}
                    onToggle={() => setExpandedIdx((prev) => (prev === idx ? null : idx))}
                  />
                ))}
              </Box>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
