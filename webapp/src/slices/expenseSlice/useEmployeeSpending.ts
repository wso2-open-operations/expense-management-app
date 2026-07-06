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
import axios from "axios";

import { useCallback, useEffect, useRef, useState } from "react";

import { apiService } from "@utils/apiService";

export interface EmployeeSpendingItem {
  name: string;
  email: string;
  totalAmount: number;
  claimCount: number;
}

export interface EmployeeCategoryItem {
  category: string;
  total: number;
  claimCount: number;
  percentage: number;
}

export interface EmployeeSpendingBreakdownResponse {
  name: string;
  email: string;
  totalAmount: number;
  claimCount: number;
  categories: EmployeeCategoryItem[];
}

export interface EmployeeCategoryTransactionItem {
  description: string;
  txnDate: string;
  amount: number;
  status: string;
}

export interface DateRangeParams {
  year: string;
  month: string;
  monthRange: string;
}

export function resolveDateRangeParams(dateRange: string): DateRangeParams {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  switch (dateRange) {
    case "All Time":
      return { year: String(currentYear), month: String(currentMonth), monthRange: "0" };
    case "This Month":
      return { year: String(currentYear), month: String(currentMonth), monthRange: "1" };
    case "Last Month": {
      const m = currentMonth === 1 ? 12 : currentMonth - 1;
      const y = currentMonth === 1 ? currentYear - 1 : currentYear;
      return { year: String(y), month: String(m), monthRange: "1" };
    }
    case "Last 3 Months":
      return { year: String(currentYear), month: String(currentMonth), monthRange: "3" };
    case "Last 6 Months":
      return { year: String(currentYear), month: String(currentMonth), monthRange: "6" };
    case "Last 9 Months":
      return { year: String(currentYear), month: String(currentMonth), monthRange: "9" };
    case "Year to Date":
      return {
        year: String(currentYear),
        month: String(currentMonth),
        monthRange: String(currentMonth),
      };
    case "Last Year":
      return { year: String(currentYear - 1), month: "12", monthRange: "12" };
    default: {
      // Handles the custom date range picked by the user in the breakdown modal.
      // Format: "custom:YYYY-MM:YYYY-MM" (e.g. "custom:2025-07:2026-05")
      // Converts the from/to months into the year, month, monthRange params the API expects.
      //this is what makes the users custom date picker fetch real data.
      if (dateRange.startsWith("custom:")) {
        const parts = dateRange.slice(7).split(":");
        if (parts.length === 2) {
          const [fromYear, fromMonth] = parts[0].split("-").map(Number);
          const [toYear, toMonth] = parts[1].split("-").map(Number);
          if (fromYear && fromMonth && toYear && toMonth) {
            const raw = (toYear - fromYear) * 12 + (toMonth - fromMonth) + 1;
            const monthRange = Math.min(36, Math.max(1, raw)); // backend cap at 36 months
            return { year: String(toYear), month: String(toMonth), monthRange: String(monthRange) };
          }
        }
      }
      return { year: String(currentYear), month: String(currentMonth), monthRange: "0" };
    }
  }
}

