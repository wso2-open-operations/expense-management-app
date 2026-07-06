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
import * as XLSX from "xlsx";

import {
  CC_CARDS_COLS,
  CC_CATEGORY_COLS,
  CC_EMP_CATEGORY_COLS,
  CC_EMP_SUMMARY_FIELDS,
  EMP_CATEGORY_COLS,
  EMP_SUMMARY_FIELDS,
  LEAD_BY_EMPLOYEE_COLS,
  LEAD_CATEGORY_COLS,
  LEAD_CLAIMS_COLS,
  LEAD_CLAIMS_EXTRA_COLS,
  LEAD_SUMMARY_FIELDS,
} from "@config/exportLabels";

function sanitizeCell(v: unknown): unknown {
  if (typeof v === "string" && /^[=+\-@]/.test(v)) {
    return `'${v}`;
  }
  return v;
}

function addSheet(wb: XLSX.WorkBook, name: string, rows: unknown[][]): void {
  const sanitized = rows.map((row) => row.map(sanitizeCell));
  const ws = XLSX.utils.aoa_to_sheet(sanitized);
  applyAutoWidths(ws);
  XLSX.utils.book_append_sheet(wb, ws, name);
}

function applyAutoWidths(ws: XLSX.WorkSheet): void {
  const ref = ws["!ref"];
  if (!ref) return;
  const range = XLSX.utils.decode_range(ref);
  const colWidths: number[] = [];
  for (let R = range.s.r; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
      const len = cell ? String(cell.v ?? "").length : 0;
      colWidths[C] = Math.max(colWidths[C] ?? 8, len);
    }
  }
  ws["!cols"] = colWidths.map((w) => ({ wch: Math.min(w + 3, 55) }));
}

function safeFileName(name: string): string {
  const safe = name.replace(/[^a-zA-Z0-9]/g, "_").replace(/^_+|_+$/g, "");
  return safe || "export";
}

export interface EmployeeBreakdownExportParams {
  name: string;
  email: string;
  dateRange: string;
  statusTab: string;
  currency: string;
  totalAmount: number;
  claimCount: number;
  compLabel: string;
  prevTotalAmount: number;
  prevClaimCount: number;
  categories: Array<{
    category: string;
    total: number;
    claimCount: number;
    percentage: number;
    compTotal: number;
    compClaimCount: number;
    subCategories: Array<{ name: string; currentTotal: number; compTotal: number }>;
  }>;
}

export function exportEmployeeBreakdown(p: EmployeeBreakdownExportParams): void {
  const wb = XLSX.utils.book_new();
  const compLabel = p.compLabel;

  addSheet(wb, "Summary", [
    ["Field", "Value"],
    [EMP_SUMMARY_FIELDS.employeeName, p.name],
    [EMP_SUMMARY_FIELDS.email,        p.email],
    [EMP_SUMMARY_FIELDS.period,       p.dateRange],
    [EMP_SUMMARY_FIELDS.statusFilter, p.statusTab],
    [EMP_SUMMARY_FIELDS.currency,     p.currency],
    [],
    ["", "Current Period", compLabel],
    [EMP_SUMMARY_FIELDS.totalAmount, p.totalAmount, p.prevTotalAmount],
    [EMP_SUMMARY_FIELDS.totalClaims, p.claimCount,  p.prevClaimCount],
  ]);

  const breakdownRows: unknown[][] = [
    [
      EMP_CATEGORY_COLS.category,
      EMP_CATEGORY_COLS.subCategory,
      `${compLabel} ${EMP_CATEGORY_COLS.compAmount} (${p.currency})`,
      `${compLabel} ${EMP_CATEGORY_COLS.compClaims}`,
      `${EMP_CATEGORY_COLS.currentAmount} (${p.currency})`,
      EMP_CATEGORY_COLS.currentClaims,
      EMP_CATEGORY_COLS.pctOfTotal,
      EMP_CATEGORY_COLS.change,
    ],
  ];
  for (const cat of p.categories) {
    const change =
      cat.compTotal > 0
        ? `${(((cat.total - cat.compTotal) / cat.compTotal) * 100).toFixed(1)}%`
        : cat.total > 0
          ? "+100%"
          : "—";
    breakdownRows.push([cat.category, "", cat.compTotal || "—", cat.compClaimCount || "—", cat.total, cat.claimCount, `${cat.percentage.toFixed(1)}%`, change]);
    for (const sub of cat.subCategories) {
      breakdownRows.push(["", sub.name, sub.compTotal || "—", "", sub.currentTotal, "", "", ""]);
    }
  }
  addSheet(wb, "Category Breakdown", breakdownRows);

  XLSX.writeFile(
    wb,
    `employee-breakdown-${safeFileName(p.name)}-${safeFileName(p.dateRange)}.xlsx`,
  );
}

