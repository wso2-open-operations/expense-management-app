# entity

Provides integration with the HR entity REST service for resolving employee information by work email.

## Overview

The module wraps the HRIS HR Entity REST API behind a small, typed Ballerina interface. Callers supply one or more work email addresses and receive structured `Employee` records (first name, last name, thumbnail URL). The underlying HTTP client is configured at startup via `hrEntityBaseUrl` in `Config.toml`.

## Components

### Client

| Name | Description |
|---|---|
| `hrClient` | Shared `http:Client` instance pointed at `hrEntityBaseUrl`. Annotated with the Choreo display metadata `hris/hr-entity-service`. |

### Types

| Name | Description |
|---|---|
| `Employee` | Public record with `firstName`, `lastName`, and optional `employeeThumbnail` URL — the fields returned by the HR entity service. |
| `EmployeeSearchFilter` | Internal request payload sent to `/employee-basic-search` — contains a single `email` field. |

### Functions

| Name | Description |
|---|---|
| `fetchEmployeesBasicInfo` | POSTs `{ "email": workEmail }` to `/employee-basic-search` and returns the typed `Employee` record. Returns an error on 404 or any non-2xx response. |
| `fetchEmployeeNameMap` | Resolves a list of emails in sequence and returns a `map<string>` of lowercase email → `"firstName lastName"`. Skips blank entries and already-resolved emails. |

## Configuration

```toml
hrEntityBaseUrl = "https://your-hr-entity-service/api"
```

## Usage

```ballerina
import expense_management.entity;

// Single lookup
entity:Employee emp = check entity:fetchEmployeesBasicInfo("jane.doe@example.com");
string fullName = emp.firstName + " " + emp.lastName;

// Bulk lookup for display names
map<string> names = check entity:fetchEmployeeNameMap(["alice@example.com", "bob@example.com"]);
string aliceName = names["alice@example.com"] ?: "Unknown";
```

## Error handling

- `fetchEmployeesBasicInfo` propagates HTTP transport errors and returns a descriptive `error` on 404 or unexpected status codes.
- `fetchEmployeeNameMap` is best-effort: if a single email lookup fails, that email is silently skipped and the map is returned without it.
