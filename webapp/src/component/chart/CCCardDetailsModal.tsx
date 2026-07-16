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
import { ChevronDown, ChevronRight, CreditCard, Download, X } from "lucide-react";
import { useState } from "react";

import {
  useCCEmployeeBreakdown,
  useCCEmployeeCategoryTransactions,
} from "@slices/creditCardSlice/useCreditCards";
import { type CurrencyCode, formatWithSymbol } from "@utils/currency";
import { exportCCCardDetails } from "@utils/exportExcel";

const SEGMENT_COLORS = [
  "#00B4D8", "#FF8A4C", "#F4B400", "#2E8B57", "#AB7AE0",
  "#8C9EFF", "#00A6A6", "#E85D75", "#FF6B9D", "#4A8EDB",
  "#90EE90", "#DA70D6",
];

interface TxnPanelProps {
  email: string;
  category: string;
  dateRange: string;
  fmtSym: (v: number) => string;
  color: string;
}

function TxnPanel({ email, category, dateRange, fmtSym, color }: TxnPanelProps) {
  const { transactions, loading } = useCCEmployeeCategoryTransactions(email, category, dateRange);

  return (
    <Box sx={{ mx: 1, mb: 1, borderRadius: 1.5, border: "1px solid", borderColor: "divider", overflow: "hidden" }}>
      {loading ? (
        <Box sx={{ p: 2, display: "flex", justifyContent: "center" }}>
          <CircularProgress size={18} />
        </Box>
      ) : transactions.length === 0 ? (
        <Box sx={{ p: 1.5 }}>
          <Typography sx={{ fontSize: 12, color: "text.disabled", textAlign: "center" }}>No transactions</Typography>
        </Box>
      ) : (
        transactions.map((t, idx) => (
          <Box
            key={idx}
            sx={{
              display: "flex", alignItems: "center", px: 2, py: 0.9,
              borderBottom: idx < transactions.length - 1 ? "1px solid" : "none",
              borderColor: "divider",
              "&:hover": { bgcolor: "action.hover" },
            }}
          >
            <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: color, flexShrink: 0, mr: 1 }} />
            <Typography sx={{ fontSize: 12, color: "text.primary", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={t.description}>
              {t.description}
            </Typography>
            <Typography sx={{ fontSize: 11, color: "text.disabled", mx: 1.5, flexShrink: 0 }}>{t.txnDate}</Typography>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: "text.primary", flexShrink: 0 }}>{fmtSym(t.amount)}</Typography>
          </Box>
        ))
      )}
    </Box>
  );
}

export interface CCCardDetailsModalProps {
  open: boolean;
  onClose: () => void;
  cardId: string;
  cardNumber: string;
  holderName: string;
  holderEmail: string;
  cardType: string;
  status: string;
  totalSpend: number;
  currency: CurrencyCode;
  dateRange: string;
}

