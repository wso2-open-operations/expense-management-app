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
import dayjs, { type Dayjs } from "dayjs";

import { useEffect, useMemo, useState } from "react";

import ChartCard from "@component/chart/ChartCard";
import DateRangePickerButton from "@component/common/DateRangePickerButton";
import PaginationBar from "@component/common/PaginationBar";
import SearchBox from "@component/common/SearchBox";
import { PAGE_SIZE_LEADS } from "@config/constant";
import {
  type LeadFrequencyItem,
  formatResponseTime,
  useLeadFrequencyList,
} from "@slices/expenseSlice/useLeadApprovalFrequency";
import { type CurrencyCode } from "@utils/currency";
import { type TopLeadItem } from "@view/expense/data/mockData";

import LeadApprovalFrequencyModal from "./LeadApprovalFrequencyModal";

function toFrequencyItem(lead: TopLeadItem): LeadFrequencyItem {
  return {
    name: lead.name,
    email: lead.email,
    bu: lead.bu,
    totalApproved: lead.count,
    avgFrequencyPerDay: 0,
    avgResponseDays: 0,
    firstApprovedDate: null,
    lastApprovedDate: null,
  };
}

interface LeadApprovalFrequencyPanelProps {
  dateRange: string;
  businessUnit: string;
  currency: CurrencyCode;
  rangeFromDate: string;
  rangeToDate: string;
  onRangeFromChange: (d: Dayjs) => void;
  onRangeToChange: (d: Dayjs) => void;
  fallbackLeads?: TopLeadItem[];
}

function LeadRow({
  lead,
  onClick,
}: {
  lead: LeadFrequencyItem;
  onClick: () => void;
}) {
  const freqLabel = formatResponseTime(lead.avgResponseDays);

  const lastDate = lead.lastApprovedDate
    ? new Date(lead.lastApprovedDate).toLocaleString("default", {
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <Box
      onClick={onClick}
      sx={{
        display: "flex",
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
        gap: 1.5,
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
          {lead.name}
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
          {lead.email}
        </Typography>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexShrink: 0 }}>
        <Box
          sx={{
            px: 1,
            py: 0.25,
            borderRadius: 1,
            bgcolor: lead.avgResponseDays > 0 ? "#FEF0EB" : "action.hover",
            minWidth: 110,
            textAlign: "center",
          }}
        >
          <Typography
            sx={{
              fontSize: 11,
              fontWeight: 700,
              color: lead.avgResponseDays > 0 ? "#E8420A" : "text.disabled",
              whiteSpace: "nowrap",
            }}
          >
            {freqLabel}
          </Typography>
        </Box>

        <Box sx={{ textAlign: "right", minWidth: 80 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: "text.primary" }}>
            {lead.totalApproved.toLocaleString()} <Typography component="span" sx={{ fontSize: 11, fontWeight: 400, color: "text.disabled" }}>claims</Typography>
          </Typography>
          <Typography sx={{ fontSize: 10, color: "text.disabled" }}>
            {lastDate ? `Last: ${lastDate}` : ""}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

export default function LeadApprovalFrequencyPanel({
  dateRange,
  businessUnit,
  currency,
  rangeFromDate,
  rangeToDate,
  onRangeFromChange,
  onRangeToChange,
  fallbackLeads = [],
}: LeadApprovalFrequencyPanelProps) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selectedLead, setSelectedLead] = useState<LeadFrequencyItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { leads: apiLeads, loading, error } = useLeadFrequencyList(dateRange, businessUnit);

  const usingFallback = apiLeads.length === 0 && fallbackLeads.length > 0;
  const leads = usingFallback ? fallbackLeads.map(toFrequencyItem) : apiLeads;

  const sorted = useMemo(
    () =>
      [...leads].sort((a, b) => {
        if (a.avgResponseDays === 0 && b.avgResponseDays > 0) return 1;
        if (b.avgResponseDays === 0 && a.avgResponseDays > 0) return -1;
        if (a.avgResponseDays !== b.avgResponseDays) return a.avgResponseDays - b.avgResponseDays;
        return b.totalApproved - a.totalApproved;
      }),
    [leads],
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return sorted;
    const q = search.toLowerCase();
    return sorted.filter(
      (l) => l.name.toLowerCase().includes(q) || l.email.toLowerCase().includes(q),
    );
  }, [sorted, search]);

  useEffect(() => { setPage(0); }, [search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE_LEADS);
  const paginated = filtered.slice(page * PAGE_SIZE_LEADS, (page + 1) * PAGE_SIZE_LEADS);

  const handleLeadClick = (lead: LeadFrequencyItem) => {
    setSelectedLead(lead);
    setModalOpen(true);
  };

  return (
    <>
      <ChartCard
        title="Lead Approval Breakdown"
        subtitle="Average days from claim submission to lead approval"
        minHeight={420}
        action={
          <DateRangePickerButton
            fromDate={dayjs(rangeFromDate)}
            toDate={dayjs(rangeToDate)}
            onFromChange={onRangeFromChange}
            onToChange={onRangeToChange}
            maxTo={dayjs()}
          />
        }
      >
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="Search leads by name or email..."
        />

        <Box>
          {loading ? (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              {[...Array(PAGE_SIZE_LEADS)].map((_, i) => (
                <Skeleton key={i} variant="rectangular" height={58} sx={{ borderRadius: 1.5 }} />
              ))}
            </Box>
          ) : error && !usingFallback ? (
            <Box sx={{ py: 6, textAlign: "center" }}>
              <Typography sx={{ color: "error.main", fontSize: 13 }}>{error}</Typography>
            </Box>
          ) : filtered.length === 0 ? (
            <Box sx={{ py: 6, textAlign: "center" }}>
              <Typography sx={{ color: "text.disabled", fontSize: 13 }}>
                {search ? "No leads match your search" : "No lead approval data available"}
              </Typography>
            </Box>
          ) : (
            <>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                {[...Array(PAGE_SIZE_LEADS)].map((_, i) => {
                  const lead = paginated[i];
                  if (!lead) {
                    return (
                      <Box
                        key={`placeholder-${i}`}
                        sx={{ height: 58, borderRadius: 1.5, border: "1px solid transparent" }}
                      />
                    );
                  }
                  return (
                    <LeadRow
                      key={lead.email}
                      lead={lead}
                      onClick={() => handleLeadClick(lead)}
                    />
                  );
                })}
              </Box>

              <PaginationBar page={page} totalPages={totalPages} onPageChange={setPage} />
            </>
          )}
        </Box>
      </ChartCard>

      <LeadApprovalFrequencyModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        leadEmail={selectedLead?.email ?? null}
        leadName={selectedLead?.name ?? ""}
        dateRange={dateRange}
        currency={currency}
      />
    </>
  );
}
