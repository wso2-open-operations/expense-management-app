# Backend — Ballerina Service

## Service Configuration

**Package:** `wso2/expense_management` v1.0.0  
**Distribution:** Ballerina Swan Lake 2201.13.1  
**HTTP Port:** 9090  
**File:** `backend/service.bal`

### Service Interceptors (applied globally)

1. **`JwtInterceptor`** (`modules/authorization/authorization.bal`) — runs before every request
   - Reads `x-jwt-assertion` header
   - Decodes JWT, extracts `email` and `groups` claims
   - Validates at least one authorized role is present
   - Stores `UserInfo` record in `RequestContext["user-info"]`
   - Returns `403 Forbidden` if no role match
   - Returns `500 Internal Server Error` if JWT parse fails
   - **Dev bypass:** When `devMode = true` in Config.toml, uses `devEmail` instead of JWT email

2. **`ErrorInterceptor`** — catches `http:PayloadBindingError`, converts to `400 Bad Request`

### Caching

Ballerina in-memory cache for user info lookups:
- Capacity: 2000 entries
- Default TTL: 1800 seconds (30 min)
- Cleanup interval: 900 seconds
- Cache key: `workEmail` (lowercase)

---

## Complete Endpoint Reference

### GET /health

No auth required (typically).

**Response:**
```json
{ "status": "ok", "database": { "healthy": true, "message": "" } }
```
`status` is `"degraded"` if DB health check fails. Runs `SELECT 1 AS status` against MySQL.

---

### GET /app-config

**Auth:** Any authenticated user  
**Returns:** `AppConfig`

```json
{
  "claimLimit": 40000.0,
  "claimRangeStep": 4000.0,
  "lastYearClaimGracePeriodInDays": 15,
  "submissionsAllowedLocations": ["Sri Lanka"]
}
```

Config is built by merging `Config.toml` defaults with DB overrides from `app_settings` table (`buildEffectiveAppConfig()`).

---

### PUT /app-config

**Auth:** Finance Admin role only (`checkPermissions([financeAdminRole])` returns 403 otherwise)  
**Body:** `AppConfigUpdateRequest` (all fields optional)  
**Effect:** Upserts into `app_settings` table, returns updated `AppConfig`

---

### GET /user-info

**Auth:** Any authenticated user  
**Returns:** `UserInfoResponse`

```json
{
  "workEmail": "user@wso2.com",
  "firstName": "First",
  "lastName": "Last",
  "employeeThumbnail": "https://...",
  "privileges": [987, 762]
}
```

Fetches employee info from HR Entity Service (`fetchEmployeesBasicInfo(email)`). Result is cached for 30 min by email key.

---

### GET /opd-claims

**Auth:** Any authenticated user  
**Query params:** `year?` (default: current), `month?`, `monthRange?` (default: 1)  
**Returns:** `OpdClaimSummaryResponse`

Backend logic in `opd_claim_summary.bal`:
- `lastYearClaimAmount` — SUM(txn_amount) for previous calendar year
- `currentMonthClaimAmount` — SUM for current month
- `previousYearClaimCount` — COUNT(DISTINCT id) for previous year
- `gracePeriodClaims` — claims in January of current year within `lastYearClaimGracePeriodInDays`
- `unclaimedEmployees` — employees from HR Entity with no OPD claim in the period
- `fullyClaimedEmployees` — employees whose total ≥ claimLimit
- `activeClaimsChart` — bucket distribution: for each bucket [0, step, 2×step, ...], counts employees whose total falls in that range

---

### GET /my-opd-summary

**Auth:** Any authenticated user (uses JWT email)  
**Query params:** `year?`, `testEmail?` (dev only)  
**Returns:** `MyOpdSummaryResponse`

```json
{ "claimedAmount": 15000.0, "claimCount": 3 }
```

---

### GET /my-opd-claims

**Auth:** Any authenticated user  
**Query params:** `year?`, `testEmail?`  
**Returns:** `MyOpdClaimResponse[]`

```json
[
  {
    "id": "OPD-001",
    "date": "2025-03-15",
    "amount": 5000.0,
    "status": "Approved",
    "description": "Consultation fee",
    "txnCount": 2
  }
]
```

Status values: `"Approved"`, `"Pending"`, `"Rejected"` (mapped from DB codes 3/0/1).

---

### GET /expense-claims

**Auth:** Any authenticated user  
**Query params:** `year?`, `month?`, `monthRange?` (default: 1), `businessUnit?`  
**Returns:** `ExpenseClaimSummaryResponse`

