# Feature Breakdown & Screen Interactions

## How to Read This Document

Each screen entry describes:
- **File path** — the panel component to edit
- **Data sources** — which hooks/endpoints power it
- **UI sections** — every visible region
- **User interactions** — every clickable/interactive element and what it does
- **State** — local `useState` variables and what they control
- **Loading / Error / Empty** — all three states for every data-dependent section
- **Modals** — what opens, what it shows, when it closes

---

## Screen: OPD Claims — Admin View

**Route:** `/opd-claim-summary`  
**File:** `webapp/src/view/opd/panel/opdClaims.tsx`  
**Condition:** `viewMode === "admin"`

### Data Sources
- `useOpdClaims()` — Redux slice, fetches `/opd-claims` on mount and on filter change

### UI Sections

**Summary Cards (3):**
1. Total OPD Claim Amount Last Year — value + trend vs prior year
2. Current Month Claim Amount — value + trend vs previous month
3. Previous Year Claim Count — count + grace period claims in footer

**Main Layout (2-column):**
- Left: `ActiveClaimsChart` — bar chart of claims bucketed by amount range
  - Month filter dropdown in chart header (options: MONTH_OPTIONS)
- Right: Two `SideCountCard` stacked vertically
  - Unclaimed Employees count
  - Fully Claimed Employees count

### User Interactions

| Interaction | Effect |
|---|---|
| Month filter dropdown | Calls `handleMonthChange(value)` → updates Redux filter → re-fetches `/opd-claims` |
| Year filter (if present) | Calls `handleYearChange(year)` |

### State

- Redux: `month`, `year` filter values managed inside `useOpdClaims()` hook
- Local: `hasLoadedOnce` (prevents flash of error before first load), `showChartLoading` (120ms debounce before showing chart skeleton)

### Loading / Error / Empty

- **Initial load:** Alert info box "Loading OPD claim data..." shown until `hasLoadedOnce = true`
- **Chart transition:** `showChartLoading` goes true after 120ms delay when `loading` becomes true — prevents flicker on fast updates
- **Error:** `SnackMessage.error.fetchOpdClaims` dispatched to snackbar

---

## Screen: OPD Claims — Employee View

**Route:** `/opd-claim-summary`  
**File:** `webapp/src/view/opd/panel/EmployeeOpdClaims.tsx`  
**Condition:** `viewMode !== "admin"`

### Data Sources
- `useMyOpdClaims(currentYear)` — fetches `/my-opd-claims?year=YYYY`

### UI Sections

**Header:** "OPD Claims" title, "Your submitted OPD claims" subtitle

**Summary Cards (3):**
1. Claim Amount in [Year] with trend vs previous year (hardcoded "+0%" for now)
2. Claim Amount in [Month] with month-over-month trend
3. Number of Claims with approved count (trend area) + pending count (footer right)

**Bottom Row (2-column grid):**
- Left: "Claim Summary" panel
  - Date range filter (All Time / This Month / Last Month / Last 3 Months / Last 6 Months / Last Year)
  - Status summary bar: Total | Approved | Pending (shown only when filtered claims > 0)
  - Paginated claim cards (3 per page)
    - Each card: status dot, description (or "OPD Claim #ID"), item count + date, amount, status text
- Right: Two `SideCountCard` stacked
  - Approved Claims (year scope, not filter scope)
  - Pending Claims (year scope)

### User Interactions

| Interaction | Effect |
|---|---|
| Date range dropdown | `setDateRange(v)` + `setPage(0)` — filters claims client-side via `filterClaimsByRange()` |
| Pagination prev/next | `setPage(n)` — slices `filteredClaims` to show 3 per page |

### State (local)

```ts
const [dateRange, setDateRange] = useState("All Time");
const [page, setPage] = useState(0);
```

`filterClaimsByRange()` is a pure client-side filter over `claims[]` — no new API call.

### Loading / Error / Empty

