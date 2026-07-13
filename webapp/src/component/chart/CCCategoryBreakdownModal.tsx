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
import { Download, X } from "lucide-react";

import { useCCCategoryEmployees } from "@slices/creditCardSlice/useCreditCards";
import { type CurrencyCode, formatWithSymbol } from "@utils/currency";
import { exportCCCategorySpenders } from "@utils/exportExcel";

export interface CCCategoryBreakdownModalProps {
  open: boolean;
  onClose: () => void;
  category: string | null;
  totalSpend: number;
  txnCount: number;
  percentage: number;
  color: string;
  currency: CurrencyCode;
}

export default function CCCategoryBreakdownModal({
  open,
  onClose,
  category,
  totalSpend,
  txnCount,
  percentage,
  color,
  currency,
}: CCCategoryBreakdownModalProps) {
  const fmtSym = (v: number) => formatWithSymbol(v, currency);
  const { employees, loading, error } = useCCCategoryEmployees(open ? category : null);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 2,
            bgcolor: "background.paper",
            border: "1px solid",
            borderColor: "divider",
            backgroundImage: "none",
          },
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 3,
          pt: 2,
          pb: 1.5,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
            <Box
              sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: color, flexShrink: 0 }}
            />
            <Typography sx={{ fontSize: 20, fontWeight: 800, color: "text.primary" }}>
              {category}
            </Typography>
          </Box>
          <Typography sx={{ fontSize: 13, color: "text.disabled" }}>
            {fmtSym(totalSpend)} total · {txnCount} transactions · {percentage}% of card spend
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box
            onClick={employees.length > 0 ? () => exportCCCategorySpenders({
              category: category ?? "",
              totalSpend,
              txnCount,
              percentage,
              currency,
              employees,
            }) : undefined}
            sx={{
              display: "flex", alignItems: "center", gap: 0.6,
              cursor: employees.length > 0 ? "pointer" : "not-allowed",
              opacity: employees.length > 0 ? 1 : 0.5,
              px: 2, py: 0.7,
              borderRadius: 1.5,
              bgcolor: "primary.main",
              color: "#fff",
              fontWeight: 700,
              fontSize: 13,
              transition: "all 0.15s ease",
              "&:hover": employees.length > 0 ? { bgcolor: "primary.dark" } : {},
              userSelect: "none",
            }}
          >
            <Download size={14} />
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: "inherit", textTransform: "uppercase", letterSpacing: 0.3 }}>Export</Typography>
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
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: "text.primary", mb: 1.5 }}>
          All spenders in this category
        </Typography>

        {loading ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} variant="rectangular" height={60} sx={{ borderRadius: 1.5 }} />
            ))}
          </Box>
        ) : error ? (
          <Box sx={{ py: 4, textAlign: "center" }}>
            <Typography sx={{ color: "error.main", fontSize: 13 }}>{error}</Typography>
          </Box>
        ) : employees.length === 0 ? (
          <Box sx={{ py: 6, textAlign: "center" }}>
            <Typography sx={{ color: "text.disabled", fontSize: 13 }}>
              No employees found for this category
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 0.5,
              maxHeight: 480,
              overflowY: "auto",
              pr: 0.5,
              "&::-webkit-scrollbar": { width: 4 },
              "&::-webkit-scrollbar-track": { bgcolor: "action.hover", borderRadius: 2 },
              "&::-webkit-scrollbar-thumb": { bgcolor: "text.disabled", borderRadius: 2 },
            }}
          >
            {employees.map((emp, idx) => (
              <Box
                key={emp.email}
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  px: 2,
                  py: 1.2,
                  borderRadius: 1.5,
                  border: "1px solid",
                  borderColor: "divider",
                  bgcolor: idx % 2 === 0 ? "transparent" : "action.hover",
                }}
              >
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography
                    sx={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "text.primary",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {emp.name}
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: "text.disabled" }}>
                    {emp.email}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: "right", flexShrink: 0, ml: 2 }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 700, color: "text.primary" }}>
                    {fmtSym(emp.totalAmount)}
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: "text.disabled" }}>
                    {emp.txnCount} txns
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
