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

import { type CCDateRangePreset } from "@config/constant";

import { useCallback, useEffect, useRef, useState } from "react";

import { apiService } from "@utils/apiService";

export interface CCSummaryData {
  totalSpend: number;
  activeCardCount: number;
  avgTransaction: number;
  highestSpendCardName: string;
  highestSpendCardAmount: number;
  trendTotalSpend: number;
  trendActiveCards: number;
  trendAvgTransaction: number;
}

export interface CCCardTypeItem {
  cardType: string;
  totalSpend: number;
  txnCount: number;
  percentage: number;
}

export interface CCTopCardItem {
  cardNumber: string;
  holderName: string;
  usedAmount: number;
  txnCount: number;
}

export interface CCCardListItem {
  cardId: string;
  cardNumber: string;
  holderName: string;
  holderEmail: string;
  usedAmount: number;
  cardType: string;
  status: string;
}

export function useCCSummary() {
  const [data, setData] = useState<CCSummaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    apiService
      .get<CCSummaryData>("/cc-summary")
      .then((res) => {
        if (!cancelled && res.data) {
          setData({
            ...res.data,
            totalSpend: Number(res.data.totalSpend),
            activeCardCount: Number(res.data.activeCardCount),
            avgTransaction: Number(res.data.avgTransaction),
            highestSpendCardAmount: Number(res.data.highestSpendCardAmount),
            trendTotalSpend: Number(res.data.trendTotalSpend),
            trendActiveCards: Number(res.data.trendActiveCards),
            trendAvgTransaction: Number(res.data.trendAvgTransaction),
          });
        }
      })
      .catch((err) => {
        if (!cancelled && !axios.isCancel(err)) {
          setError("Failed to load credit card summary.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading, error };
}

export function useCCCardTypeAnalysis(dateRange = "All Time") {
  const [items, setItems] = useState<CCCardTypeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const { year, month, monthRange } = resolveCCDateRangeParams(dateRange);

    apiService
      .get<CCCardTypeItem[]>("/cc-card-type-analysis", { params: { year, month, monthRange } })
      .then((res) => {
        if (!cancelled) {
          setItems(
            (res.data ?? []).map((i) => ({
              ...i,
              totalSpend: Number(i.totalSpend),
              txnCount: Number(i.txnCount),
              percentage: Number(i.percentage),
            })),
          );
        }
      })
      .catch((err) => {
        if (!cancelled && !axios.isCancel(err)) {
          setError("Failed to load card type analysis.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dateRange]);

  return { items, loading, error };
}

export function useCCTopCards() {
  const [cards, setCards] = useState<CCTopCardItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    apiService
      .get<CCTopCardItem[]>("/cc-top-cards")
      .then((res) => {
        if (!cancelled) {
          setCards(
            (res.data ?? []).map((c) => ({
              ...c,
              usedAmount: Number(c.usedAmount),
              txnCount: Number(c.txnCount),
            })),
          );
        }
      })
      .catch((err) => {
        if (!cancelled && !axios.isCancel(err)) {
          setError("Failed to load top cards.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { cards, loading, error };
}

export interface CCEmployeeSpendingItem {
  name: string;
  email: string;
  totalAmount: number;
  txnCount: number;
}

export interface CCEmployeeCategoryItem {
  category: string;
  total: number;
  txnCount: number;
  percentage: number;
}

export interface CCEmployeeBreakdownResponse {
  name: string;
  email: string;
  totalAmount: number;
  txnCount: number;
  categories: CCEmployeeCategoryItem[];
}

export interface CCEmployeeCategoryTransactionItem {
  description: string;
  txnDate: string;
  amount: number;
  status: string;
}

function resolvePreset(preset: CCDateRangePreset | "This Year"): { year: string; month: string; monthRange: string } {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  switch (preset) {
    case "All Time":
      return { year: String(currentYear), month: String(currentMonth), monthRange: "0" };
    case "This Month":
      return { year: String(currentYear), month: String(currentMonth), monthRange: "1" };
    case "This Year":
      return { year: String(currentYear), month: String(currentMonth), monthRange: String(currentMonth) };
    case "Last Month": {
      const m = currentMonth === 1 ? 12 : currentMonth - 1;
      const y = currentMonth === 1 ? currentYear - 1 : currentYear;
      return { year: String(y), month: String(m), monthRange: "1" };
    }
    case "Last 3 Months":
      return { year: String(currentYear), month: String(currentMonth), monthRange: "3" };
    case "Last 6 Months":
      return { year: String(currentYear), month: String(currentMonth), monthRange: "6" };
    case "Last Year":
      return { year: String(currentYear - 1), month: "12", monthRange: "12" };
  }
}

export function resolveCCDateRangeParams(dateRange: string): { year: string; month: string; monthRange: string } {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // "custom:YYYY-M:YYYY-M" — arbitrary from/to month range
  if (dateRange.startsWith("custom:")) {
    const parts = dateRange.slice(7).split(":");
    if (parts.length === 2) {
      const [fromYear, fromMonth] = parts[0].split("-").map(Number);
      const [toYear, toMonth] = parts[1].split("-").map(Number);
      if (fromYear && fromMonth && toYear && toMonth) {
        const raw = (toYear - fromYear) * 12 + (toMonth - fromMonth) + 1;
        const monthRange = Math.max(1, raw);
        return { year: String(toYear), month: String(toMonth), monthRange: String(monthRange) };
      }
    }
  }

  const PRESETS = new Set<string>(["All Time", "This Month", "This Year", "Last Month", "Last 3 Months", "Last 6 Months", "Last Year"]);
  if (PRESETS.has(dateRange)) {
    return resolvePreset(dateRange as CCDateRangePreset | "This Year");
  }

  return { year: String(currentYear), month: String(currentMonth), monthRange: "0" };
}

export function useCCCategoryEmployees(category: string | null) {
  const [employees, setEmployees] = useState<CCEmployeeSpendingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!category) {
      setEmployees([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    apiService
      .get<CCEmployeeSpendingItem[]>("/cc-category-employees", {
        params: { category, monthRange: "0" },
      })
      .then((res) => {
        if (!cancelled) {
          setEmployees(
            (res.data ?? []).map((e) => ({
              ...e,
              totalAmount: Number(e.totalAmount),
              txnCount: Number(e.txnCount),
            })),
          );
        }
      })
      .catch((err) => {
        if (!cancelled && !axios.isCancel(err)) {
          setError("Failed to load category employees.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [category]);

  return { employees, loading, error };
}

export function useCCEmployeeSpendingList(dateRange: string) {
  const [employees, setEmployees] = useState<CCEmployeeSpendingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const { year, month, monthRange } = resolveCCDateRangeParams(dateRange);

    apiService
      .get<CCEmployeeSpendingItem[]>("/cc-employee-spending", { params: { year, month, monthRange } })
      .then((res) => {
        if (!cancelled) {
          setEmployees(
            (res.data ?? []).map((e) => ({
              ...e,
              totalAmount: Number(e.totalAmount),
              txnCount: Number(e.txnCount),
            })),
          );
        }
      })
      .catch((err) => {
        if (!cancelled && !axios.isCancel(err)) {
          setError("Failed to load CC employee spending.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dateRange]);

  return { employees, loading, error };
}

export function useCCEmployeeBreakdown(email: string | null, dateRange: string) {
  const [breakdown, setBreakdown] = useState<CCEmployeeBreakdownResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resolvedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!email) {
      setBreakdown(null);
      resolvedKeyRef.current = null;
      return;
    }

    const key = `${email}::${dateRange}`;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setBreakdown(null);

    const { year, month, monthRange } = resolveCCDateRangeParams(dateRange);

    apiService
      .get<CCEmployeeBreakdownResponse>("/cc-employee-breakdown", {
        params: { email, year, month, monthRange },
      })
      .then((res) => {
        if (!cancelled && res.data) {
          setBreakdown({
            ...res.data,
            totalAmount: Number(res.data.totalAmount),
            txnCount: Number(res.data.txnCount),
            categories: (res.data.categories ?? []).map((c) => ({
              ...c,
              total: Number(c.total),
              txnCount: Number(c.txnCount),
              percentage: Number(c.percentage),
            })),
          });
          resolvedKeyRef.current = key;
        }
      })
      .catch((err) => {
        if (!cancelled && !axios.isCancel(err)) {
          setError("Failed to load CC employee breakdown.");
          resolvedKeyRef.current = key;
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [email, dateRange]);

  const activeKey = email ? `${email}::${dateRange}` : null;
  const isStale = !!activeKey && activeKey !== resolvedKeyRef.current;

  return {
    breakdown: isStale ? null : breakdown,
    loading: loading || isStale,
    error,
  };
}

export function useCCEmployeeCategoryTransactions(
  email: string | null,
  category: string | null,
  dateRange: string,
) {
  const [transactions, setTransactions] = useState<CCEmployeeCategoryTransactionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<Map<string, CCEmployeeCategoryTransactionItem[]>>(new Map());
  const mountedRef = useRef(true);
  const reqCountRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchTransactions = useCallback(
    (emp: string, cat: string) => {
      const cacheKey = `${emp}::${cat}::${dateRange}`;
      const cached = cacheRef.current.get(cacheKey);
      if (cached) {
        setTransactions(cached);
        return;
      }

      setLoading(true);
      setError(null);

      const reqId = ++reqCountRef.current;
      const { year, month, monthRange } = resolveCCDateRangeParams(dateRange);

      apiService
        .get<CCEmployeeCategoryTransactionItem[]>("/cc-employee-category-transactions", {
          params: { email: emp, category: cat, year, month, monthRange },
        })
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
    [dateRange],
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

export function useCCCardList(dateRange = "All Time") {
  const [cards, setCards] = useState<CCCardListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const { year, month, monthRange } = resolveCCDateRangeParams(dateRange);

    apiService
      .get<CCCardListItem[]>("/cc-cards", { params: { year, month, monthRange } })
      .then((res) => {
        if (!cancelled) {
          setCards(
            (res.data ?? []).map((c) => ({
              ...c,
              usedAmount: Number(c.usedAmount),
            })),
          );
        }
      })
      .catch((err) => {
        if (!cancelled && !axios.isCancel(err)) {
          setError("Failed to load corporate cards.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dateRange]);

  return { cards, loading, error };
}
