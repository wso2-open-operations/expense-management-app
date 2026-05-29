# Expense Management App — Project Overview

## What This App Is

A **read-only analytics dashboard** for WSO2's internal expense management. There are no form submissions or CRUD operations from the frontend beyond admin config changes. Three user-facing personas: Finance Admin, Employee, and Lead. The backend is a Ballerina HTTP service backed by MySQL; the frontend is a Vite + React SPA.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend build | Vite 6 + React 19 + TypeScript |
| UI components | @wso2/oxygen-ui (MUI-based WSO2 design system) |
| Routing | React Router DOM v7 (createBrowserRouter) |
| State management | Redux Toolkit (RTK) — global slices + custom hooks |
| Auth | Asgardeo (@asgardeo/auth-react) — OAuth2/OIDC |
| HTTP client | Axios with retry-axios, per-endpoint cancel tokens |
| Charts | Custom SVG (DonutChart) + custom CSS-based (BarChart) |
| Icons | lucide-react |
| Date handling | Day.js |
| Excel export | xlsx (SheetJS) |
| Backend language | Ballerina 2201.13.1 (Swan Lake) |
| Backend auth | JWT via x-jwt-assertion header (Asgardeo) |
| Database | MySQL (expense_app) |
| Backend HTTP port | 9090 |

---

## Repository Layout

```
expense-management-app/
├── .agents/                   # Agentic documentation (this directory)
├── backend/                   # Ballerina service
│   ├── Ballerina.toml         # Package config: org=wso2, name=expense_management, v1.0.0
│   ├── Config.toml            # Runtime config (DB creds, roles, app config defaults)
│   ├── Dependencies.toml      # Package dependencies
│   ├── service.bal            # All HTTP endpoints (port 9090)
│   ├── types.bal              # All request/response record types
│   ├── constants.bal          # Backend constants
│   ├── utils.bal              # Shared utility functions
│   ├── expense_claim_summary.bal  # Expense summary computation helpers
│   ├── opd_claim_summary.bal      # OPD summary computation helpers
│   └── modules/
│       ├── database/          # DB client, queries, functions per domain
│       │   ├── client.bal     # MySQL client init + health check
│       │   ├── types.bal      # DB row record types
│       │   ├── expense_queries.bal / expense_functions.bal
│       │   ├── opd_queries.bal / opd_functions.bal
│       │   ├── cc_queries.bal / cc_functions.bal
│       │   ├── settings_functions.bal
│       │   └── utils.bal
│       ├── authorization/     # JWT interceptor + role check
│       │   ├── authorization.bal
│       │   ├── constants.bal
│       │   ├── types.bal
│       │   └── utils.bal
│       └── entity/            # HR Entity Service REST client
│           ├── client.bal
│           ├── hr.bal
│           ├── constants.bal
│           └── types.bal
│
└── webapp/                    # React SPA
    ├── index.html
    ├── vite.config.ts
    ├── tsconfig.json          # Paths aliases (@component, @slices, etc.)
    └── src/
        ├── App.tsx            # Root: providers stack
        ├── main.tsx           # Vite entry
        ├── route.ts           # All route definitions with roles
        ├── global.d.ts        # Global type declarations
        ├── app/
        │   └── AppHandler.tsx # Router creation + auth state gate
        ├── assets/images/     # Logos (pulse-orange.svg, WSO2 logos)
        ├── component/         # Reusable UI components (see 02-navigation.md)
        ├── config/
        │   ├── config.ts      # Asgardeo config + base URL
        │   ├── constant.ts    # ALL app constants
        │   ├── exportLabels.ts
        │   └── ui.ts          # Sidebar width, char limits
        ├── context/           # React Contexts (Auth, Theme, ViewMode, Dialog)
        ├── layout/            # App shell (Layout, Header, Sidebar, pages)
        ├── slices/            # Redux slices + custom API hooks
        ├── styles/            # Design tokens, fonts, panel styles
        ├── types/types.ts     # Shared TypeScript types
        ├── utils/             # apiService, currency, dateFormat, exportExcel, utils
        └── view/              # Page-level views (lazy-loaded via Suspense)
```