export function useEmployeeSpendingList(dateRange: string, businessUnit: string) {
  const [employees, setEmployees] = useState<EmployeeSpendingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const { year, month, monthRange } = resolveDateRangeParams(dateRange);
    const params: Record<string, string> = { year, month, monthRange };
    if (businessUnit && businessUnit !== "All Business Units") {
      params.businessUnit = businessUnit;
    }

    apiService
      .get<EmployeeSpendingItem[]>("/employee-spending", { params })
      .then((res) => {
        if (!cancelled) {
          const mapped = (res.data ?? []).map((e) => ({
            ...e,
            totalAmount: Number(e.totalAmount),
            claimCount: Number(e.claimCount),
          }));
          const deduped = new Map<string, EmployeeSpendingItem>();
          for (const e of mapped) {
            const existing = deduped.get(e.email);
            if (existing) {
              existing.totalAmount += e.totalAmount;
              existing.claimCount += e.claimCount;
            } else {
              deduped.set(e.email, { ...e });
            }
          }
          setEmployees([...deduped.values()]);
        }
      })
      .catch((err) => {
        if (!cancelled && !axios.isCancel(err)) {
          setError("Failed to load employee spending data.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dateRange, businessUnit]);

  return { employees, loading, error };
}

export function useEmployeeBreakdown(
  email: string | null,
  dateRange: string,
  statusFilter: string,
) {
  const [breakdown, setBreakdown] = useState<EmployeeSpendingBreakdownResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Track which key the current breakdown was loaded for so we can detect stale data
  // immediately on render (before the async effect has a chance to clear state).
  const resolvedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!email) {
      setBreakdown(null);
      resolvedKeyRef.current = null;
      return;
    }

    const key = `${email}::${dateRange}::${statusFilter}`;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setBreakdown(null);

    const { year, month, monthRange } = resolveDateRangeParams(dateRange);
    const params: Record<string, string> = { email, year, month, monthRange };
    if (statusFilter && statusFilter !== "All") {
      params.statusFilter = statusFilter;
    }

    apiService
      .get<EmployeeSpendingBreakdownResponse>("/employee-spending-breakdown", { params })
      .then((res) => {
        if (!cancelled) {
          if (res.data) {
            setBreakdown({
              ...res.data,
              totalAmount: Number(res.data.totalAmount),
              claimCount: Number(res.data.claimCount),
              categories: (res.data.categories ?? []).map((c) => ({
                ...c,
                total: Number(c.total),
                claimCount: Number(c.claimCount),
                percentage: Number(c.percentage),
              })),
            });
          }
          resolvedKeyRef.current = key;
        }
      })
      .catch((err) => {
        if (!cancelled && !axios.isCancel(err)) {
          setError("Failed to load employee breakdown.");
          resolvedKeyRef.current = key;
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [email, dateRange, statusFilter]);

  const activeKey = email ? `${email}::${dateRange}::${statusFilter}` : null;
  const isStale = !!activeKey && activeKey !== resolvedKeyRef.current;

  return {
    breakdown: isStale ? null : breakdown,
    loading: loading || isStale,
    error,
  };
}

export function useEmployeeCategoryTransactions(
  email: string | null,
  category: string | null,
  dateRange: string,
  statusFilter: string,
) {
  const [transactions, setTransactions] = useState<EmployeeCategoryTransactionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<Map<string, EmployeeCategoryTransactionItem[]>>(new Map());
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchTransactions = useCallback(
    (emp: string, cat: string) => {
      const cacheKey = `${emp}::${cat}::${dateRange}::${statusFilter}`;
      const cached = cacheRef.current.get(cacheKey);
      if (cached) {
        setTransactions(cached);
        return;
      }

      setLoading(true);
      setError(null);

      const { year, month, monthRange } = resolveDateRangeParams(dateRange);
      const params: Record<string, string> = { email: emp, category: cat, year, month, monthRange };
      if (statusFilter && statusFilter !== "All") {
        params.statusFilter = statusFilter;
      }

      apiService
        .get<EmployeeCategoryTransactionItem[]>("/employee-category-transactions", { params })
        .then((res) => {
          if (!mountedRef.current) return;
          const data = (res.data ?? []).map((t) => ({
            ...t,
            amount: Number(t.amount),
          }));
          cacheRef.current.set(cacheKey, data);
          setTransactions(data);
        })
        .catch((err) => {
          if (!mountedRef.current) return;
          if (!axios.isCancel(err)) {
            setError("Failed to load transactions.");
          }
        })
        .finally(() => {
          if (mountedRef.current) setLoading(false);
        });
    },
    [dateRange, statusFilter],
  );

  useEffect(() => {
    if (email && category) {
      fetchTransactions(email, category);
    } else {
      setTransactions([]);
    }
  }, [email, category, fetchTransactions]);

  return { transactions, loading, error };
}