- **Cards loading:** 3 skeleton rectangles (130px height)
- **List loading:** 4 skeleton rows
- **Error:** Typography in red with error message
- **Empty (no claims in period):** Centered "No claims in this period" text
- **Empty (no claims at all):** Same message

---

## Screen: Expense Claims — Admin View

**Route:** `/expense-claim-summary`  
**File:** `webapp/src/view/expense/panel/expenseClaims.tsx`  
**Condition:** `viewMode === "admin"`

### Data Sources
- `useExpenseClaims()` — Redux slice, fetches `/expense-claims` with `filters` state

### UI Sections

**Top Bar:** FilterPanel popover button (badge shows active filter count) + CurrencySelector

**Summary Cards (3):**
1. Total Claim Amount (year range) — value + YoY trend
2. Average Claim Amount (current month) — value + MoM trend
3. Total Claim Count (year) — count + grace period claims in footer right

**Charts Grid (2×2):**
1. "Expense from BU" — horizontal BarChart (business unit → total)
2. "Active Claim Stats" — vertical BarChart (claim status → count)
3. `EmployeeSpendingBreakdownPanel` — employee list with drilldown
4. `LeadApprovalFrequencyPanel` — lead list with approval stats

**Expense Type Breakdown:**
- ChartCard with ChartPeriodFilter
- List of recurring expense categories (5 per page with PaginationBar)
- Click category → expands into DoughnutChart of sub-items

### User Interactions

| Interaction | Effect |
|---|---|
| FilterPanel open | Opens popover with 5 filter dropdowns |
| Reset All in filter | Resets all filters to `INITIAL_FILTERS` |
| Any filter change | `handleFiltersChange(newFilters)` → dispatches new filters to Redux → re-fetch |
| ChartPeriodFilter (top bar) | Updates `chartPeriod` → maps to date range via `PERIOD_TO_DATE_RANGE` → updates filters |
| CurrencySelector | Updates local `currency` → re-formats all values via `fmtSym()` |
| Expense category click | `setSelectedRecurringCategory(cat)` → shows DoughnutChart for that category's sub-items |
| Recurring page prev/next | `setRecurringPage(n)` — slices categories array |
| Employee row click | Opens `EmployeeBreakdownModal` |
| Lead row click | Opens `LeadApprovalFrequencyModal` |

### Filters Shape (`ExpenseFilters`)

```ts
{
  dateRange: string,       // e.g., "Year to Date"
  businessUnit: string,    // e.g., "Engineering" or ""
  expenseType: string,     // e.g., "Travel" or ""
  statusFilter: string,    // "All" | "Approved" | "Pending" | "Rejected"
}
```

### State (local)

```ts
const [chartPeriod, setChartPeriod] = useState("all");
const [currency, setCurrency] = useState<CurrencyCode>(...);
const [selectedRecurringCategory, setSelectedRecurringCategory] = useState<string | null>(null);
const [recurringPage, setRecurringPage] = useState(0);
```

### Loading / Error / Empty

- **Initial:** Skeleton for all 3 cards + all 4 chart sections + expense list
- **Chart transition:** 120ms debounce `showChartLoading` flag prevents flicker
- **Error:** Full-width Alert with error message
- **Empty (categories):** "No expense types to display"

---

## Screen: Expense Claims — Employee View

**Route:** `/expense-claim-summary`  
**File:** `webapp/src/view/expense/panel/EmployeeExpenseClaims.tsx`  
**Condition:** `viewMode !== "admin"`

### Data Sources

```
useMyExpenseSummary("Year to Date")     → year totals for card 1
useMyExpenseSummary("This Month")       → month totals for card 2
useMyExpenseSummary("Last Month")       → previous month for trend calc
useMyExpenseBreakdown(dateRange, "All") → category list
useMyExpenseTransactions(modalCategory, dateRange, "All") → modal transactions
```

### UI Sections

