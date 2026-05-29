# API Layer & State Management

## API Client — `webapp/src/utils/apiService.ts`

### Configuration

- **Base URL:** `window.config.REACT_APP_BACKEND_BASE_URL` (injected at runtime, not build time)
- **Library:** Axios + `retry-axios` (rax)
- **Max retries on 401:** 3 (automatic token refresh then retry)

### Request Interceptor

For every outgoing request:
1. Injects `Authorization: Bearer <_idToken>` header
2. Builds a deduplication key: `${METHOD}:${baseURL}:${url}:${JSON.stringify(params)}`
3. Cancels any in-flight request with the same key (prevents duplicate concurrent fetches)
4. Stores the new `CancelTokenSource` in `_cancelTokenMap`

### Response Interceptor

On success or error:
- Removes the request's entry from `_cancelTokenMap`

### Token Refresh Flow

On 401:
1. `_isRefreshing` flag prevents concurrent refresh races
2. Calls `callback()` → returns `{ accessToken }`
3. Updates `_idToken`
4. Retries the original request
5. Resets `_isRefreshing = false`

### Global Loading

Hooks using `showGlobalLoading: true` will dispatch `startLoading()` / `stopLoading()` to the Redux `common` slice. This controls a global loading indicator. Most hooks do NOT use this flag — they manage their own local `loading` state.

### Methods

```ts
APIService.get<T>(url, config?)
APIService.post<T>(url, data?, config?)
APIService.put<T>(url, data?, config?)
APIService.patch<T>(url, data?, config?)
APIService.delete<T>(url, config?)
```

---

## Redux Store — `webapp/src/slices/store.ts`

| Slice key | File | What it stores |
|---|---|---|
| `auth` | `authSlice/auth.ts` | `userInfo`, `decodedIdToken`, `roles[]`, `status`, `mode` |
| `user` | `userSlice/user.ts` | `userInfo` (name, email, thumbnail, privileges[]), fetch state |
| `common` | `commonSlice/common.ts` | Global loading counter, snackbar message |
| `employee` | `employeeSlice/employee.ts` | Employee list (excluding current user) |
| `opdClaims` | `opdSlice/useOpdClaims.ts` | OPD summary data + filter state |
| `expenseClaims` | `expenseSlice/useExpenseClaims.ts` | Expense dashboard data + filter state |
| `collection` | `collections/collection.ts` | Collections list |
| `appConfig` | `configSlice/config.ts` | App configuration (claim limits, locations, etc.) |

**Note:** Credit card hooks (`useCreditCards.ts`), employee spending hooks, and personal expense hooks (`useMyExpense.ts`) are **NOT in the Redux store** — they are purely local React state hooks.

---

## Date Range Resolution — `resolveDateRangeParams(dateRange)`

**Defined in:** `webapp/src/slices/expenseSlice/useEmployeeSpending.ts`  
**Used by:** All expense and OPD hooks

| `dateRange` value | `year` | `month` | `monthRange` |
|---|---|---|---|
| `"All Time"` | `""` | `""` | `"0"` |
| `"This Month"` | current year | `""` | `"1"` |
| `"Last Month"` | (adjusted if Jan) | `""` | `"1"` (with negative offset) |
| `"Last 3 Months"` | current year | `""` | `"3"` |
| `"Last 6 Months"` | current year | `""` | `"6"` |
| `"Last 9 Months"` | current year | `""` | `"9"` |
| `"Last 12 Months"` | current year | `""` | `"12"` |
| `"Year to Date"` | current year | `""` | current month number as string |
| `"Last Year"` | `year-1` | `""` | `"12"` |
| `"This Year"` | current year | `""` | current month number as string |

**Backend interprets:**
- `monthRange = "0"` → no date filter (all time)
- `monthRange = "N"` → last N months from current date
- `year` alone → filter by that calendar year

## Credit Card Date Range Resolution — `resolveCCDateRangeParams(dateRange)`

**Defined in:** `webapp/src/slices/creditCardSlice/useCreditCards.ts`

Supports all standard presets above PLUS custom ranges:
- `"custom:YYYY-M:YYYY-M"` → parses from/to year+month, clamped to max 36 months

---

## Complete Endpoint Reference

