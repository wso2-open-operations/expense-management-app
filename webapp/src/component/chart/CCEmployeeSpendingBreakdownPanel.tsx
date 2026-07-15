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

import { useEffect, useMemo, useState } from "react";

import CCEmployeeBreakdownModal from "@component/chart/CCEmployeeBreakdownModal";
import ChartCard from "@component/chart/ChartCard";
import PaginationBar from "@component/common/PaginationBar";
import SearchBox from "@component/common/SearchBox";
import { PAGE_SIZE_EMPLOYEES } from "@config/constant";
import {
  type CCEmployeeSpendingItem,
  useCCEmployeeSpendingList,
} from "@slices/creditCardSlice/useCreditCards";
import { type CurrencyCode, formatWithSymbol } from "@utils/currency";

interface CCEmployeeSpendingBreakdownPanelProps {
  currency: CurrencyCode;
  dateRange: string;
}

export default function CCEmployeeSpendingBreakdownPanel({
  currency,
  dateRange,
}: CCEmployeeSpendingBreakdownPanelProps) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selectedEmployee, setSelectedEmployee] = useState<CCEmployeeSpendingItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fmtSym = (v: number) => formatWithSymbol(v, currency);

  const { employees, loading, error } = useCCEmployeeSpendingList(dateRange);

  const filtered = useMemo(() => {
    if (!search.trim()) return employees;
    const q = search.toLowerCase();
    return employees.filter(
      (e) => e.name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q),
    );
  }, [employees, search]);

  useEffect(() => {
    setPage(0);
  }, [search, dateRange]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE_EMPLOYEES);
  const paginated = filtered.slice(page * PAGE_SIZE_EMPLOYEES, (page + 1) * PAGE_SIZE_EMPLOYEES);

  const handleEmployeeClick = (emp: CCEmployeeSpendingItem) => {
    setSelectedEmployee(emp);
    setModalOpen(true);
  };

  return (
    <>
      <ChartCard
        title="Employee CC Spending Breakdown"
        subtitle="Cardholders with highest corporate card spend"
        minHeight={420}
      >
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="Search cardholders by name or email..."
        />

        <Box>
          {loading ? (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              {[...Array(7)].map((_, i) => (
                <Skeleton key={i} variant="rectangular" height={62} sx={{ borderRadius: 1.5 }} />
              ))}
            </Box>
          ) : error ? (
            <Box sx={{ py: 4, textAlign: "center" }}>
              <Typography sx={{ color: "error.main", fontSize: 13 }}>{error}</Typography>
            </Box>
          ) : filtered.length === 0 ? (
            <Box sx={{ py: 6, textAlign: "center" }}>
              <Typography sx={{ color: "text.disabled", fontSize: 13 }}>
                {search ? "No cardholders match your search" : "No cardholder data for this period"}
              </Typography>
            </Box>
          ) : (
            <>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                {[...Array(PAGE_SIZE_EMPLOYEES)].map((_, i) => {
                  const emp = paginated[i];
                  if (!emp) {
                    return (
                      <Box
                        key={`placeholder-${i}`}
                        sx={{ height: 62, borderRadius: 1.5, border: "1px solid transparent" }}
                      />
                    );
                  }
                  return (
                    <Box
                      key={emp.email}
                      onClick={() => handleEmployeeClick(emp)}
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        px: 2,
                        py: 1.2,
                        borderRadius: 1.5,
                        border: "1px solid",
                        borderColor: "divider",
                        cursor: "pointer",
                        "&:hover": {
                          bgcolor: "action.hover",
                          borderColor: "primary.main",
                        },
                        transition: "all 0.15s ease",
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
                        <Typography
                          sx={{
                            fontSize: 12,
                            color: "text.disabled",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {emp.email}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: "right", flexShrink: 0, ml: 2 }}>
                        <Typography sx={{ fontSize: 14, fontWeight: 700, color: "text.primary" }}>
                          {fmtSym(emp.totalAmount)}
                        </Typography>
                        <Typography sx={{ fontSize: 11, color: "text.disabled" }}>
                          {emp.txnCount.toLocaleString()} txns
                        </Typography>
                      </Box>
                    </Box>
                  );
                })}
              </Box>

              {totalPages > 1 && (
                <PaginationBar page={page} totalPages={totalPages} onPageChange={setPage} />
              )}
            </>
          )}
        </Box>
      </ChartCard>

      <CCEmployeeBreakdownModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        employeeEmail={selectedEmployee?.email ?? null}
        employeeName={selectedEmployee?.name ?? ""}
        currency={currency}
        dateRange={dateRange}
      />
    </>
  );
}

