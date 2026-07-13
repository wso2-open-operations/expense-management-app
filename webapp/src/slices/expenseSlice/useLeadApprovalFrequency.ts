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

import { useEffect, useState } from "react";

import {
  DAYS_PER_MONTH,
  FREQ_HIGH_BG,
  FREQ_HIGH_COLOR,
  FREQ_LOW_BG,
  FREQ_LOW_COLOR,
  FREQ_MED_BG,
  FREQ_MED_COLOR,
  HIGH_FREQ_THRESHOLD,
  MED_FREQ_THRESHOLD,
  MS_PER_DAY,
  RESP_FAST_DAYS,
  RESP_MED_DAYS,
} from "@config/constant";
import { apiService } from "@utils/apiService";

import { resolveDateRangeParams } from "./useEmployeeSpending";

export interface LeadFrequencyItem {
  name: string;
  email: string;
  bu: string;
  totalApproved: number;
  avgFrequencyPerDay: number;
  avgResponseDays: number;
  firstApprovedDate: string | null;
  lastApprovedDate: string | null;
}

export interface LeadClaimTypeBreakdown {
  type: string;
  count: number;
  totalAmount: number;
}

export interface LeadApprovedClaim {
  claimId: string;
  employeeName: string;
  claimType: string;
  subCategory: string;
  amount: number;
  category: string | null;
  submittedDate: string | null;
  approvedDate: string | null;
  status: string;
}

export interface LeadApprovalDetail {
  name: string;
  email: string;
  totalApproved: number;
  avgFrequencyPerDay: number;
  avgResponseDays: number;
  firstApprovedDate: string | null;
  lastApprovedDate: string | null;
  claimTypeBreakdown: LeadClaimTypeBreakdown[];
  claims: LeadApprovedClaim[];
}

export function formatApprovalFrequency(claimsPerDay: number): string {
  if (claimsPerDay <= 0) return "No activity";
  return `${(claimsPerDay * DAYS_PER_MONTH).toFixed(1)} claims/month`;
}

export function getFrequencyStyle(claimsPerDay: number): { color: string; bg: string } {
  if (claimsPerDay >= HIGH_FREQ_THRESHOLD) return { color: FREQ_HIGH_COLOR, bg: FREQ_HIGH_BG };
  if (claimsPerDay >= MED_FREQ_THRESHOLD) return { color: FREQ_MED_COLOR, bg: FREQ_MED_BG };
  return { color: FREQ_LOW_COLOR, bg: FREQ_LOW_BG };
}

export function formatResponseTime(days: number): string {
  if (days <= 0) return "No data";
  if (days < 1) return "< 1 day avg";
  return `${days.toFixed(1)} days avg`;
}

export function getResponseTimeStyle(avgResponseDays: number): { color: string; bg: string } {
  if (avgResponseDays <= 0) return { color: FREQ_LOW_COLOR, bg: FREQ_LOW_BG };
  if (avgResponseDays <= RESP_FAST_DAYS) return { color: FREQ_HIGH_COLOR, bg: FREQ_HIGH_BG };
  if (avgResponseDays <= RESP_MED_DAYS) return { color: FREQ_MED_COLOR, bg: FREQ_MED_BG };
  return { color: FREQ_LOW_COLOR, bg: FREQ_LOW_BG };
}

function computeFreq(total: number, first: string, last: string): number {
  const days = Math.max(
    1,
    Math.round(Math.abs(new Date(last).getTime() - new Date(first).getTime()) / MS_PER_DAY),
  );
  return total / days;
}

export function calcDaysBetween(dateA: string | null, dateB: string | null): number | null {
  if (!dateA || !dateB) return null;
  const a = new Date(dateA).getTime();
  const b = new Date(dateB).getTime();
  if (isNaN(a) || isNaN(b)) return null;
  return Math.round(Math.abs(b - a) / MS_PER_DAY);
}

