# Navigation & Routing System

## Router Setup

**Library:** React Router DOM v7 (`createBrowserRouter`)

**Creation:** `webapp/src/app/AppHandler.tsx`  
The router is created inside a `useMemo` that depends on `activeRoutes` and `defaultRoute`. It is only mounted after authentication succeeds — `AppHandler` gates rendering on `appState === "success"`.

```
Root route: "/"  element: <Layout />  errorElement: <NotFoundPage />
└── index route: <Navigate to={defaultRoute} replace />
└── ...activeRoutes (filtered by role)
```

`defaultRoute` = first active route path from the filtered routes array (usually `/opd-claim-summary`).

---

## Full Route Map

Defined in `webapp/src/route.ts` as `RouteObjectWithRole[]`.

| Path | View Component | Sidebar Label | Icon | bottomNav | Shown in Sidebar |
|---|---|---|---|---|---|
| `/profile` | `View.profile` | Profile | — | false | **NO** (hidden) |
| `/admin` | `View.admin` | Admin Panel | — | false | **NO** (hidden) |
| `/settings` | `View.settings` | Settings | Settings | **true** | Bottom of sidebar |
| `/opd-claim-summary` | `View.opd` | OPD Claims | HeartPulse | false | YES |
| `/expense-claim-summary` | `View.expense` | Expense Claims | BanknoteArrowDown | false | YES |
| `/employee-summary` | `View.employees` | Employees | Users | false | **NO** (hidden) |
| `/credit-card-summary` | `View.card` | Card Claims | CreditCard | false | YES |
| `/report-summary` | `View.reports` | Reports | FilePlus | false | **NO** (hidden) |

**Roles allowed:** All routes allow both `ADMIN` and `EMPLOYEE`. Role filtering is coarse-grained (show/hide routes). Fine-grained per-screen branching is done via `ViewModeContext`.

**Hidden paths set** in sidebar: `/profile`, `/admin`, `/employee-summary`, `/report-summary`  
These routes exist and are reachable by direct URL but have no sidebar entry.

---

## View Lazy Loading

`webapp/src/view/index.tsx` wraps each view in `React.lazy()` + `<Suspense>`. The `AppSkeleton` spinner shows while the chunk loads.

```tsx
export const expense = lazy(() => import("./expense/Expense"));
export const opd    = lazy(() => import("./opd/Opd"));
export const card   = lazy(() => import("./credit-cards/Credit"));
// etc.
```

---

## ViewModeContext — The Panel-Switching Mechanism

**File:** `webapp/src/context/ViewModeContext.tsx`

**Type:** `ViewMode = "admin" | "employee" | "lead"`

**Default:** `"admin"` (validated from localStorage on init, falls back to `"admin"` if invalid)

**Storage key:** `localStorage["viewMode"]`

**Hook:** `const { viewMode, setViewMode } = useViewMode()`

### How it controls which panel renders

Every multi-role view delegates to ViewMode:

```tsx
// Expense.tsx
export default function Expense() {
  const { viewMode } = useViewMode();
  return viewMode === "admin" ? <ExpenseClaims /> : <EmployeeExpenseClaims />;
}

// Opd.tsx
export default function Opd() {
  const { viewMode } = useViewMode();
  return viewMode === "admin" ? <OpdClaims /> : <EmployeeOpdClaims />;
}

// Credit.tsx
export default function Credit() {
  const { viewMode } = useViewMode();
  return viewMode === "admin" ? <CreditCard /> : <EmployeeCardClaims />;
}
```

### Where users toggle ViewMode

1. **Sidebar buttons** (`webapp/src/layout/sidebar/index.tsx`): Three buttons — "Admin", "Employee", "Lead" — displayed when sidebar is expanded; collapsed to initials when sidebar is closed.
2. **Header** (`webapp/src/layout/Layout.tsx`): `ChartPeriodFilter` component used as an "Admin View / Employee View" switcher in the top bar.

---

## Authentication & Route Guards

**File:** `webapp/src/context/AuthContext.tsx`

### 3-State Auth Machine

| State | What happens |
|---|---|
| `Loading` | Auth status unknown, show `PreLoader` |
| `Unauthenticated` | Trigger `appSignIn()` (Asgardeo redirect), max 3 attempts |
| `Authenticated` | Boot app: fetch user info → load privileges → init API service → fetch app config |

**`AppHandler.tsx`** renders `<RouterProvider>` only when `appState === "success"`. Until then it shows `PreLoader`, `ErrorHandler`, or `Maintenance` screens.

### Session Management

- **Idle timeout:** 15 minutes (`IDLE_TIMEOUT_MS = 15 * 60 * 1000`)
- **Warning shown:** 4 seconds before idle timeout fires (`IDLE_WARNING_OFFSET_MS = 4000`)
- **Action on timeout:** Calls `appSignOut()`
- **Warning dialog:** `SessionWarningDialog` with "Extend Session" and "Log Out" options
- **Post-login redirect:** Stored in `localStorage[redirectUrl]` before auth redirect, consumed on return

### Role Loading

After Asgardeo auth:
1. Fetch ID token + user basic info from Asgardeo
2. Decode JWT to extract `groups` claim → derive roles:
   - If groups include `financeAdminRole` → `FINANCE_ADMIN_PRIVILEGE` (762) → role: `"ADMIN"`
   - If groups include `employeeRole` → `EMPLOYEE_ROLE_PRIVILEGE` (987) → role: `"EMPLOYEE"`
