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
import { PayloadAction, createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";

import { useEffect, useState } from "react";

import type { AppDispatch, RootState } from "@slices/store";
import { apiService } from "@utils/apiService";
import {
  ACTIVE_CLAIM_STATUS_LABEL_MAP,
  ACTIVE_CLAIM_STATUS_ORDER,
} from "@config/constant";
import { resolveDateRangeParams } from "@slices/expenseSlice/useEmployeeSpending";
import {
  type ActiveClaimStatItem,
  type BuExpenseItem,
  
  type ExpenseFilters,
  type ExpenseTypeItem,
  INITIAL_FILTERS,
  type LeadApprovalFrequencyItem,
  type TopEmployeeItem,
  type TopLeadItem,
} from "@view/expense/data/mockData";

export interface ExpenseClaimsData {
  totalClaimAmount: number;
  totalClaimCount: number;
  pendingClaims: number;
  approvedClaims: number;
  rejectedClaims: number;
  avgClaimAmount: number;
  buExpenses: BuExpenseItem[];
  recurringExpenseTypes: ExpenseTypeItem[];
  activeClaimStats: ActiveClaimStatItem[];
  topSpendingEmployees: TopEmployeeItem[];
  leadApprovalFrequency: LeadApprovalFrequencyItem[];
  topApprovingLeads: TopLeadItem[];
  trendTotalAmount: number;
  trendTotalCount: number;
  trendApproved: number;
  trendAvgAmount: number;
}

export interface ExpenseClaimsState {
  data: ExpenseClaimsData;
  filters: ExpenseFilters;
  loading: boolean;
  error: string | null;
}

export const DEFAULT_EXPENSE_DATA: ExpenseClaimsData = {
  totalClaimAmount: 0,
  totalClaimCount: 0,
  pendingClaims: 0,
  approvedClaims: 0,
  rejectedClaims: 0,
  avgClaimAmount: 0,
  buExpenses: [],
  recurringExpenseTypes: [],
  activeClaimStats: [],
  topSpendingEmployees: [],
  leadApprovalFrequency: [],
  topApprovingLeads: [],
  trendTotalAmount: 0,
  trendTotalCount: 0,
  trendApproved: 0,
  trendAvgAmount: 0,
};

const initialState: ExpenseClaimsState = {
  data: DEFAULT_EXPENSE_DATA,
  filters: INITIAL_FILTERS,
  loading: false,
  error: null,
};

interface BackendExpenseClaimsData {
  totalClaimAmount?: number;
  totalClaimCount?: number;
  pendingClaims?: number;
  approvedClaims?: number;
  rejectedClaims?: number;
  avgClaimAmount?: number;
  buExpenses?: BuExpenseItem[];
  recurringExpenseTypes?: { name: string; category?: string; amount: number }[];
  activeClaimStats?: ActiveClaimStatItem[];
  topSpendingEmployees?: TopEmployeeItem[];
  leadApprovalFrequency?: LeadApprovalFrequencyItem[];
  topApprovingLeads?: TopLeadItem[];
  trendTotalAmount?: number;
  trendTotalCount?: number;
  trendApproved?: number;
  trendAvgAmount?: number;
}

const normalizeExpenseClaimsData = (
  data?: Partial<BackendExpenseClaimsData> | null,
): ExpenseClaimsData => {
  const normalizedClaimStats =
    data?.activeClaimStats?.map((a) => ({
      label: ACTIVE_CLAIM_STATUS_LABEL_MAP[a.label] ?? a.label,
      value: Number(a.value),
    })) ?? DEFAULT_EXPENSE_DATA.activeClaimStats;

  const groupedClaimStats = normalizedClaimStats.reduce<Record<string, number>>((acc, stat) => {
    acc[stat.label] = (acc[stat.label] ?? 0) + stat.value;
    return acc;
  }, {});

  const orderedClaimStats = ACTIVE_CLAIM_STATUS_ORDER
    .filter((label) => groupedClaimStats[label] !== undefined)
    .map((label) => ({
      label,
      value: groupedClaimStats[label],
    }));

  return {
  totalClaimAmount: data?.totalClaimAmount ?? DEFAULT_EXPENSE_DATA.totalClaimAmount,
  totalClaimCount: data?.totalClaimCount ?? DEFAULT_EXPENSE_DATA.totalClaimCount,
  pendingClaims: data?.pendingClaims ?? DEFAULT_EXPENSE_DATA.pendingClaims,
  approvedClaims: data?.approvedClaims ?? DEFAULT_EXPENSE_DATA.approvedClaims,
  rejectedClaims: data?.rejectedClaims ?? DEFAULT_EXPENSE_DATA.rejectedClaims,
  avgClaimAmount: data?.avgClaimAmount ?? DEFAULT_EXPENSE_DATA.avgClaimAmount,
  buExpenses:
    data?.buExpenses?.map((b) => ({ label: b.label, value: Number(b.value) })) ??
    DEFAULT_EXPENSE_DATA.buExpenses,
  recurringExpenseTypes:
    data?.recurringExpenseTypes?.map((r) => ({
      name: r.name,
      category: r.category ?? "",
      amount: Number(r.amount),
    })) ?? DEFAULT_EXPENSE_DATA.recurringExpenseTypes,
  activeClaimStats: orderedClaimStats,
  topSpendingEmployees:
    data?.topSpendingEmployees?.map((e) => ({
      name: e.name,
      email: e.email,
      bu: e.bu,
      amount: Number(e.amount),
    })) ?? DEFAULT_EXPENSE_DATA.topSpendingEmployees,
  leadApprovalFrequency:
    data?.leadApprovalFrequency?.map((item) => ({
      label: item.label,
      value: Number(item.value),
    })) ?? DEFAULT_EXPENSE_DATA.leadApprovalFrequency,
  topApprovingLeads:
    data?.topApprovingLeads?.map((l) => ({
      name: l.name,
      email: l.email,
      bu: l.bu,
      count: Number(l.count),
    })) ?? DEFAULT_EXPENSE_DATA.topApprovingLeads,
  trendTotalAmount: data?.trendTotalAmount ?? DEFAULT_EXPENSE_DATA.trendTotalAmount,
  trendTotalCount: data?.trendTotalCount ?? DEFAULT_EXPENSE_DATA.trendTotalCount,
  trendApproved: data?.trendApproved ?? DEFAULT_EXPENSE_DATA.trendApproved,
  trendAvgAmount: data?.trendAvgAmount ?? DEFAULT_EXPENSE_DATA.trendAvgAmount,
  };
};

export const fetchExpenseClaims = createAsyncThunk<
  ExpenseClaimsData,
  { filters: ExpenseFilters },
  { rejectValue: string }
>("expenseClaims/fetchExpenseClaims", async ({ filters }, { rejectWithValue }) => {
  try {
    const { year, month, monthRange } = resolveDateRangeParams(filters.dateRange);
    const params: Record<string, string> = { year, month, monthRange };

    if (filters.businessUnit && filters.businessUnit !== "All Business Units") {
      params.businessUnit = filters.businessUnit;
    }

    const response = await apiService.get<BackendExpenseClaimsData | null>("/expense-claims", {
      params,
    });
    return normalizeExpenseClaimsData(response?.data);
  } catch (err) {
    if (axios.isCancel(err)) {
      return DEFAULT_EXPENSE_DATA;
    }
    console.warn("Error fetching expense claims:", err);
    return rejectWithValue("Failed to load expense claims data.");
  }
});

const expenseClaimsSlice = createSlice({
  name: "expenseClaims",
  initialState,
  reducers: {
    setFilters(state, action: PayloadAction<ExpenseFilters>) {
      state.filters = action.payload;
    },
    resetExpenseClaims() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchExpenseClaims.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchExpenseClaims.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchExpenseClaims.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "Unexpected error occurred.";
      });
  },
});