**Header:** Title + CurrencySelector

**Summary Cards (3):**
1. Claim Amount in [currentYear] — YoY trend hardcoded "+0%"
2. Claim Amount in [currentMonthShort] — MoM trend computed
3. Number of Claims with approved (trend slot) + pending (footer right)

**Expense Categories ChartCard:**
- Period filter dropdown (MONTH_OPTIONS)
- Column headers: Category | Claims | Amount
- Category rows (5 per page): color dot + name, claimCount, total amount
- Rows are clickable
- PaginationBar when > 5 categories

### User Interactions

| Interaction | Effect |
|---|---|
| Period filter change | `setChartPeriod(v)` + `setModalCategory(null)` + `setCatPage(0)` |
| Category row click | `setModalCategory(cat.category)` → opens `ExpenseCategoryTransactionsModal` |
| Modal close | `setModalCategory(null)` |
| Category pagination | `setCatPage(n)` |
| Currency change | `setCurrency(code)` + saved to localStorage |

### State (local)

```ts
const [chartPeriod, setChartPeriod] = useState("all");
const [modalCategory, setModalCategory] = useState<string | null>(null);
const [catPage, setCatPage] = useState(0);
const [currency, setCurrency] = useState<CurrencyCode>(localStorage.getItem("defaultCurrency") ?? DEFAULT_CURRENCY);
```

### Loading / Error / Empty

- **Cards loading:** 3 skeleton rectangles
- **Breakdown loading:** 5 skeleton rows (44px height each)
- **Empty categories:** "No categories to display"
- **Error (year summary):** Alert banner at top

### Modal: `ExpenseCategoryTransactionsModal`

**Triggered by:** `modalCategory !== null`  
**Props fed:**
- `category` = selected category name
- `totalAmount`, `claimCount`, `percentage` = from `selectedCat` in `categories[]`
- `color` = `SEGMENT_COLORS[findIndex % 5]`
- `transactions` = live from `useMyExpenseTransactions`
- `loading` / `error` = from transaction hook

**Modal contents:**
- Header: category name, color indicator, claim count, total amount
- Status summary bar (Approved | Pending | Rejected): calculated from `transactions[]`
- Each transaction row: description, date, amount, status chip
- Expandable bar visualization per row
- PaginationBar inside modal

---

## Screen: Credit Cards — Admin View

**Route:** `/credit-card-summary`  
**File:** `webapp/src/view/credit-cards/panel/creditCard.tsx`  
**Condition:** `viewMode === "admin"`

### Data Sources

```
useCCSummary()                        → 3 KPI summary cards
useCCCardTypeAnalysis(categoryDateRange) → donut chart categories
useCCCardList(tableDateRange)         → corporate cards table
```
Employee breakdown panel and modals have their own hooks (see `CCEmployeeSpendingBreakdownPanel`, `useCCCategoryEmployees`, `useCCEmployeeBreakdown`).

### UI Sections

**Top Bar:** CurrencySelector

**Summary KPI Cards (3):**
1. Total Card Spend in [Year] — YoY trend
2. Avg Transaction in [Month] — MoM trend
3. Active Cards count — highest-spend card in footer right

**Expense Breakdown by Engagement Type:**
- `DateRangePickerButton` (From / To date pickers) — separate state `categoryDateRange`
- DoughnutChart + category list grid (2 columns)
- Each category box: colored dot, name, percentage, spend amount, txnCount
- Category box click → opens `CCCategoryBreakdownModal`

**`CCEmployeeSpendingBreakdownPanel`**:
- Employee list with CC spend, click opens `CCEmployeeBreakdownModal`
- Has its own date range control

**Corporate Cards Table:**
- SearchBox (filter by name, card number, type)
- Status filter buttons: All | Active | Inactive
- Table columns: Card ID | Card Number | Cardholder | Total Spend | Provider | Status
- Rows are clickable → `CCCardDetailsModal`
- `DateRangePickerButton` for table date range
- PaginationBar (PAGE_SIZE_CC_CARDS = 10 per page)

