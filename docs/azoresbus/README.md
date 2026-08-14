---
title: "AzoresBus September 2026 network changeover — plan set"
status: draft
date: 2026-08-13
target_repos:
  - SaoMiguelBus-api
  - SaoMiguelBus
---

# AzoresBus changeover — implementation plan set

São Miguel's bus network is replaced wholesale on **1 September 2026** by the new
AzoresBus concession (55 routes, new numbering `101`–`335` / `E01`–`E02` / `N01`–`N05`,
new stop network, new tariffs). The app must switch over **on the date, by itself**,
for users who never install an update.

| Doc | Scope |
|-----|-------|
| [00-overview-and-decisions.md](00-overview-and-decisions.md) | Timeline, the four decisions that make this work without an app update, risk register |
| [01-upstream-api-reference.md](01-upstream-api-reference.md) | Reverse-engineered contract for `azb.elevensystems.pt` + `azoresbus.pt` — **verified live 2026-08-13** |
| [02-backend-plan.md](02-backend-plan.md) | `SaoMiguelBus-api`: schema + versioning, sync worker, rate limiting, gateway, tariffs, live tracking (built, disabled) |
| [03-mobile-plan.md](03-mobile-plan.md) | `SaoMiguelBus`: server-driven timeline UI, preview toggle, badges, offline/premium, tracking that lights up on its own |

## The one-paragraph version

The upstream vendor (Eleven Systems — the same vendor already behind PDL Mini Bus
tracking) exposes the **new timetables today**, date-scoped via `?day=YYYY-MM-DD`, and
already answers on a `/api/locations` live-tracking endpoint that currently returns `[]`.
So we sync both datasets into our own DB behind a `dataset` version tag, and let the
**server** decide which dataset a given request resolves to based on the date. Clients
that never update still flip correctly at midnight on 1 September, because they never
had the cutover logic in the first place — the API did.

## Status of the research

Everything in [01-upstream-api-reference.md](01-upstream-api-reference.md) was verified
against the live upstream on 2026-08-13, not inferred from documentation. Counts,
payload shapes, parameter behaviour, and the rate-limit budget are measured. Two facts
are load-bearing and worth re-verifying before build starts:

1. `?day=` filtering returns different journey sets either side of 1 September.
2. `https://azb.elevensystems.pt/api/locations` returns `200 []` — the endpoint is live,
   the fleet simply is not reporting yet.
