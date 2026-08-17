---
title: "AzoresBus September 2026 network changeover — plan set"
status: draft
date: 2026-08-14
revision: 2
supersedes: 2026-08-13 draft
target_repos:
  - SaoMiguelBus-api
  - SaoMiguelBus
  - SaoMiguelBus-webapp
---

# AzoresBus changeover — implementation plan set

São Miguel's bus network is replaced wholesale on **1 September 2026** by the new
AzoresBus concession (55 routes, new numbering `101`–`335` / `E01`–`E02` / `N01`–`N05`,
new 1456-stop network, new tariffs). The product goal is unchanged: **cut over on
1 September**, server-driven, with no app release required on the day.

> **Read [98-review-findings.md](98-review-findings.md) first.** It is the source of
> truth for every measured fact in this set. It was produced by an adversarial review
> that ran ~1,500 serial GETs against the live upstream on 2026-08-14 and read all three
> codebases. Where these plans and `98` disagree, `98` wins. This revision (2026-08-14)
> exists because the 2026-08-13 draft was wrong on two load-bearing points.

| Doc | Scope |
|-----|-------|
| [00-overview-and-decisions.md](00-overview-and-decisions.md) | Timeline, the six decisions, changelog vs the 2026-08-13 draft, risk register |
| [01-upstream-api-reference.md](01-upstream-api-reference.md) | Reverse-engineered contract for `azb.elevensystems.pt` + `azoresbus.pt` — corrected against `98` |
| [02-backend-plan.md](02-backend-plan.md) | `SaoMiguelBus-api`: service-calendar schema, date-sampling sync, dataset isolation, new bundle endpoint, gateway, tariffs, tracking stub |
| [03-mobile-plan.md](03-mobile-plan.md) | `SaoMiguelBus`: server-driven phase UI, sequence-honouring result pipeline, file-system offline bundle, honest offline matrix |
| [98-review-findings.md](98-review-findings.md) | **Source of truth.** Measured facts, blockers B0–B8, corrections, open questions |
| [99-review-brief.md](99-review-brief.md) | The brief that produced `98` |

## The one-paragraph version

The upstream vendor (Eleven Systems — the same vendor behind PDL Mini Bus tracking)
already serves the **AzoresBus** timetables, date-scoped via `?day=YYYY-MM-DD`, from
`azb.elevensystems.pt`. It serves **only** AzoresBus: the feed has no outgoing-operator
period, and non-holiday dates in August already return the September journey sets
(`98` B1). So we import AzoresBus into our own DB under `dataset='azoresbus'`, keep the
current network as `dataset='legacy'` where it already lives, and let the **server**
decide which dataset an unversioned request resolves to, from the `Atlantic/Azores`
date. That is what makes an app installed in June show the right timetables in
September — **while it is online**. Offline is a different story and we do not pretend
otherwise: the current offline bundle has no dataset concept, so builds already in the
wild cannot switch networks offline. Only builds carrying the
[03](03-mobile-plan.md) work download the new schema-versioned bundle and switch offline
at the cutover instant (`98` B3).

## What the 2026-08-13 draft got wrong

Two claims were load-bearing and are false. They are corrected throughout; each
overturned sentence cites `98`.

1. **"Exactly three service patterns (`WEEKDAY`/`SATURDAY`/`SUNDAY`), no school-day or
   summer calendar."** False (`98` B0). Upstream service is **weekday-specific and
   school-term/seasonal**. Line 307 runs 33 journeys in summer and **38** from Mon
   2026-09-14; line 112 runs **Tuesday and Thursday only**; 102 has a Wednesday-only
   journey and a *different* Friday-only journey; 315 drops one journey on Wednesdays.
   Syncing "next Wed/Sat/Sun after 1 September" lands on 2026-09-02 and stores the
   **summer** timetable.
2. **"Dates before the concession start return the outgoing operator's service."**
   False (`98` B1). The cited comparison (Sat 2026-08-15) is **Assumption Day**, which
   upstream resolves to the Sunday set. Non-holiday August Saturdays return the exact
   September journeys (ids 505–514, first 06:30). There is no legacy feed to sync from
   this host. Observed data floor: **2026-07-27**.

Two supporting claims also changed: past-midnight times **wrap below 86400** rather than
exceeding it (`98` B2), and `isActive: false` is a display flag, not a service predicate
(`98` B5).

## Status of the research

Everything in [01-upstream-api-reference.md](01-upstream-api-reference.md) is measured,
not inferred — but the measurements that matter now are the **2026-08-14** ones in `98`,
which superseded the 2026-08-13 numbers. Do not re-probe the live API to confirm them;
~1,500 serial GETs already ran and hammering `azb.elevensystems.pt` before we have a
proxy path and a `User-Agent` is exactly the behaviour that gets us blocked.

Three things are worth re-verifying **once**, cheaply, before build starts, because they
gate design rather than confirm it:

1. The **school-term start and end dates** beyond the observed 2026-09-14 flip. Unknown
   today (`98` §7); the plan handles it by sampling rather than by hardcoding.
2. Whether `https://azb.elevensystems.pt/api/locations` is still `200 []` when the
   tracking gateway lands — it is the flag that decides when tracking lights up.
3. Whether Hetzner egress is 403 on `azb` the way it is on `pdl`. The review's probe
   egressed via LIS and got 200, so this is untested from our infrastructure.
