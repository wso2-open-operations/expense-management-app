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
import { resolveDateRangeParams } from "./useEmployeeSpending";

export interface MyExpenseSummary {
  totalAmount: number;
  totalCount: number;
  avgAmount: number;
  approvedCount: number;
  pendingCount: number;
  rejectedCount: number;
}

export interface MyExpenseCategoryItem {
  category: string;
  total: number;
  claimCount: number;
  percentage: number;
}

export interface MyExpenseBreakdown {
  name: string;
  email: string;
  totalAmount: number;
  claimCount: number;
  categories: MyExpenseCategoryItem[];
}

export interface MyExpenseTransaction {
  description: string;
  txnDate: string;
  amount: number;
  status: string;
}

export interface MyOpdSummary {
  claimedAmount: number;
  claimCount: number;
}

export function useMyExpenseSummary(dateRange: string) {
  const [data, setData] = useState<MyExpenseSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const { year, month, monthRange } = resolveDateRangeParams(dateRange);

    apiService
      .get<MyExpenseSummary>("/my-expense-summary", { params: { year, month, monthRange } })
      .then((res) => {
        if (!cancelled && res.data) {
          setData({
            ...res.data,
            totalAmount: Number(res.data.totalAmount),
            avgAmount: Number(res.data.avgAmount),
          });
        }
      })
      .catch((err) => {
        if (!cancelled && !axios.isCancel(err)) {
          setError("Failed to load your expense summary.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dateRange]);

  return { data, loading, error };
}

export function useMyExpenseBreakdown(dateRange: string, statusFilter: string) {
  const [breakdown, setBreakdown] = useState<MyExpenseBreakdown | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resolvedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const key = `${dateRange}::${statusFilter}`;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setBreakdown(null);

    const { year, month, monthRange } = resolveDateRangeParams(dateRange);
    const params: Record<string, string> = { year, month, monthRange };
    if (statusFilter && statusFilter !== "All") {
      params.statusFilter = statusFilter;
    }

    apiService
      .get<MyExpenseBreakdown>("/my-expense-breakdown", { params })
      .then((res) => {
        if (!cancelled && res.data) {
          setBreakdown({
            ...res.data,
            totalAmount: Number(res.data.totalAmount),
            categories: (res.data.categories ?? []).map((c) => ({
              ...c,
              total: Number(c.total),
              percentage: Number(c.percentage),
            })),
          });
          resolvedKeyRef.current = key;
        }
      })
      .catch((err) => {
        if (!cancelled && !axios.isCancel(err)) {
          setError("Failed to load your expense breakdown.");
          resolvedKeyRef.current = key;
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dateRange, statusFilter]);

  const activeKey = `${dateRange}::${statusFilter}`;
  const isStale = activeKey !== resolvedKeyRef.current;

  return {
    breakdown: isStale ? null : breakdown,
    loading: loading || isStale,
    error,
  };
}

export function useMyExpenseTransactions(
  category: string | null,
  dateRange: string,
  statusFilter: string,
) {
  const [transactions, setTransactions] = useState<MyExpenseTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<Map<string, MyExpenseTransaction[]>>(new Map());
  const mountedRef = useRef(true);
  const reqCountRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchTransactions = useCallback(
    (cat: string) => {
      const cacheKey = `${cat}::${dateRange}::${statusFilter}`;
      const cached = cacheRef.current.get(cacheKey);
      if (cached) {
        setTransactions(cached);
        return;
      }

      setLoading(true);
      setError(null);

      const reqId = ++reqCountRef.current;
      const { year, month, monthRange } = resolveDateRangeParams(dateRange);
      const params: Record<string, string> = { category: cat, year, month, monthRange };
      if (statusFilter && statusFilter !== "All") {
        params.statusFilter = statusFilter;
      }

      apiService
        .get<MyExpenseTransaction[]>("/my-expense-transactions", { params })
        .then((res) => {
          if (!mountedRef.current || reqId !== reqCountRef.current) return;
          const data = (res.data ?? []).map((t) => ({ ...t, amount: Number(t.amount) }));
          cacheRef.current.set(cacheKey, data);
          setTransactions(data);
        })
        .catch((err) => {
          if (!mountedRef.current || reqId !== reqCountRef.current || axios.isCancel(err)) return;
          setError("Failed to load transactions.");
        })
        .finally(() => {
          if (mountedRef.current && reqId === reqCountRef.current) setLoading(false);
        });
    },
    [dateRange, statusFilter],
  );

  useEffect(() => {
    if (category) {
      fetchTransactions(category);
    } else {
      setTransactions([]);
    }
  }, [category, fetchTransactions]);

  return { transactions, loading, error, fetchTransactions };
}

export interface MyOpdClaim {
  id: string;
  date: string;
  amount: number;
  status: string;
  description?: string | null;
  txnCount: number;
}

export function useMyOpdClaims(year?: number) {
  const [claims, setClaims] = useState<MyOpdClaim[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = year ? { year: String(year) } : {};

    apiService
      .get<MyOpdClaim[]>("/my-opd-claims", { params })
      .then((res) => {
        if (!cancelled && res.data) {
          setClaims((res.data ?? []).map((c) => ({ ...c, amount: Number(c.amount) })));
        }
      })
      .catch((err) => {
        if (!cancelled && !axios.isCancel(err)) {
          setError("Failed to load your OPD claims.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [year]);

  return { claims, loading, error };
}

export function useMyOpdSummary(year?: number) {
  const [data, setData] = useState<MyOpdSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = year ? { year: String(year) } : {};

    apiService
      .get<MyOpdSummary>("/my-opd-summary", { params })
      .then((res) => {
        if (!cancelled && res.data) {
          setData({
            claimedAmount: Number(res.data.claimedAmount),
            claimCount: Number(res.data.claimCount),
          });
        }
      })
      .catch((err) => {
        if (!cancelled && !axios.isCancel(err)) {
          setError("Failed to load your OPD summary.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [year]);

  return { data, loading, error };
}