### User Interactions

| Interaction | Effect |
|---|---|
| Category date range change | `setCategoryDateRange(custom:YYYY-M:YYYY-M)` → re-fetches card type analysis |
| Category box click | `setSelectedCategory(cat)` + `setCategoryModalOpen(true)` |
| Search input | `setSearchQuery(text)` → filters card list in-memory |
| Status button click | `setStatusFilter("All"\|"Active"\|"Inactive")` → filters card list in-memory |
| Table date range change | `setTableDateRange(custom:YYYY-M:YYYY-M)` → re-fetches card list |
| Card row click | `setSelectedCard(card)` + `setCardDetailsOpen(true)` |
| Table page change | `setCardsPage(n)` |

### State (local)

```ts
const [currency, setCurrency] = useState<CurrencyCode>(DEFAULT_CURRENCY);
const [categoryDateRange, setCategoryDateRange] = useState("All Time");
const [tableDateRange, setTableDateRange] = useState("All Time");
const [searchQuery, setSearchQuery] = useState("");
const [statusFilter, setStatusFilter] = useState("All");
const [cardsPage, setCardsPage] = useState(0);
const [selectedCategory, setSelectedCategory] = useState<CCCardTypeItem | null>(null);
const [categoryModalOpen, setCategoryModalOpen] = useState(false);
const [selectedCard, setSelectedCard] = useState<CCCardListItem | null>(null);
const [cardDetailsOpen, setCardDetailsOpen] = useState(false);
```

### Loading / Error / Empty

- **Summary cards loading:** 3 skeleton rectangles
- **Donut + categories loading:** Large circular skeleton + 6 small category skeletons
- **Table loading:** PAGE_SIZE_CC_CARDS skeleton rows
- **Empty (no cards matching search/filter):** "No cards found"

---

## Screen: Credit Cards — Employee View

**Route:** `/credit-card-summary`  
**File:** `webapp/src/view/credit-cards/panel/EmployeeCardClaims.tsx`  
**Condition:** `viewMode !== "admin"`

### Data Sources

```
useCCEmployeeBreakdown(email, "This Year")   → year totals for card 1
useCCEmployeeBreakdown(email, "This Month")  → month totals for card 2
useCCEmployeeBreakdown(email, "Last Month")  → previous month for trend
useCCEmployeeBreakdown(email, dateRange)     → category breakdown list
useCCEmployeeCategoryTransactions(email, modalCategory, dateRange) → modal transactions
```

`email` = `useAppSelector(state => state.user.userInfo?.workEmail ?? null)`

### UI Sections

**Header:** Title "Card Claims" + subtitle + CurrencySelector

**Summary Cards (3):**
1. Card Spend in [Year]
2. Card Spend in [Month] — MoM trend
3. Transactions in [Year] with category count in trend area

**Transaction Categories ChartCard:**
- Period filter: All Time / This Month / Last Month / Last 3 Months / Last 6 Months / Last Year
- Column headers: Category | Transactions | Amount
- Rows: color dot + category name, txnCount, total
- Clickable rows → `ExpenseCategoryTransactionsModal` (reused component)
- PaginationBar when > 5 categories

### User Interactions

| Interaction | Effect |
|---|---|
| Period filter change | `setDateRange(v)` + `setModalCategory(null)` + `setCatPage(0)` |
| Category row click | `setModalCategory(cat.category)` |
| Modal close | `setModalCategory(null)` |
| Category pagination | `setCatPage(n)` |

### State (local)

```ts
const [currency, setCurrency] = useState<CurrencyCode>(DEFAULT_CURRENCY);
const [dateRange, setDateRange] = useState("All Time");
const [modalCategory, setModalCategory] = useState<string | null>(null);
const [catPage, setCatPage] = useState(0);
```

---