All endpoints are on `GET` (except one `PUT`). Base URL from `window.config`.

### User & Config

| Method | Path | Query Params | Response Type | Hook/Thunk |
|---|---|---|---|---|
| GET | `/user-info` | — | `UserInfoResponse` | `getUserInfo` thunk |
| GET | `/app-config` | — | `AppConfig` | `fetchAppConfig` thunk |
| PUT | `/app-config` | — (body: `AppConfigUpdateRequest`) | `AppConfig` | `updateAppConfig` thunk |
| GET | `/employees` | — | `EmployeeBasicInfo[]` | `fetchEmployees` thunk |

### OPD Claims

| Method | Path | Query Params | Response Type | Hook |
|---|---|---|---|---|
| GET | `/opd-claims` | `year?`, `month?`, `monthRange?` | `OpdClaimSummaryResponse` | `useOpdClaims()` (Redux) |
| GET | `/my-opd-summary` | `year?`, `testEmail?` | `MyOpdSummaryResponse` | `useMyOpdSummary(year?)` |
| GET | `/my-opd-claims` | `year?`, `testEmail?` | `MyOpdClaimResponse[]` | `useMyOpdClaims(year?)` |

### Expense Claims

| Method | Path | Query Params | Response Type | Hook |
|---|---|---|---|---|
| GET | `/expense-claims` | `year?`, `month?`, `monthRange?`, `businessUnit?` | `ExpenseClaimSummaryResponse` | `useExpenseClaims()` (Redux) |
| GET | `/my-expense-summary` | `year?`, `month?`, `monthRange?`, `testEmail?` | `ExpenseSummaryStatsResponse` | `useMyExpenseSummary(dateRange)` |
| GET | `/my-expense-breakdown` | `year?`, `month?`, `monthRange?`, `statusFilter?`, `testEmail?` | `EmployeeSpendingBreakdownResponse` | `useMyExpenseBreakdown(dateRange, statusFilter)` |
| GET | `/my-expense-transactions` | `category`, `year?`, `month?`, `monthRange?`, `statusFilter?`, `testEmail?` | `EmployeeCategoryTransactionItem[]` | `useMyExpenseTransactions(category, dateRange, statusFilter)` |

### Employee Spending (Admin)

| Method | Path | Query Params | Response Type | Hook |
|---|---|---|---|---|
| GET | `/employee-spending` | `year?`, `month?`, `monthRange?`, `businessUnit?` | `EmployeeSpendingItem[]` | `useEmployeeSpendingList(dateRange, businessUnit)` |
| GET | `/employee-spending-breakdown` | `email`, `year?`, `month?`, `monthRange?`, `statusFilter?` | `EmployeeSpendingBreakdownResponse` | `useEmployeeBreakdown(email, dateRange, statusFilter)` |
| GET | `/employee-category-transactions` | `email`, `category`, `year?`, `month?`, `monthRange?`, `statusFilter?` | `EmployeeCategoryTransactionItem[]` | `useEmployeeCategoryTransactions(email, category, dateRange, statusFilter)` |

### Lead Approval

| Method | Path | Query Params | Response Type | Hook |
|---|---|---|---|---|
| GET | `/lead-approval-frequency` | `year?`, `month?`, `monthRange?`, `businessUnit?` | `LeadFrequencyItemResponse[]` | `useLeadFrequencyList(dateRange, businessUnit)` |
| GET | `/lead-approval-detail` | `email`, `year?`, `month?`, `monthRange?` | `LeadApprovalDetailResponse` | `useLeadApprovalDetail(email, dateRange)` |

### Credit Cards