---

## How to Build and Package as a Microapp

### Frontend Build

```bash
cd webapp
npm install
npm run build
# Output: webapp/dist/
```

The `dist/` folder is a standard SPA — `index.html` + hashed JS/CSS bundles. To serve it as a microapp:

1. **Runtime config injection** — The app reads `window.config.REACT_APP_BACKEND_BASE_URL` at runtime (not build-time). Before serving, inject a `config.js` script into `index.html`:

```html
<script>
  window.config = {
    REACT_APP_BACKEND_BASE_URL: "https://your-backend-host/api"
  };
</script>
```

This is already expected by `webapp/src/config/config.ts` via `ServiceBaseUrl`.

2. **Zip the artifact** (for deployment/upload):

```bash
cd webapp
npm run build
cd dist
zip -r ../expense-management-webapp.zip .
```

### Backend Build

```bash
cd backend
bal build
# Output: backend/target/bin/expense_management.jar
```

Package as a Docker container or upload the JAR directly. The service listens on port 9090.

**Config file at runtime:**
```bash
bal run expense_management.jar -- --Config.toml=/path/to/Config.toml
```

Or set config via environment (Ballerina supports `BAL_CONFIG_FILES` env var).

### Environment Variables / Config Required

| Variable | Where set | Description |
|---|---|---|
| `REACT_APP_BACKEND_BASE_URL` | `window.config` at runtime | Backend API base URL |
| DB host/user/password/database | `Config.toml` | MySQL connection |
| `hrEntityBaseUrl` | `Config.toml` | HR Entity Service URL |
| `clientId` / `clientSecret` / `tokenUrl` | `Config.toml` | Asgardeo OAuth2 for HR entity |
| `employeeRole` / `financeAdminRole` | `Config.toml[authorization]` | Role group names in Asgardeo |
| `devMode` / `devEmail` | `Config.toml[authorization]` | Bypass JWT in local dev |
| Asgardeo client config | `webapp/src/config/config.ts` | OAuth2 PKCE config |

### CORS

The Ballerina service must allow requests from the frontend origin. Set CORS in `service.bal`'s `@http:ServiceConfig` if not already done.

---

## TypeScript Path Aliases

All imports use these aliases — never relative paths across directory boundaries:

```
@root/*    → ./
@src/*     → ./src/
@app/*     → ./src/app/
@assets/*  → ./src/assets/
@component/* → ./src/component/
@config/*  → ./src/config/
@context/* → ./src/context/
@layout/*  → ./src/layout/
@slices/*  → ./src/slices/
@view/*    → ./src/view/
@utils/*   → ./src/utils/
@/types/*  → ./src/types/
```

---

## Key Design Constraints for Agents

1. **All API calls are GET** (except `PUT /app-config`). This is a read-heavy analytics app.
2. **No form submissions** beyond admin settings. Don't add mutation hooks without being asked.
3. **Authentication is Asgardeo** (WSO2's IdP). Never stub or bypass auth in production code.
4. **Data is always in LKR internally.** Currency conversion happens in the frontend via `formatWithSymbol()` in `utils/currency.ts`.
5. **Role precedence:** `viewMode` in `ViewModeContext` controls which panel renders, not the user's actual role. A Finance Admin can switch to employee view.
6. **No nested routes.** All routes are children of `/` with Layout as the parent.
7. **Modals are state-driven.** There are no modal routes. All drilldowns use `useState` to gate modal open state.
8. **Charts are custom-built**, not from a chart library. Modifying chart behavior means editing SVG/CSS logic directly in `component/chart/`.
9. **Backend is stateless** (JWT auth, no sessions). User context per request is derived from the JWT in `x-jwt-assertion`.
10. **Caching is in-memory** (Ballerina cache, 30 min TTL for user info; frontend hook-level Map cache for transactions).