export interface LeadApprovalsExportParams {
  name: string;
  email: string;
  dateRange: string;
  currency: string;
  totalApproved: number;
  avgResponseDays: number;
  firstApprovedDate: string | null;
  lastApprovedDate: string | null;
  categoryBreakdown: Array<{
    type: string;
    totalAmount: number;
    count: number;
    subCategories: Array<{ name: string; totalAmount: number; count: number }>;
  }>;
  employeeBreakdown: Array<{
    name: string;
    count: number;
    amount: number;
  }>;
  claims: Array<{
    claimId: string;
    employeeName: string;
    claimType: string;
    subCategory: string;
    category: string | null;
    amount: number;
    submittedDate: string | null;
    approvedDate: string | null;
    status: string;
  }>;
}

export function exportLeadApprovals(p: LeadApprovalsExportParams): void {
  const wb = XLSX.utils.book_new();

  addSheet(wb, "Lead Summary", [
    ["Field", "Value"],
    [LEAD_SUMMARY_FIELDS.leadName,          p.name],
    [LEAD_SUMMARY_FIELDS.email,             p.email],
    [LEAD_SUMMARY_FIELDS.period,            p.dateRange],
    [LEAD_SUMMARY_FIELDS.currency,          p.currency],
    [LEAD_SUMMARY_FIELDS.totalApprovals,    p.totalApproved],
    [LEAD_SUMMARY_FIELDS.avgResponseTime,   p.avgResponseDays > 0 ? p.avgResponseDays : "—"],
    [LEAD_SUMMARY_FIELDS.firstApprovalDate, p.firstApprovedDate ?? "—"],
    [LEAD_SUMMARY_FIELDS.lastApprovalDate,  p.lastApprovedDate ?? "—"],
  ]);

  const grandTotal = p.categoryBreakdown.reduce((s, c) => s + c.totalAmount, 0);
  const catBreakdownRows: unknown[][] = [
    [
      LEAD_CATEGORY_COLS.category,
      LEAD_CATEGORY_COLS.subCategory,
      LEAD_CATEGORY_COLS.claims,
      `${LEAD_CATEGORY_COLS.amount} (${p.currency})`,
      LEAD_CATEGORY_COLS.pctOfTotal,
    ],
  ];
  for (const cat of p.categoryBreakdown) {
    const pct = grandTotal > 0 ? ((cat.totalAmount / grandTotal) * 100).toFixed(1) : "0.0";
    catBreakdownRows.push([cat.type, "", cat.count, cat.totalAmount, `${pct}%`]);
    for (const sub of cat.subCategories) {
      const subPct = grandTotal > 0 ? ((sub.totalAmount / grandTotal) * 100).toFixed(1) : "0.0";
      catBreakdownRows.push(["", sub.name, sub.count, sub.totalAmount, `${subPct}%`]);
    }
  }
  addSheet(wb, "Category Breakdown", catBreakdownRows);

  addSheet(wb, "By Employee", [
    [
      LEAD_BY_EMPLOYEE_COLS.employee,
      LEAD_BY_EMPLOYEE_COLS.claimsApproved,
      `${LEAD_BY_EMPLOYEE_COLS.totalAmount} (${p.currency})`,
    ],
    ...p.employeeBreakdown.map((e) => [e.name, e.count, e.amount]),
  ]);

  const claimCols = LEAD_CLAIMS_COLS;
  const claimRows = p.claims.map((c) => {
    let delay: number | string = "—";
    if (c.submittedDate && c.approvedDate) {
      const approvedMs = new Date(c.approvedDate).getTime();
      const submittedMs = new Date(c.submittedDate).getTime();
      if (!Number.isNaN(approvedMs) && !Number.isNaN(submittedMs)) {
        delay = Math.round((approvedMs - submittedMs) / (1000 * 60 * 60 * 24));
      }
    }
    return [
      c.claimId,
      c.employeeName,
      c.subCategory,
      c.category ?? "—",
      c.amount,
      c.submittedDate ?? "—",
      c.approvedDate ?? "—",
      delay,
      c.status,
    ];
  });
  addSheet(wb, "Approved Claims", [
    [
      LEAD_CLAIMS_EXTRA_COLS.claimId,
      claimCols[0].label,                      // Employee
      claimCols[1].label,                      // Sub Category
      claimCols[2].label,                      // Category
      `${claimCols[3].label} (${p.currency})`, // Amount
      claimCols[4].label,                      // Submitted Date
      claimCols[5].label,                      // Approved Date
      claimCols[6].label,                      // Delay (days)
      claimCols[7].label,                      // Status
    ],
    ...claimRows,
  ]);

  XLSX.writeFile(
    wb,
    `lead-approvals-${safeFileName(p.name)}-${safeFileName(p.dateRange)}.xlsx`,
  );
}