| Method | Path | Query Params | Response Type | Hook |
|---|---|---|---|---|
| GET | `/cc-summary` | — | `CCSummaryResponse` | `useCCSummary()` |
| GET | `/cc-card-type-analysis` | `year?`, `month?`, `monthRange?` | `CCCardTypeItem[]` | `useCCCardTypeAnalysis(dateRange)` |
| GET | `/cc-top-cards` | — | `CCTopCardItem[]` | `useCCTopCards()` |
| GET | `/cc-cards` | `year?`, `month?`, `monthRange?` | `CCCardListItem[]` | `useCCCardList(dateRange)` |
| GET | `/cc-category-employees` | `category`, `monthRange?` | `CCEmployeeSpendingItem[]` | `useCCCategoryEmployees(category)` |
| GET | `/cc-employee-spending` | `year?`, `month?`, `monthRange?` | `CCEmployeeSpendingItem[]` | `useCCEmployeeSpendingList(dateRange)` |
| GET | `/cc-employee-breakdown` | `email`, `year?`, `month?`, `monthRange?` | `CCEmployeeBreakdownResponse` | `useCCEmployeeBreakdown(email, dateRange)` |
| GET | `/cc-employee-category-transactions` | `email`, `category`, `year?`, `month?`, `monthRange?` | `CCEmployeeCategoryTransactionItem[]` | `useCCEmployeeCategoryTransactions(email, category, dateRange)` |

### Health

| Method | Path | Response |
|---|---|---|
| GET | `/health` | `{ status: "ok"\|"degraded", database: { healthy: boolean, message: string } }` |

---

## Response Type Shapes

### UserInfoResponse
```ts
{ workEmail: string, firstName: string, lastName: string, employeeThumbnail?: string, privileges: number[] }
```

### AppConfig
```ts
{ claimLimit: number, submissionsAllowedLocations: string[], claimRangeStep: number, lastYearClaimGracePeriodInDays: number }
```

### ExpenseSummaryStatsResponse
```ts
{ totalAmount: number, totalCount: number, avgAmount: number, approvedCount: number, pendingCount: number, rejectedCount: number }
```

### EmployeeSpendingBreakdownResponse
```ts
{
  name: string, email: string, totalAmount: number, claimCount: number,
  categories: Array<{ category: string, total: number, claimCount: number, percentage: number }>
}
```

### EmployeeCategoryTransactionItem
```ts
{ description: string, txnDate: string, amount: number, status: string }
```

### MyOpdClaimResponse
```ts
{ id: string, date: string, amount: number, status: string, description?: string, txnCount: number }
```

### CCSummaryResponse
```ts
{
  totalSpend: number, activeCardCount: number, avgTransaction: number,
  highestSpendCardName: string, highestSpendCardAmount: number,
  trendTotalSpend: number, trendActiveCards: number, trendAvgTransaction: number
}
```

### CCCardListItem
```ts
{ cardId: string, cardNumber: string, holderName: string, holderEmail: string, usedAmount: number, cardType: string, status: string }
```
Note: `cardNumber` is masked as `**** **** **** LAST4` by the backend.

### CCEmployeeBreakdownResponse
```ts
{
  name: string, email: string, totalAmount: number, txnCount: number,
  categories: Array<{ category: string, total: number, txnCount: number, percentage: number }>
}
```

---

## Caching & Request Lifecycle Patterns

### Pattern 1: `cancelled` flag (basic cleanup)
Used by: `useMyExpenseSummary`, `useMyOpdClaims`, `useMyOpdSummary`, `useOpdClaims`, `useExpenseClaims`, `useEmployeeSpendingList`

```ts
useEffect(() => {
  let cancelled = false;
  // fetch ...
  .then(res => { if (!cancelled) setState(res.data); })
  return () => { cancelled = true; };
}, [deps]);
```

### Pattern 2: Stale-while-revalidate (resolvedKeyRef)
Used by: `useMyExpenseBreakdown`, `useEmployeeBreakdown`, `useCCEmployeeBreakdown`

```ts
const resolvedKeyRef = useRef<string | null>(null);

// On fetch complete: resolvedKeyRef.current = activeKey
// In return value:
const activeKey = `${dateRange}::${statusFilter}`;
const isStale = activeKey !== resolvedKeyRef.current;
return {
  breakdown: isStale ? null : breakdown,
  loading: loading || isStale,   // shows loading while stale
  error,
};
```

This prevents showing stale data while new data loads. The consumer gets `loading: true` and `data: null` during the transition.

### Pattern 3: Request ID deduplication (reqCountRef)
Used by: `useMyExpenseTransactions`, `useEmployeeCategoryTransactions`, `useCCEmployeeCategoryTransactions`