Large response — see types in `backend/types.bal`. Key fields:
- `totalClaimAmount`, `totalClaimCount`, `pendingClaims`, `approvedClaims`, `rejectedClaims`, `avgClaimAmount`
- `buExpenses: BuExpenseItem[]` — per-BU totals
- `activeClaimStats: ActiveClaimStatItem[]` — counts by status label
- `topSpendingEmployees: TopEmployeeItem[]` — top 7 by amount
- `topApprovingLeads: TopLeadItem[]` — top 7 leads by approval count
- `recurringExpenseTypes: ExpenseTypeItem[]` — expense categories sorted by total
- `leadApprovalFrequency: LeadApprovalFrequencyItem[]` — monthly approval counts per lead
- `trendTotalAmount`, `trendTotalCount`, `trendApproved`, `trendAvgAmount` — percentage changes

---

### GET /my-expense-summary

**Auth:** Uses JWT email  
**Query params:** `year?`, `month?`, `monthRange?` (default: 0), `testEmail?`  
**Returns:** `ExpenseSummaryStatsResponse`

---

### GET /my-expense-breakdown

**Auth:** Uses JWT email  
**Query params:** `year?`, `month?`, `monthRange?`, `statusFilter?`, `testEmail?`  
**Returns:** `EmployeeSpendingBreakdownResponse`

`statusFilter` values: `"Approved"`, `"Pending"`, `"Rejected"` (omit for all)

---

### GET /my-expense-transactions

**Auth:** Uses JWT email  
**Query params:** `category` (required), `year?`, `month?`, `monthRange?`, `statusFilter?`, `testEmail?`  
**Returns:** `EmployeeCategoryTransactionItem[]`

---

### GET /employee-spending

**Auth:** Any authenticated user  
**Query params:** `year?`, `month?`, `monthRange?`, `businessUnit?`  
**Returns:** `EmployeeSpendingItem[]`

All employees sorted by `totalAmount` DESC.

---

### GET /employee-spending-breakdown

**Auth:** Any authenticated user  
**Query params:** `email` (required), `year?`, `month?`, `monthRange?`, `statusFilter?`  
**Returns:** `EmployeeSpendingBreakdownResponse`

---

### GET /employee-category-transactions

**Auth:** Any authenticated user  
**Query params:** `email` (required), `category` (required), `year?`, `month?`, `monthRange?`, `statusFilter?`  
**Returns:** `EmployeeCategoryTransactionItem[]`

---

### GET /lead-approval-frequency

**Auth:** Any authenticated user  
**Query params:** `year?`, `month?`, `monthRange?`, `businessUnit?`  
**Returns:** `LeadFrequencyItemResponse[]`

Each item: `name`, `email`, `bu`, `totalApproved`, `avgFrequencyPerDay`, `avgResponseDays`, `firstApprovedDate?`, `lastApprovedDate?`

`avgResponseDays` = average of `DATEDIFF(lead_approved_date, txn_date)` per claim.

---

### GET /lead-approval-detail

**Auth:** Any authenticated user  
**Query params:** `email` (required), `year?`, `month?`, `monthRange?`  
**Returns:** `LeadApprovalDetailResponse`

Fields: `name`, `email`, `totalApproved`, `avgFrequencyPerDay`, `firstApprovedDate?`, `lastApprovedDate?`, `claimTypeBreakdown[]`, `claims[]`

`claims[]`: individual approved claims with `claimId`, `employeeName`, `claimType`, `subCategory`, `amount`, `submittedDate`, `approvedDate`, `status`

---

### GET /cc-summary

**Auth:** Any authenticated user  
**No query params**  
**Returns:** `CCSummaryResponse`

Aggregates: `totalSpend` (current year), `activeCardCount`, `avgTransaction` (current month), `highestSpendCardName`, `highestSpendCardAmount`, plus YoY and MoM trend percentages.

---

### GET /cc-card-type-analysis

**Auth:** Any authenticated user  
**Query params:** `year?`, `month?`, `monthRange?`  
**Returns:** `CCCardTypeItem[]`

Each item: `cardType`, `totalSpend`, `txnCount`, `percentage`

Category classification via `ccCategoryCase()` SQL CASE (see Database section).

---

### GET /cc-top-cards

**Auth:** Any authenticated user  
**No query params** (uses current year implicitly)  
**Returns:** `CCTopCardItem[]` (top 5)

`cardNumber` is masked: `**** **** **** LAST4`

---

### GET /cc-cards