export default function CCCardDetailsModal({
  open, onClose, cardId, cardNumber, holderName, holderEmail, cardType, status, currency, dateRange,
}: CCCardDetailsModalProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const fmtSym = (v: number) => formatWithSymbol(v, currency);

  const { breakdown, loading } = useCCEmployeeBreakdown(open ? holderEmail : null, dateRange);

  const handleExport = () => {
    if (!breakdown) return;
    exportCCCardDetails({
      holderName,
      holderEmail,
      cardId,
      cardNumber,
      cardType,
      status,
      currency,
      totalSpend: breakdown.totalAmount,
      txnCount: breakdown.txnCount,
      dateRange,
      categories: breakdown.categories.map((c) => ({
        category: c.category,
        total: c.total,
        txnCount: c.txnCount,
        percentage: c.percentage,
        compTotal: 0,
        compTxnCount: 0,
      })),
    });
  };

  const initials = holderName.split(" ").map((w) => w[0] ?? "").join("").toUpperCase().slice(0, 2);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: 2, bgcolor: "background.paper", border: "1px solid", borderColor: "divider", backgroundImage: "none" } } }}
    >
      {/* Header */}
      <Box sx={{ px: 3, pt: 2, pb: 1.5, display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid", borderColor: "divider" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box sx={{ width: 46, height: 46, borderRadius: "50%", bgcolor: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 15, fontWeight: 800, flexShrink: 0, userSelect: "none" }}>
            {initials}
          </Box>
          <Box>
            <Typography sx={{ fontSize: 18, fontWeight: 800, color: "text.primary", lineHeight: 1.2 }}>{holderName}</Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mt: 0.4 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <CreditCard size={12} color="#6b7280" />
                <Typography sx={{ fontSize: 12, color: "text.disabled" }}>{cardNumber}</Typography>
              </Box>
              <Typography sx={{ fontSize: 12, color: "text.disabled" }}>·</Typography>
              <Typography sx={{ fontSize: 12, color: "text.disabled" }}>{cardType}</Typography>
              <Box sx={{ px: 1, py: 0.2, borderRadius: 1, bgcolor: status === "Active" ? "#f0fdf4" : "#fff1f2", display: "inline-flex", alignItems: "center", gap: 0.4 }}>
                <Box sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: status === "Active" ? "#22c55e" : "#f43f5e" }} />
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: status === "Active" ? "#15803d" : "#be123c" }}>{status}</Typography>
              </Box>
            </Box>
            {breakdown && (
              <>
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: "text.primary", mt: 0.4 }}>
                  Total: {fmtSym(breakdown.totalAmount)}
                </Typography>
                <Typography sx={{ fontSize: 11, color: "text.disabled", mt: 0.2 }}>
                  No of Transactions: {breakdown.txnCount}
                </Typography>
              </>
            )}
          </Box>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box
            onClick={breakdown ? handleExport : undefined}
            sx={{
              display: "flex", alignItems: "center", gap: 0.6,
              cursor: breakdown ? "pointer" : "not-allowed",
              opacity: breakdown ? 1 : 0.5,
              px: 2, py: 0.7, borderRadius: 1.5,
              bgcolor: "primary.main",
              color: "#fff", fontWeight: 700, fontSize: 13,
              transition: "all 0.15s ease",
              "&:hover": breakdown ? { bgcolor: "primary.dark" } : {},
              userSelect: "none",
            }}
          >
            <Download size={14} />
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: "inherit", textTransform: "uppercase", letterSpacing: 0.3 }}>Export</Typography>
          </Box>
          <Box onClick={onClose} sx={{ cursor: "pointer", color: "text.secondary", p: 0.5, borderRadius: 1, "&:hover": { bgcolor: "action.hover", color: "text.primary" } }}>
            <X size={20} />
          </Box>
        </Box>
      </Box>

      <DialogContent sx={{ p: 2.5 }}>
        {loading ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {[...Array(5)].map((_, i) => <Skeleton key={i} variant="rectangular" height={52} sx={{ borderRadius: 1.5 }} />)}
          </Box>
        ) : !breakdown || breakdown.categories.length === 0 ? (
          <Box sx={{ py: 6, textAlign: "center" }}>
            <Typography sx={{ color: "text.disabled", fontSize: 13 }}>No transaction data found</Typography>
          </Box>
        ) : (
          <>
            {/* Column headers */}
            <Box sx={{ display: "flex", alignItems: "center", px: 1.5, pb: 0.5, gap: 1.5 }}>
              <Box sx={{ flex: 1 }} />
              <Box sx={{ display: "flex", gap: 2, flexShrink: 0 }}>
                <Typography sx={{ fontSize: 10, fontWeight: 700, color: "text.disabled", textTransform: "uppercase", letterSpacing: 0.5, minWidth: 110, textAlign: "right" }}>
                  Amount
                </Typography>
                <Typography sx={{ fontSize: 10, fontWeight: 700, color: "text.disabled", textTransform: "uppercase", letterSpacing: 0.5, minWidth: 70, textAlign: "right" }}>
                  Txns
                </Typography>
              </Box>
            </Box>

            <Box sx={{ maxHeight: 500, overflowY: "auto", pr: 0.5, "&::-webkit-scrollbar": { width: 4 }, "&::-webkit-scrollbar-thumb": { bgcolor: "text.disabled", borderRadius: 2 } }}>
              {breakdown.categories.map((cat, i) => {
                const color = SEGMENT_COLORS[i % SEGMENT_COLORS.length];
                const isExpanded = expandedCategory === cat.category;
                return (
                  <Box key={cat.category}>
                    <Box
                      onClick={() => setExpandedCategory(isExpanded ? null : cat.category)}
                      sx={{
                        display: "flex", alignItems: "center", gap: 1.5,
                        px: 1.5, py: 1.1, borderRadius: 1.5, cursor: "pointer",
                        border: "1px solid", borderColor: isExpanded ? color : "divider",
                        bgcolor: isExpanded ? `${color}11` : "background.default",
                        "&:hover": { bgcolor: isExpanded ? `${color}22` : "action.hover" },
                        transition: "all 0.15s ease", mb: 0.5,
                      }}
                    >
                      <Box sx={{ color: "text.secondary", display: "flex" }}>
                        {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                      </Box>
                      <Box sx={{ width: 9, height: 9, borderRadius: "50%", bgcolor: color, flexShrink: 0 }} />
                      <Typography sx={{ fontSize: 13, fontWeight: 600, color: "text.primary", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {cat.category}
                      </Typography>
                      <Typography sx={{ fontSize: 11, color: "text.disabled", flexShrink: 0, mr: 1 }}>
                        {cat.percentage.toFixed(1)}%
                      </Typography>
                      <Box sx={{ display: "flex", gap: 2, flexShrink: 0 }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 700, color: "text.primary", minWidth: 110, textAlign: "right" }}>
                          {fmtSym(cat.total)}
                        </Typography>
                        <Typography sx={{ fontSize: 12, color: "text.disabled", minWidth: 70, textAlign: "right" }}>
                          {cat.txnCount} txns
                        </Typography>
                      </Box>
                    </Box>

                    {isExpanded && (
                      <TxnPanel
                        email={holderEmail}
                        category={cat.category}
                        dateRange={dateRange}
                        fmtSym={fmtSym}
                        color={color}
                      />
                    )}
                  </Box>
                );
              })}
            </Box>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