## Screen: Settings

**Route:** `/settings`  
**File:** `webapp/src/view/settings/panel/userSettings.tsx`

### Data Sources
- `useAppSelector(state => state.user.userInfo)` — user profile
- `useAppSelector(state => state.auth.roles)` — role badges
- `useAppSelector(state => state.appConfig)` — system config
- `fetchAppConfig()` dispatched on mount

### UI Sections

1. **My Profile Card:** Avatar (initials), full name, email, role badges
2. **Theme Appearance Card:** Radio circles for theme options → `setThemeName()` in ThemeContext
3. **Display Preferences Card:** Currency selector → saved to `localStorage["defaultCurrency"]`
4. **System Information Card:** Claim limit, grace period, allowed locations (read-only `LocationChips`)

### User Interactions

| Interaction | Effect |
|---|---|
| Theme radio click | `setThemeName(name)` → persisted to localStorage["appTheme"], immediate visual change |
| Currency change | `setCurrency(code)` + `localStorage.setItem("defaultCurrency", code)` |

---

## Screen: Admin Panel

**Route:** `/admin`  
**File:** `webapp/src/view/admin-panel/panel/AdminPanel.tsx`

### Data Sources
- `useAppSelector(state => state.appConfig)` — all config values
- `fetchAppConfig()` dispatched on mount

### UI Sections

1. **Stat Cards (2):**
   - Annual OPD Claim Cap (LKR value)
   - Allowed Locations count
2. **Config Panels (3 columns):**
   - OPD Claims: claim cap, grace period days, allowed locations
   - Expense Claims: allowed locations
   - Credit Card Claims: statement cycle (Monthly, hardcoded), allowed locations

All values are read-only display. Editing requires a separate admin config flow that calls `PUT /app-config`.

---

## Screen: Profile

**Route:** `/profile`  
**File:** `webapp/src/view/profile/panel/UserProfile.tsx`

### Data Sources
- `useAppSelector(state => state.user.userInfo)`
- `useAppSelector(state => state.auth.roles)`

### UI Sections

**Left Column:**
- Avatar with initials
- Name + email
- Role badge chips
- Quick actions: "Edit preferences" → `/settings`, "Admin Panel" → `/admin` (if ADMIN)

**Right Column:**
- Account Information: Name, Email, Identity Provider, Status
- Roles & Access: Detailed role descriptions with icons

---

## Shared Component: `ExpenseCategoryTransactionsModal`

**File:** `webapp/src/component/chart/ExpenseCategoryTransactionsModal.tsx`  
**Used by:** `EmployeeExpenseClaims`, `EmployeeCardClaims`

### Props
```ts
{
  open: boolean,
  onClose: () => void,
  category: string | null,
  totalAmount: number,
  claimCount: number,
  percentage: number,
  color: string,
  currency: CurrencyCode,
  transactions: ExpenseTransaction[],
  loading: boolean,
  error: string | null,
}
```

`ExpenseTransaction` type: `{ description: string, txnDate: string, amount: number, status: string }`

### Contents

- Dialog header: category color dot, category name, claim count, total amount
- Status summary bar: Approved | Pending | Rejected (calculated from `transactions[]`)
- Transaction list (paginated, 5 per page):
  - Status dot (green/orange/red)
  - Description text (truncated with ellipsis)
  - Date (formatted)
  - Amount (formatted with currency symbol)
  - Status chip
  - Horizontal bar proportional to amount relative to max in list
- Loading: 5 skeleton rows
- Error: red error text
- Empty: "No transactions found"

---

## Shared Component: `SummaryCard`

**File:** `webapp/src/component/card/SummaryCard.tsx`