**Auth:** Any authenticated user  
**Query params:** `year?`, `month?`, `monthRange?` (default: 0 = all time)  
**Returns:** `CCCardListItem[]`

All cards ordered by `usedAmount` DESC. Card numbers are masked.

---

### GET /cc-category-employees

**Auth:** Any authenticated user  
**Query params:** `category` (required), `monthRange?` (hardcoded "0" from frontend = all time)  
**Returns:** `CCEmployeeSpendingItem[]`

Employees who spent in the given category, sorted by `totalAmount` DESC.

---

### GET /cc-employee-spending

**Auth:** Any authenticated user  
**Query params:** `year?`, `month?`, `monthRange?`  
**Returns:** `CCEmployeeSpendingItem[]`

All employees with CC spend, grouped by email, sorted by total DESC.

---

### GET /cc-employee-breakdown

**Auth:** Any authenticated user  
**Query params:** `email` (required), `year?`, `month?`, `monthRange?`  
**Returns:** `CCEmployeeBreakdownResponse`

Employee's spend broken down by engagement category.

---

### GET /cc-employee-category-transactions

**Auth:** Any authenticated user  
**Query params:** `email` (required), `category` (required), `year?`, `month?`, `monthRange?`  
**Returns:** `CCEmployeeCategoryTransactionItem[]`

Individual CC transactions for an employee in a category.

---

## Database Schema (MySQL — `expense_app`)

### `expense_claims`

| Column | Type | Notes |
|---|---|---|
| `id` | PK | Claim ID |
| `txn_date` | DATE | Transaction/submission date |
| `status` | VARCHAR | '-1'=Rejected, '0'=Draft, '1'=Submitted, '2'=Lead Approved, '3'=Finance Approved |
| `reimbursement_amount` | DECIMAL | Claim amount in LKR |
| `business_unit` | VARCHAR | Department/BU |
| `employee_email` | VARCHAR | Claimant email |
| `lead_email` | VARCHAR | Comma-separated approver emails |
| `lead_approved_date` | DATE | When lead approved |
| `report_seq_number` | VARCHAR | Report sequence number |
| `expense_type_id` | FK → expense_type | |

### `expense_type`

| Column | Notes |
|---|---|
| `id` | PK |
| `expense_type` | String like "Travel - Accommodation" |

### `opd_claim`

| Column | Notes |
|---|---|
| `id` | PK (used as claim ID in responses) |
| `employee_email` | Claimant email |
| `added_date` | DATE |
| `status` | '-1'=Deleted, '0'=Pending, '1'=Rejected, '3'=Approved |

### `opd_claim_transaction`

| Column | Notes |
|---|---|
| `id` | PK |
| `claim_id` | FK → opd_claim.id |
| `txn_amount` | DECIMAL |
| `txn_description` | VARCHAR |

### `credit_card`

| Column | Notes |
|---|---|
| `id` | PK (used as cardId) |
| `cc_number` | Full card number (masked on read) |
| `employee_email` | Cardholder |
| `cc_provider_code` | AMEX, SVB, etc. → used as `cardType` |
| `status` | 'Active' / 'Inactive' |

### `cc_txn`

| Column | Notes |
|---|---|
| `cc_number` | FK → credit_card.cc_number |
| `employee_email` | |
| `txn_date` | DATE |
| `txn_amount` | DECIMAL |
| `engagement_code` | SAL, MKT, CLO, CS, RND, INF, ADM |
| `txn_reference` | Merchant name / description |
| `txn_reference_number` | |
| `status` | |

### `app_settings`

| Column | Notes |
|---|---|
| `setting_key` | VARCHAR PK |
| `setting_value` | VARCHAR |
| `updated_by` | email |

---

## CC Category Classification

CC transactions are classified into engagement categories by the backend SQL `ccCategoryCase()`:

**Priority 1 — engagement_code prefix:**
- `SAL*` → Sales
- `MKT*` → Marketing
- `CLO*` → Cloud Infrastructure
- `CS*` → Customer Success
- `RND*` → R&D
- `INF*` → Infrastructure
- `ADM*` → Administration

**Priority 2 — merchant keyword matching (txn_reference LIKE):**
- AWS / Google Cloud / Azure / DigitalOcean → Cloud Services
- GitHub / Adobe / Slack / Zoom / Salesforce / HubSpot → Software & SaaS
- Twilio / AT&T / Verizon → Communication
- Hotel / Airbnb / Marriott → Accommodation
- Uber / Lyft / Delta / United / Southwest → Travel
- Everything else → Other