export function useLeadFrequencyList(dateRange: string, businessUnit: string) {
  const [leads, setLeads] = useState<LeadFrequencyItem[]>([]);
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
      .get<LeadFrequencyItem[]>("/lead-approval-frequency", { params })
      .then((res) => {
        if (!cancelled) {
          const items = res.data ?? [];
          const mapped = items.map((l) => ({
            ...l,
            totalApproved: Number(l.totalApproved),
            avgFrequencyPerDay:
              Number(l.avgFrequencyPerDay) ||
              computeFreq(
                Number(l.totalApproved),
                l.firstApprovedDate ?? "",
                l.lastApprovedDate ?? "",
              ),
            avgResponseDays: Number(l.avgResponseDays) || 0,
          }));

          // The backend groups by a trimmed/split lead_email, which can still yield
          // multiple rows for the same lead (case/whitespace variance, multi-lead
          // ordering). Merge those rows here so each lead appears once.
          const deduped = new Map<string, LeadFrequencyItem>();
          for (const l of mapped) {
            const key = l.email.trim().toLowerCase();
            const existing = deduped.get(key);
            if (existing) {
              const combinedApproved = existing.totalApproved + l.totalApproved;
              existing.avgResponseDays =
                combinedApproved > 0
                  ? (existing.avgResponseDays * existing.totalApproved +
                      l.avgResponseDays * l.totalApproved) /
                    combinedApproved
                  : 0;
              existing.totalApproved = combinedApproved;
              existing.firstApprovedDate = [existing.firstApprovedDate, l.firstApprovedDate]
                .filter((d): d is string => !!d)
                .sort()[0] ?? null;
              existing.lastApprovedDate = [existing.lastApprovedDate, l.lastApprovedDate]
                .filter((d): d is string => !!d)
                .sort()
                .pop() ?? null;
              existing.avgFrequencyPerDay = computeFreq(
                existing.totalApproved,
                existing.firstApprovedDate ?? "",
                existing.lastApprovedDate ?? "",
              );
            } else {
              deduped.set(key, { ...l });
            }
          }
          setLeads([...deduped.values()]);
        }
      })
      .catch((err) => {
        if (!cancelled && !axios.isCancel(err)) {
          setError("Failed to load lead approval frequency.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dateRange, businessUnit]);

  return { leads, loading, error };
}

export function useLeadApprovalDetail(email: string | null, dateRange: string) {
  const [detail, setDetail] = useState<LeadApprovalDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!email) {
      setDetail(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setDetail(null);

    const { year, month, monthRange } = resolveDateRangeParams(dateRange);

    apiService
      .get<LeadApprovalDetail>("/lead-approval-detail", {
        params: { email, year, month, monthRange },
      })
      .then((res) => {
        if (!cancelled && res.data) {
          const d = res.data;
          const firstDate: string | null = d.firstApprovedDate ?? null;
          const computedFreq =
            Number(d.avgFrequencyPerDay) ||
            computeFreq(Number(d.totalApproved), firstDate ?? "", d.lastApprovedDate ?? "");
          const mappedClaims = (d.claims ?? []).map((c) => ({
              ...c,
              amount: Number(c.amount),
              subCategory: c.subCategory ?? c.claimType,
            }));
          const delays = mappedClaims
            .map((c) => calcDaysBetween(c.submittedDate, c.approvedDate))
            .filter((v): v is number => v !== null);
          const avgResponseDays =
            delays.length > 0 ? delays.reduce((a, b) => a + b, 0) / delays.length : 0;
          setDetail({
              ...d,
              totalApproved: Number(d.totalApproved),
              avgFrequencyPerDay: computedFreq,
              avgResponseDays,
              claimTypeBreakdown: (d.claimTypeBreakdown ?? []).map((c) => ({
                ...c,
                count: Number(c.count),
                totalAmount: Number(c.totalAmount),
              })),
              claims: mappedClaims,
            });
        }
      })
      .catch((err) => {
        if (!cancelled && !axios.isCancel(err)) {
          setError("Failed to load lead approval details.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [email, dateRange]);

  return { detail, loading, error };
}