### Props
```ts
{
  icon: LucideIcon,
  iconBg: string,
  iconColor: string,
  title: string,
  chipLabel?: string,        // e.g., "2025" or "Jan"
  value: string,             // formatted number
  suffix?: string,           // e.g., "LKR"
  trend: string,             // e.g., "+12%" or "45"
  trendVariant: "positive" | "negative",
  trendLabel?: string,       // e.g., "VS 2024"
  footerRight?: string,      // secondary metric value
  footerRightLabel?: string, // label for secondary metric
}
```

### Layout

```
[Icon box]  Title  [Chip]
            Value  Suffix
     [Trend ▲ +12%] trendLabel
              footerRight footerRightLabel
```

---

## Shared Component: `ChartCard`

**File:** `webapp/src/component/chart/ChartCard.tsx`

### Props
```ts
{ title: string, subtitle?: string, action?: ReactNode, children: ReactNode, minHeight?: number }
```

Used as a wrapper for every panel/chart section. `action` slot is used for `ChartPeriodFilter` or `DateRangePickerButton`.

---

## Constants Used Across Features

**SEGMENT_COLORS** (used for category color dots in all breakdown panels):
```ts
["#2E8B57", "#4A8EDB", "#AB7AE0", "#FF8A4C", "#E85D75"]
```
Index is `categories.indexOf(cat) % 5`. Persists across pagination (uses global array index, not page-local index).

**MONTH_OPTIONS** (expense period filter):
```ts
[
  { value: "all",        label: "All Time" },
  { value: "current",    label: "This Month" },
  { value: "pastThree",  label: "Last 3 Months" },
  { value: "pastSix",    label: "Last 6 Months" },
  { value: "pastNine",   label: "Last 9 Months" },
  { value: "pastTwelve", label: "Last 12 Months" },
]
```

**CC_DATE_RANGE_OPTIONS** (CC period filter):
```ts
["All Time", "This Month", "Last Month", "Last 3 Months", "Last 6 Months", "Last Year", "This Year"]
```

**STATUS_COLORS** (OPD and expense claim status):
```ts
{ Approved: "#2E8B57", Pending: "#f97316", Rejected: "#ef4444" }
```

---

## Edge Cases & Gotchas

1. **`selectedCat` may be undefined when modal opens** — `categories.find(c => c.category === modalCategory)` can return `undefined` if the breakdown resets while the modal is open (e.g., period filter change). Props fall back to `?? 0` but the modal may show zeros. The `modalCategory` is cleared on period change to prevent this.

2. **Color index uses global array position, not page position** — `categories.indexOf(cat)` is called on the full array, not `paginatedCategories`. So category colors stay consistent across pagination. This is intentional.

3. **Trend on year card is hardcoded "+0%"** — Both `EmployeeExpenseClaims` and `EmployeeCardClaims` show "+0%" as the YoY trend for the year summary card. There is no prior-year API call made. Adding this would require a new `useMyExpenseSummary("Last Year")` hook call.

4. **SideCountCard "This Year" scope vs filter scope** — In `EmployeeOpdClaims`, the side count cards (Approved, Pending) always show the **full year** count, computed from `useMyOpdClaims(currentYear)`. They do NOT update when the date range filter changes. The filter only affects the Claim Summary panel on the left.

5. **`useCCEmployeeBreakdown` called 4 times simultaneously** — In `EmployeeCardClaims`, the hook is called for "This Year", "This Month", "Last Month", and `dateRange` — four parallel API calls on mount. This is by design but means 4 requests to `/cc-employee-breakdown` on first render.

6. **Empty email guard** — CC employee hooks that accept `email` will receive `null` when `userInfo` hasn't loaded yet. Hooks should guard on `email !== null` before triggering the fetch. Check `useCCEmployeeBreakdown` for this guard pattern.

7. **`txnCount` vs `claimCount`** — The CC domain uses `txnCount` (transaction count) while the expense domain uses `claimCount`. Both represent the number of line items but the naming differs. The shared `ExpenseCategoryTransactionsModal` maps CC's `txnCount` via `claimCount` prop using `selectedCat?.txnCount ?? 0`.