3. Dispatch `loadPrivileges(decodedToken)` → stored in `auth.roles[]`

`getActiveRoutesV2(routes, auth.roles)` then filters which routes are mounted.

---

## Sidebar Component

**File:** `webapp/src/layout/sidebar/index.tsx`

### Structure

```
Sidebar (collapsible, 200px expanded)
├── ViewMode toggle buttons (Admin | Employee | Lead)
├── Nav items (from getActiveRouteDetails — excludes hidden paths)
│   ├── OPD Claims  (/opd-claim-summary)
│   ├── Expense Claims  (/expense-claim-summary)
│   └── Card Claims  (/credit-card-summary)
├── Bottom spacer
├── Settings  (/settings) — bottomNav: true
└── Footer: theme toggle + collapse button
```

### Active State

Uses local `navState: { active: number | null, hovered: number | null }`.  
Active index determined by comparing `route.path === location.pathname` (from `useLocation()`).  
Clicking toggles: `active === idx ? null : idx`.

### Collapse Behavior

Sidebar collapses to icon-only mode. The ViewMode toggle shrinks to a single button showing the mode initial (A/E/L). Nav labels disappear, icons remain.

---

## Layout Shell

**File:** `webapp/src/layout/Layout.tsx`

### Provider / Shell hierarchy (runtime)

```
Redux Provider
└── ThemeContextProvider
    └── ViewModeContextProvider
        └── OxygenUIThemeProvider (WSO2 theme)
            └── AsgardeoAuthProvider
                └── AppAuthProvider (custom session logic)
                    └── AppHandler
                        └── RouterProvider
                            └── Layout (AppShell)
                                ├── Header (toggle, brand, view switcher, user menu)
                                ├── Sidebar (nav items, ViewMode buttons)
                                └── Main > <Outlet />  ← route content renders here
```

### Header Contents

- Hamburger toggle (collapses sidebar)
- Logo (`pulse-orange.svg`) + "Expense Management Dashboard"
- View mode switcher (`ChartPeriodFilter` with admin/employee options)
- `ColorSchemeToggle`
- User avatar menu → Profile, Settings, Admin Panel (if admin), Logout

### User Menu Items

- **Profile** → navigate to `/profile`
- **Settings** → navigate to `/settings`
- **Admin Panel** → navigate to `/admin` (conditionally rendered if user has ADMIN role)
- **Logout** → calls `appSignOut()`

---

## Navigation State Persistence

| State | Persisted | Storage | Key |
|---|---|---|---|
| ViewMode | YES | localStorage | `"viewMode"` |
| App theme | YES | localStorage | `"appTheme"` |
| Default currency | YES | localStorage | `"defaultCurrency"` |
| Post-login redirect | YES | localStorage | redirectUrl constant |
| Active sidebar item | NO | component state | resets on unmount |
| Chart period filter | NO | component state | resets on route change |
| Modal open state | NO | component state | resets on route change |
| Pagination page | NO | component state | resets on filter change |
| Search input | NO | component state | resets on route change |

---

## Modals (Not Routes)

All drilldown overlays are state-gated dialogs, not route-based. There are no URL changes when a modal opens.

| Modal | Trigger | Gate state |
|---|---|---|
| `ExpenseCategoryTransactionsModal` | Click category row in Expense or Card panels | `modalCategory !== null` |
| `CCCardDetailsModal` | Click card row in CC admin panel | `selectedCard !== null` |
| `CCCategoryBreakdownModal` | Click category box in CC admin panel | `categoryModalOpen` + `selectedCategory` |
| `CCEmployeeBreakdownModal` | Click employee in CC breakdown panel | `selectedEmployee !== null` |
| `EmployeeBreakdownModal` | Click employee in expense breakdown panel | `selectedEmployee !== null` |
| `LeadApprovalFrequencyModal` | Click lead row in approval frequency panel | `selectedLead !== null` |

**Pattern used in every modal:**
```tsx
const [modalCategory, setModalCategory] = useState<string | null>(null);

// Open:   setModalCategory(cat.category)
// Close:  setModalCategory(null)

<SomeModal
  open={modalCategory !== null}
  onClose={() => setModalCategory(null)}
  ...
/>
```

---

## Edge Cases & Gotchas

1. **Default route race condition:** If `activeRoutes` is empty (e.g., privileges not loaded yet), `defaultRoute` will be undefined. `AppHandler` prevents this by only creating the router after `appState === "success"`.

2. **ViewMode "lead" renders employee panel:** `viewMode === "lead"` falls into the `else` branch in Expense/Opd/Credit route files — it shows the employee panel, not a distinct lead panel. There is no dedicated lead view yet.

3. **Sidebar active state vs URL:** The sidebar uses an index-based `navState.active`, not the URL. If a user navigates via direct URL (not sidebar click), the sidebar may show no item as active unless `SidebarNavItem` independently checks `location.pathname`.

4. **Hidden routes accessible:** `/admin`, `/profile`, `/employee-summary`, `/report-summary` are reachable by direct URL entry even though they're absent from the sidebar. There is no redirect guard on these paths beyond role filtering at router build time.

5. **Settings at bottom:** `/settings` has `bottomNav: true`. The sidebar renders it in a separate footer section, not in the main nav list. Agents adding new routes should check this flag to avoid misplacing the item.

6. **Under Development pages:** Dashboard (`/dashboard`), Employees (`/employee-summary`), Reports (`/report-summary`) render `<Maintenance />` regardless of role/viewMode. These routes are wired but show a "coming soon" page.