export interface CCCardDetailsExportParams {
  holderName: string;
  holderEmail: string;
  cardId: string;
  cardNumber: string;
  cardType: string;
  status: string;
  currency: string;
  totalSpend: number;
  txnCount: number;
  dateRange: string;
  categories: Array<{
    category: string;
    total: number;
    txnCount: number;
    percentage: number;
    compTotal: number;
    compTxnCount: number;
  }>;
}

export function exportCCCardDetails(p: CCCardDetailsExportParams): void {
  const wb = XLSX.utils.book_new();

  addSheet(wb, "Summary", [
    ["Field", "Value"],
    ["Cardholder",     p.holderName],
    ["Email",          p.holderEmail],
    ["Card ID",        p.cardId],
    ["Card Number",    p.cardNumber],
    ["Provider",       p.cardType],
    ["Status",         p.status],
    ["Period",         p.dateRange],
    ["Currency",       p.currency],
    [`Total Spend (${p.currency})`, p.totalSpend],
    ["Total Transactions", p.txnCount],
  ]);

  addSheet(wb, "Category Breakdown", [
    ["Category", `Amount (${p.currency})`, "Transactions", "% of Total"],
    ...p.categories.map((c) => [c.category, c.total, c.txnCount, `${c.percentage.toFixed(1)}%`]),
  ]);

  XLSX.writeFile(wb, `cc-card-${safeFileName(p.holderName)}-${safeFileName(p.cardNumber)}.xlsx`);
}

export interface CCCategorySpendersExportParams {
  category: string;
  totalSpend: number;
  txnCount: number;
  percentage: number;
  currency: string;
  employees: Array<{ name: string; email: string; totalAmount: number; txnCount: number }>;
}

export function exportCCCategorySpenders(p: CCCategorySpendersExportParams): void {
  const wb = XLSX.utils.book_new();

  addSheet(wb, "Summary", [
    ["Field", "Value"],
    ["Category",       p.category],
    ["Currency",       p.currency],
    [`Total Spend (${p.currency})`, p.totalSpend],
    ["Total Transactions", p.txnCount],
    ["% of Card Spend", `${p.percentage.toFixed(1)}%`],
    ["Total Spenders", p.employees.length],
  ]);

  addSheet(wb, "Spenders", [
    ["Employee", "Email", `Amount (${p.currency})`, "Transactions"],
    ...p.employees.map((e) => [e.name, e.email, e.totalAmount, e.txnCount]),
  ]);

  XLSX.writeFile(wb, `cc-category-${safeFileName(p.category)}.xlsx`);
}

export interface CCEmployeeBreakdownExportParams {
  name: string;
  email: string;
  dateRange: string;
  currency: string;
  compLabel: string;
  totalAmount: number;
  txnCount: number;
  prevTotalAmount: number;
  prevTxnCount: number;
  categories: Array<{
    category: string;
    total: number;
    txnCount: number;
    percentage: number;
    compTotal: number;
    compTxnCount: number;
  }>;
}