export const { setFilters, resetExpenseClaims } = expenseClaimsSlice.actions;
export default expenseClaimsSlice.reducer;

type RootStateWithExpenseClaims = RootState & { expenseClaims: ExpenseClaimsState };

export const selectExpenseClaimsState = (state: RootState) =>
  (state as RootStateWithExpenseClaims).expenseClaims;
export const selectExpenseClaimsData = (state: RootState) => selectExpenseClaimsState(state).data;
export const selectExpenseClaimsLoading = (state: RootState) =>
  selectExpenseClaimsState(state).loading;
export const selectExpenseClaimsError = (state: RootState) => selectExpenseClaimsState(state).error;
export const selectExpenseClaimsFilters = (state: RootState) =>
  selectExpenseClaimsState(state).filters;

// Fetches recurringExpenseTypes independently of the Redux-backed filters, so the
// Expense Type Breakdown card can run its own date range instead of the page-wide one.
export function useRecurringExpenseTypes(dateRange: string, businessUnit: string) {
  const [recurringExpenseTypes, setRecurringExpenseTypes] = useState<ExpenseTypeItem[]>(
    DEFAULT_EXPENSE_DATA.recurringExpenseTypes,
  );
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
      .get<BackendExpenseClaimsData | null>("/expense-claims", { params })
      .then((res) => {
        if (!cancelled) {
          setRecurringExpenseTypes(normalizeExpenseClaimsData(res?.data).recurringExpenseTypes);
        }
      })
      .catch((err) => {
        if (!cancelled && !axios.isCancel(err)) {
          setError("Failed to load expense type breakdown.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dateRange, businessUnit]);

  return { recurringExpenseTypes, loading, error };
}

export function useExpenseClaims() {
  const dispatch = useDispatch<AppDispatch>();
  const { data, filters, loading, error } = useSelector(selectExpenseClaimsState);

  useEffect(() => {
    void dispatch(fetchExpenseClaims({ filters }));
  }, [dispatch, filters]);

  const handleFiltersChange = (newFilters: ExpenseFilters) => {
    dispatch(setFilters(newFilters));
  };

  return {
    data,
    filters,
    loading,
    error,
    handleFiltersChange,
  };
}