```ts
const reqCountRef = useRef(0);
const reqId = ++reqCountRef.current;
// fetch ...
.then(res => {
  if (reqId !== reqCountRef.current) return; // ignore stale response
  setState(res.data);
});
```

Ensures only the most recently initiated request updates state, even if an older request resolves later.

### Pattern 4: Client-side Map cache
Used by: `useMyExpenseTransactions`, `useEmployeeCategoryTransactions`, `useCCEmployeeCategoryTransactions`

```ts
const cacheRef = useRef<Map<string, T[]>>(new Map());
const cacheKey = `${category}::${dateRange}::${statusFilter}`;

if (cacheRef.current.has(cacheKey)) {
  setData(cacheRef.current.get(cacheKey));
  return;
}
// fetch and store: cacheRef.current.set(cacheKey, data);
```

Cache is per-component-instance (lives in the hook's `useRef`). It's cleared on component unmount. There is no global transaction cache.

### Pattern 5: mountedRef (prevents setState on unmounted)
Used alongside Pattern 3 in transaction hooks.

```ts
const mountedRef = useRef(true);
useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);
// In fetch: if (!mountedRef.current) return;
```

---

## Auth Slice Details

**File:** `webapp/src/slices/authSlice/auth.ts`

Privilege codes (from backend, stored in `userInfo.privileges[]`):
- `762` = FINANCE_ADMIN_PRIVILEGE → role `"ADMIN"`
- `987` = EMPLOYEE_ROLE_PRIVILEGE → role `"EMPLOYEE"`

Roles stored as `auth.roles: Role[]` where `Role = "ADMIN" | "EMPLOYEE"`.

**How token reaches the API service:**
1. Asgardeo `useAuthContext()` provides `getIDToken()`
2. `AuthContext.tsx` calls `apiService.updateTokens(idToken, refreshCallback)` after auth
3. `apiService` stores `_idToken` and uses it in every request's `Authorization` header

---

## Common Slice — Snackbar & Loading

**File:** `webapp/src/slices/commonSlice/common.ts`

```ts
// Dispatch a snackbar:
dispatch(setSnackbarMessage({ message: "...", type: "success" | "error" | "warning" | "info" }));
dispatch(clearSnackbarMessage());

// Global loading (used by APIService when showGlobalLoading: true):
dispatch(startLoading());  // increments counter
dispatch(stopLoading());   // decrements counter
dispatch(resetLoading());  // sets to 0
// isLoading = counter > 0
```

---

## Edge Cases & Gotchas

1. **`statusFilter` is omitted when "All"** — Hooks that accept `statusFilter` only add the param to the request when it's not `"All"`. The backend treats absence of `statusFilter` as "all statuses".

2. **`businessUnit` is omitted when "All Business Units"** — Same pattern; the backend function `normalizeBusinessUnit()` returns `null` for this value and skips the SQL clause.

3. **Employee deduplication in spending list** — `useEmployeeSpendingList` deduplicates server results by email (summing `totalAmount` and `claimCount`). This handles cases where the backend returns the same email multiple times for different business units.

4. **CC category classification is backend-side** — The `ccCategoryCase()` SQL CASE statement in `cc_queries.bal` classifies transactions by `engagement_code` prefix first, then merchant keyword matching. Frontend has no category logic.

5. **`testEmail` param in my-* endpoints** — When `devMode = true` in `Config.toml`, the backend uses `devEmail` instead of the JWT email. Frontend hooks pass no `testEmail` in production; this is a backend-only dev escape hatch.

6. **`/cc-category-employees` always uses `monthRange: "0"`** — Hardcoded in `useCCCategoryEmployees`. This endpoint always shows all-time data regardless of the date range selected elsewhere in the CC admin panel.

7. **Lead email is a comma-separated string in the DB** — `lead_email` column in `expense_claims` can hold multiple emails. The backend uses `FIND_IN_SET` and `SUBSTRING_INDEX(..., 1)` to handle this. Frontend always receives a single lead email per record.

8. **Currency conversion is frontend-only** — All values from the API are in LKR. The `formatWithSymbol(valueLKR, currency)` utility converts at hardcoded rates (USD=0.0031, EUR=0.0029). These rates are static in `utils/currency.ts` — there is no live rate feed.
