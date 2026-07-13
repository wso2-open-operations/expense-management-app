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
import { DollarSign, Hash, TrendingUp } from "lucide-react";

export const SnackMessage = {
  success: {
    addCollections: "Successfully added the Collection",
  },
  error: {
    fetchCollectionsMessage: "Unable to retrieve list of selected Collections",
    addCollections: "Unable to create the Collection",
    insufficientPrivileges: "Insufficient Privileges",
    fetchPrivileges: "Failed to fetch Privileges",
    fetchContacts: "Unable to retrieve list of Contacts",
    fetchEmployees: "Unable to retrieve list of Employees",
    fetchCustomers: "Unable to retrieve list of Customers",
    fetchAppConfigMessage: "Unable to retrieve app configurations",
    fetchOpdStatus: "Unable to retrieve OPD Data",
    fetchOpdDataStatus:
      "Failed to load OPD claims data. Please check your connection and try again.",
    fetchOpdNetworkError: "Network error. Please check your internet connection.",
    fetchOpdServerError: "Server error. Please try again later.",
    fetchOpdTimeout: "Request timeout. Please try again.",
  },
  warning: {},
};

export const redirectUrl = "iapm-marketplace-redirect-url";
export const OPD_LOADING_MESSAGES = {
  LOADING_DATA: "Loading OPD claims data...",
};

export const OPD_CHART_CONFIG = {
  xAxisLabels: ["0-5K", "5K-10K", "10K-15K", "15K-20K", "20K-25K", "25K-30K", "30K-35K", "35K-40K"],
  yAxisLabels: [12, 9, 6, 3, 0],
  chartHeight: 300,
  maxBarValue: 12,
  barGap: "2px",
};

const currentYear = new Date().getFullYear();
const currentMonth = new Date().toLocaleString("default", { month: "long" });

export const OPD_SUMMARY_CARDS_CONFIG = {
  lastYearCard: {
    icon: DollarSign,
    iconBg: "#FFF7ED",
    iconColor: "#F97316",
    title: "Claim Amount in",
    chipLabel: `${currentYear}`,
    suffix: "LKR",
  },
  currentMonthCard: {
    icon: TrendingUp,
    iconBg: "#FFF7ED",
    iconColor: "#F97316",
    title: "Claim Amount in",
    chipLabel: `${currentMonth}`,
    suffix: "LKR",
  },
  previousYearCard: {
    icon: Hash,
    iconBg: "#FFF7ED",
    iconColor: "#F97316",
    title: "Number of Claims",
    chipLabel: `${currentYear - 1}`,
  },
};

export const OPD_SIDE_CARDS_CONFIG = {
  unclaimed: {
    title: "Unclaimed",
  },
  fullyClaimed: {
    title: "Fully Claimed",
  },
};

export const MONTH_OPTIONS = [
  { value: "all", label: "All Time" },
  { value: "current", label: "Current Month" },
  { value: "pastThree", label: "Past 3 Months" },
  { value: "pastSix", label: "Past 6 Months" },
  { value: "pastNine", label: "Past 9 Months" },
  { value: "pastTwelve", label: "Past 12 Months" },
];

// Expense Claims-specific period filter (Annually/Quarterly/Monthly), separate from
// MONTH_OPTIONS since that constant is also shared by OPD Claims and Lead Approval.
export const EXPENSE_PERIOD_OPTIONS = [
  { value: "annually", label: "Annually" },
  { value: "quarterly", label: "Quarterly" },
  { value: "monthly", label: "Monthly" },
];

export const EXPENSE_PERIOD_TO_DATE_RANGE: Record<string, string> = {
  annually: "Year to Date",
  quarterly: "Last 3 Months",
  monthly: "This Month",
};

export const EXPENSE_DATE_RANGE_TO_PERIOD: Record<string, string> = {
  "Year to Date": "annually",
  "Last 3 Months": "quarterly",
  "This Month": "monthly",
};

export const PAGE_SIZE_EMPLOYEES = 7;
export const PAGE_SIZE_LEADS = 7;
export const PAGE_SIZE_RECURRING = 8;
export const PAGE_SIZE_CC_CARDS = 10;

export const CC_DATE_RANGE_OPTIONS = [
  { value: "All Time", label: "All Time" },
  { value: "This Month", label: "This Month" },
  { value: "Last Month", label: "Last Month" },
  { value: "Last 3 Months", label: "Last 3 Months" },
  { value: "Last 6 Months", label: "Last 6 Months" },
  { value: "Last Year", label: "Last Year" },
] as const;

export type CCDateRangePreset = (typeof CC_DATE_RANGE_OPTIONS)[number]["value"];

export const MS_PER_DAY = 86_400_000;
export const DAYS_PER_MONTH = 30;

export const HIGH_FREQ_THRESHOLD = 1 / 7;
export const MED_FREQ_THRESHOLD = 1 / 30;

export const RESP_FAST_DAYS = 2;
export const RESP_MED_DAYS = 7;

export const FREQ_HIGH_COLOR = "#2E8B57";
export const FREQ_MED_COLOR = "#F4B400";
export const FREQ_LOW_COLOR = "#9E9E9E";
export const FREQ_HIGH_BG = "#E8F5E9";
export const FREQ_MED_BG = "#FFF8E1";
export const FREQ_LOW_BG = "#F5F5F5";

export const DEFAULT_CURRENCY = "LKR";

export const ACTIVE_CLAIM_STATUS_LABEL_MAP: Record<string, string> = {
  Draft: "Claims Submitted",
  Submitted: "Claims Submitted",
  "Lead Approved": "Lead Approved",
  "Finance Approved": "Finance Approved",
  Rejected: "Rejected",
};

export const ACTIVE_CLAIM_STATUS_ORDER = [
  "Claims Submitted",
  "Lead Approved",
  "Finance Approved",
  "Rejected",
] as const;

export const PERIOD_TO_DATE_RANGE: Record<string, string> = {
  all: "All Time",
  current: "This Month",
  pastThree: "Last 3 Months",
  pastSix: "Last 6 Months",
  pastNine: "Last 9 Months",
  pastTwelve: "Year to Date",
};

export const DATE_RANGE_TO_PERIOD: Record<string, string> = {
  "All Time": "all",
  "This Month": "current",
  "Last Month": "current",
  "Last 3 Months": "pastThree",
  "Last 6 Months": "pastSix",
  "Last 9 Months": "pastNine",
  "Year to Date": "pastTwelve",
  "Last Year": "pastTwelve",
};