export function exportCCEmployeeBreakdown(p: CCEmployeeBreakdownExportParams): void {
  const wb = XLSX.utils.book_new();
  const compLabel = p.compLabel;

  addSheet(wb, "Summary", [
    ["Field", "Value"],
    [CC_EMP_SUMMARY_FIELDS.employeeName, p.name],
    [CC_EMP_SUMMARY_FIELDS.email,        p.email],
    [CC_EMP_SUMMARY_FIELDS.period,       p.dateRange],
    [CC_EMP_SUMMARY_FIELDS.currency,     p.currency],
    [],
    ["", "Current Period", compLabel],
    [CC_EMP_SUMMARY_FIELDS.totalAmount, p.totalAmount, p.prevTotalAmount],
    [CC_EMP_SUMMARY_FIELDS.totalTxns,   p.txnCount,    p.prevTxnCount],
  ]);

  const catRows: unknown[][] = [
    [
      CC_EMP_CATEGORY_COLS.category,
      `${compLabel} ${CC_EMP_CATEGORY_COLS.compAmount} (${p.currency})`,
      `${compLabel} ${CC_EMP_CATEGORY_COLS.compTxns}`,
      `${CC_EMP_CATEGORY_COLS.currentAmount} (${p.currency})`,
      CC_EMP_CATEGORY_COLS.currentTxns,
      CC_EMP_CATEGORY_COLS.pctOfTotal,
    ],
    ...p.categories.map((c) => [
      c.category,
      c.compTotal > 0 ? c.compTotal : "—",
      c.compTxnCount > 0 ? c.compTxnCount : "—",
      c.total,
      c.txnCount,
      `${c.percentage.toFixed(1)}%`,
    ]),
  ];
  addSheet(wb, "Category Breakdown", catRows);

  XLSX.writeFile(
    wb,
    `cc-employee-breakdown-${safeFileName(p.name)}-${safeFileName(p.dateRange)}.xlsx`,
  );
}

export interface CCCardsExportParams {
  currency: string;
  statusFilter: string;
  generatedAt: string;
  cards: Array<{
    cardId: string;
    cardNumber: string;
    holderName: string;
    usedAmount: number;
    cardType: string;
    status: string;
  }>;
  categoryBreakdown: Array<{
    cardType: string;
    totalSpend: number;
    txnCount: number;
    percentage: number;
  }>;
}

export function exportCCCards(p: CCCardsExportParams): void {
  const wb = XLSX.utils.book_new();

  const activeCount = p.cards.filter((c) => c.status === "Active").length;
  const totalSpend = p.cards.reduce((s, c) => s + c.usedAmount, 0);

  addSheet(wb, "Summary", [
    ["Field", "Value"],
    ["Generated At",   p.generatedAt],
    ["Currency",       p.currency],
    ["Status Filter",  p.statusFilter],
    ["Total Cards",    p.cards.length],
    ["Active Cards",   activeCount],
    ["Inactive Cards", p.cards.length - activeCount],
    [`Total Spend (${p.currency})`, totalSpend],
  ]);

  addSheet(wb, "Corporate Cards", [
    [
      CC_CARDS_COLS.cardId,
      CC_CARDS_COLS.cardNumber,
      CC_CARDS_COLS.holderName,
      `${CC_CARDS_COLS.usedAmount} (${p.currency})`,
      CC_CARDS_COLS.cardType,
      CC_CARDS_COLS.status,
    ],
    ...p.cards.map((c) => [c.cardId, c.cardNumber, c.holderName, c.usedAmount, c.cardType, c.status]),
  ]);

  addSheet(wb, "Category Breakdown", [
    [
      CC_CATEGORY_COLS.category,
      `${CC_CATEGORY_COLS.totalSpend} (${p.currency})`,
      CC_CATEGORY_COLS.txnCount,
      CC_CATEGORY_COLS.pctOfTotal,
    ],
    ...p.categoryBreakdown.map((c) => [
      c.cardType,
      c.totalSpend,
      c.txnCount,
      `${c.percentage.toFixed(1)}%`,
    ]),
  ]);

  const date = new Date().toISOString().split("T")[0];
  XLSX.writeFile(wb, `cc-cards-report-${safeFileName(p.statusFilter)}-${date}.xlsx`);
}




