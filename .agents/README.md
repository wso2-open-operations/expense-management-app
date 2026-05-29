# Expense Management App — Agentic Documentation

This directory contains architectural documentation for LLM-assisted development and maintenance of this project.

## Documents

| File | Contents |
|---|---|
| [01-overview.md](01-overview.md) | Tech stack, full repo layout, how to build and zip as a microapp, TypeScript aliases, key design constraints |
| [02-navigation.md](02-navigation.md) | React Router setup, full route map, ViewModeContext, sidebar, auth/session flow, modal patterns, nav state persistence |
| [03-api-layer.md](03-api-layer.md) | Axios client config, Redux store, all API endpoints (table), response type shapes, caching patterns, date range resolution |
| [04-features.md](04-features.md) | Screen-by-screen breakdown: every UI section, every user interaction, state variables, loading/error/empty states, shared components |
| [05-backend.md](05-backend.md) | Ballerina service, all endpoints with params/responses, MySQL schema, CC category logic, authorization module, HR Entity integration |

## Quick Reference

**Add a new screen:**
1. Create `webapp/src/view/<domain>/<Domain>.tsx` and `panel/<Panel>.tsx`
2. Add route to `webapp/src/route.ts` with `allowRoles`
3. Add API hook in the appropriate slice file
4. Backend: add resource to `service.bal`, query in `modules/database/`, type in `types.bal`

**Add a new API endpoint:**
1. Backend: add `resource function get /my-endpoint(...)` in `service.bal`
2. Add DB query function in relevant `*_queries.bal` + `*_functions.bal`
3. Add response type in `types.bal`
4. Frontend: add hook in the relevant slice file following patterns in `03-api-layer.md`

**Change which panel shows for a role:**
- See `02-navigation.md` → ViewModeContext section
- Edit `webapp/src/view/<domain>/<Domain>.tsx` ternary

**Modify currency rates:**
- Edit `webapp/src/utils/currency.ts` → `CURRENCIES` object (LKR, USD, EUR rates)

**Change claim limits / grace period / locations:**
- Runtime: `PUT /app-config` (Finance Admin only)
- Default: `Config.toml` → `[expense_management.appConfig]`