---

## Authorization Module

**File:** `backend/modules/authorization/authorization.bal`

### JWT Extraction

```
Header: x-jwt-assertion
JWT claims extracted:
  - email    → string (user's work email)
  - groups   → string | string[] (Asgardeo group names)
```

`CustomJwtPayload` record handles both `string` and `string[]` for `groups` (Asgardeo can send either).

### Role Mapping

```
Config.toml:
  employeeRole    = "wso2-interns"
  financeAdminRole = "wso2-everyone"

Privilege codes (frontend):
  FINANCE_ADMIN_PRIVILEGE = 762
  EMPLOYEE_ROLE_PRIVILEGE = 987
```

### `checkPermissions(userRoles, requiredRoles)` → boolean

Uses AND logic: user must have ALL required roles. Returns `false` if `requiredRoles` is non-empty and `userRoles` is empty.

---

## HR Entity Service Integration

**File:** `backend/modules/entity/`  
**Base URL:** `https://apis-stg.wso2.com/pwkl/hr-entity-service/v1.0`  
**Auth:** OAuth2 Client Credentials via Asgardeo

**`fetchEmployeesBasicInfo(workEmail)`:**
- POST `/employee-basic-search` with `{ "email": workEmail }`
- Returns `Employee` record with `firstName`, `lastName`, `employeeThumbnail?`

**`fetchEmployeeNameMap(emails)`:**
- Calls `fetchEmployeesBasicInfo` for each email in parallel
- Returns `map<string>` of `lowercase_email → "First Last"`
- Silently skips failed individual lookups

---

## Utility Functions

**`backend/utils.bal`:**
- `deriveDisplayName(email)` — Extracts name from email prefix, splits on `.`, `_`, `-`, capitalizes
- `getMainCategory(expenseType)` — Splits `"Category - SubType"` on ` - `, returns first part
- `splitEmails(emailStr)` — Parses comma-separated email string, trims whitespace

**`backend/modules/database/utils.bal`:**
- `appendStatusFilterClause(params, statusFilter)` — Appends `AND status IN (...)` to SQL params
- `getExpenseDateRangeClause(year, month, monthRange)` — Returns SQL fragment `AND txn_date BETWEEN ... AND ...`
- `resolveEffectiveDate(year?, month?)` — Uses provided values or current date
- `validateCCDateParams(year, month, monthRange)` — Validates ranges (year: 1970-2100, month: 1-12, monthRange: 0-36)
- `maskCardNumber(ccNumber)` — Returns `**** **** **** LAST4`
- `normalizeBusinessUnit(bu)` — Returns `null` if `"All Business Units"` or empty string

---

## Edge Cases & Gotchas

1. **`lead_email` can be comma-separated** — `expense_claims.lead_email` stores multiple emails. Queries use `FIND_IN_SET` for filtering and `SUBSTRING_INDEX(..., ',', 1)` to get the primary lead for grouping.

2. **Status codes are strings** — `expense_claims.status` stores numeric strings (`'0'`, `'1'`, `'2'`, `'3'`), not integers. SQL comparisons must use string literals.

3. **OPD status '-1' is DELETED** — Queries must exclude status = '-1' when counting valid claims.

4. **`monthRange = "0"` means all time** — The backend date range clause is skipped when `monthRange` is `"0"`. This is how "All Time" is implemented — no date filter in the WHERE clause.

5. **Grace period logic is January-specific** — `getGracePeriodClaimCountQuery()` counts OPD claims made in January of the current year. The grace period allows employees to submit last year's claims in the first N days of the new year.

6. **Unclaimed count uses HR Entity data** — `unclaimedEmployees` = employees from HR Entity minus employees who have any OPD claim in the period. This requires an external API call to HR Entity on every `/opd-claims` request.

7. **CC card numbers in DB are unmasked** — The `maskCardNumber()` function is applied in the backend before returning to the frontend. The DB stores full card numbers. Never return unmasked numbers to the API response.

8. **`devMode = true` in current Config.toml** — The current config has `devMode = true` and `devEmail = "atheeque@wso2.com"`. **This must be set to `false` in production.** In dev mode, all `my-*` endpoints use `devEmail` regardless of JWT content.

9. **OAuth2 client credentials in Config.toml** — The `Config.toml` file contains live client credentials for the HR Entity Service OAuth2 flow. **Never commit `Config.toml` to source control.** It should be injected at deploy time via `BAL_CONFIG_FILES` or mounted as a secret.
