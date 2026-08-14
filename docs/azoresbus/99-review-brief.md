# Review brief — AzoresBus changeover plan set

Copy everything below the line into a fresh agent.

---

You are reviewing a set of implementation plans for a bus-network changeover, and
independently verifying the factual claims they rest on against a live third-party API.

**Be adversarial. The plans were written by another agent and have not been reviewed by
anyone.** Your job is to find what is wrong, missing, or over-confident — not to
summarise or endorse. A review that finds nothing is a failed review; a review that
invents problems to look thorough is worse. Report what you can evidence.

## Repos

| Path | What |
|------|------|
| `/Users/sousa/Documents/Sousa Dev/SMB/SaoMiguelBus` | Expo/React Native app. Plans live in `docs/azoresbus/` |
| `/Users/sousa/Documents/Sousa Dev/SMB/SaoMiguelBus-api` | Django API (`src/`) |

## Background

São Miguel's bus network is replaced on **1 September 2026** by the AzoresBus
concession. The app must switch over on the date **without requiring an app update** —
including for users who installed months earlier and for Premium users who are offline
across the cutover. The upstream operator's API is public and undocumented; everything
in `01-upstream-api-reference.md` was reverse-engineered by probing it.

Read, in order:

1. `docs/azoresbus/README.md`
2. `docs/azoresbus/00-overview-and-decisions.md`
3. `docs/azoresbus/01-upstream-api-reference.md`
4. `docs/azoresbus/02-backend-plan.md`
5. `docs/azoresbus/03-mobile-plan.md`

---

## Part 1 — Verify the upstream claims against the live API

Base URLs: `https://azb.elevensystems.pt/api` and `https://azoresbus.pt/static/json`.
No auth. Plain GET.

**Rate-limit yourself: serial requests, ≥ 0.3 s apart.** This is a small operator's
production system and we want them to keep answering. Do not parallelise. If you need a
large sweep, say so in your report rather than running thousands of requests.

Today's date in this environment is **2026-08-13**.

### 1.1 The highest-value unknown — do it first

The plan claims the service calendar has **exactly three patterns** (weekday / Saturday /
Sunday, with holidays resolving to Sunday). The entire schema mapping depends on this,
because our existing `transit.Calendar` model has exactly those three values.

But the sweep behind that claim found **895 unique journey IDs while the maximum ID
observed was 1259**. Roughly **364 journey IDs are unaccounted for.**

Find out what they are. Candidate explanations, in rough order of how much damage each
would do to the plan:

- **A fourth service pattern** (school-term vs holidays, summer vs winter) that the
  3-date sample missed → **the plan's schema mapping is wrong and must change**
- Journeys belonging to `isActive: false` routes (the routes list was fetched with `?active=true`)
- The 5 routes with no weekday service (`112`, `321`, `324`, `325`, `328`) having service on other dates
- Soft-deleted or historical journeys never returned by any date

Suggested probe: pick 2–3 high-frequency routes and walk `?day=` across a wider window —
e.g. one date per week from 2026-09-01 through 2027-01-31, plus a summer window
(2027-07-01 … 2027-08-31) — and watch for journey IDs outside the known set. **A
seasonal timetable is the single most plausible way this plan is wrong.**

Related unexplained data point: `?day=2026-06-10` returned **zero** journeys on every
route tried, while `?day=2026-08-15` (also a holiday) returned the Sunday set. Explain
the difference.

### 1.2 Claims to re-measure

Confirm or refute each. Report the actual value when it differs.

| # | Claim | Where |
|---|-------|-------|
| 1 | `GET /api/stops` returns **1456** stops with **816** distinct `name` values (630 pairs, 5 triples, 181 singletons) | 01 §2 |
| 2 | Duplicate-name groups: median separation **12 m**, mean 17 m, **max 164 m**, zero groups > 250 m, 3 groups > 100 m | 01 §2 |
| 3 | **629 of 630** duplicate pairs have consecutive integer codes | 01 §2 |
| 4 | The paired codes are **direction-selected**: on route 101, 24 of 27 names served both ways use a different code per direction; route 102, 10 of 14 | 01 §2.1 |
| 5 | Which of a pair is the lower number is **not** consistent across stops (so side cannot be inferred from the code alone) | 01 §2.1 |
| 6 | `GET /api/routes?active=true&passengerInfo=true` returns **55** routes, 3 distinct colours | 01 §3 |
| 7 | `day` is the **only** bound query param; `?direction=abc` is ignored (200), `?day=abc` is rejected (400) | 01 §4.1 |
| 8 | `day` takes an ISO date; weekday names (`Monday`, `Sunday`, `1`, `0`) all return 400 | 01 §4.1 |
| 9 | Route 25: Wed 2026-09-02 → 17 journeys, IDs 488–504; Sat 09-05 → 10, IDs 505–514; Sun 09-06 → 8, IDs 515–522 (day-types partition, IDs do not overlap) | 01 §4.2 |
| 10 | Holidays 2026-10-05, 2026-12-08, 2026-12-25, 2026-08-15, 2027-01-01 all return the **Sunday** set with zero new IDs | 01 §4.2 |
| 11 | The September change is real: route 25 Sat 2026-08-15 → 8 journeys (first 08:00) vs Sat 2026-09-05 → 10 (first 06:30) | 01 §4.3 |
| 12 | **13 of 50** routes revisit a stop name within one journey; route 335 does it **37 times in 97 stops**; 5 routes are loops (`301`, `303`, `306`, `323`, `N03`); 10 are single-direction | 01 §4.5 |
| 13 | `GET /api/locations` → **200 `[]`**; `/publicapi/locations` on this host → 404; PDL's `https://pdl.elevensystems.pt/publicapi/locations` → 200 with live vehicles | 01 §6 |
| 14 | PDL vehicle detail top-level keys are exactly: `currentStopSequence`, `fleetId`, `id`, `journey`, `licensePlate`, `position`, `route`, `speed`, `status` | 01 §6 |
| 15 | `tariffs.json` serves `Last-Modified` and `ETag`; payload `date` is `2026-09-01`; **4** categories; `fareUnits` are text band labels (`"0 a 5"`) not numbers | 01 §7 |
| 16 | Journey detail includes an encoded polyline `shape`; `/api/routes/{id}` also has `shape` plus a `stops[]` union with zeroed sequences | 01 §3, §5 |
| 17 | The listed endpoints in 01 §8 are all genuinely 404 (no GTFS, no alerts feed) | 01 §8 |

### 1.3 Things nobody has checked yet

- Are `departureTime` values **ever > 86400** (past-midnight)? The plan adds a
  `StopTime.day_offset` field on the assumption they might be, and names the `N0x` night
  routes as the likely case. **Verify — if it never happens, that field is speculative
  complexity; if it does, confirm the plan handles stop ordering correctly.**
- Are journey IDs **stable over time**? The sync design dedupes journey-detail fetches on
  a `payload_hash` keyed by journey ID. If upstream regenerates IDs on each timetable
  publish, that optimisation silently breaks and calendars churn. Compare a route's IDs
  now against any evidence of past values you can find.
- Does `isActive: true/false` on a **route** mean anything we should honour?
- Do any two stops share a name but are genuinely **different places** (not a road pair)?
  The plan collapses by name and only flags > 75 m.
- Is there an `Access-Control-*` / `Retry-After` / `X-RateLimit-*` header anywhere?
- Does the operator publish a GTFS feed anywhere else (check `azoresbus.pt` pages, not
  just the API)? It would retire most of the sync worker.

---

## Part 2 — Verify the claims about our own codebases

The plans assert that certain things already exist and can be reused. Check each
against the actual source; the plans cite file:line in places.

| Claim | Verify at |
|-------|-----------|
| `transit.Calendar` has exactly `WEEKDAY`/`SATURDAY`/`SUNDAY` | `src/transit/models.py` |
| `search.get_type_of_day()` already maps holidays → Sunday | `src/transit/services/search.py` |
| Search resolves stops by **first occurrence** (`stops_str.find`), which the plan says breaks on loop routes | `src/transit/services/search.py:106` |
| The offline client has the same bug (`stopKeys.indexOf`) | `SaoMiguelBus/lib/offline-bundle.ts:218` |
| `Island.feature_flags` is the existing flag mechanism and reaches the app via bootstrap | `src/tenancy/models.py`, `src/tenancy/bootstrap.py` |
| Offline bundle versioning via `data_revision` + `compute_bundle_version` | `src/transit/services/offline_bundle.py` |
| The minibus tracking stack (client / cache / stale-grace / health probe) is a fair template to mirror | `src/minibus/tracking_client.py`, `src/minibus/services_tracking.py` |
| The Tailscale Pi proxy exists and forwards `/publicapi/*` | `src/minibus/docs/tailscale-tracking-proxy.md` |
| `MinibusImportMeta` is a reasonable precedent for import metadata | `src/minibus/models.py` |
| Celery beat entries are registered via migrations | `src/minibus/migrations/0006_periodic_task_harvest_route_shapes.py` |
| Adding `dataset` to `Line` genuinely requires changing `unique_together` (i.e. line codes really do collide across networks) | `src/transit/models.py` + inspect real legacy data if you can |

Also check things the plans **did not** look at but should have:

- Does anything else query `Trip`/`Stop`/`Line` without a `dataset` filter and would
  therefore silently start mixing networks? Grep the whole API — `directions_v3.py`,
  `compat.py` (the v2 legacy endpoints!), `offline_bundle.py`, admin, analytics.
  **The `/api/v2/webapp/load` compat path is a specific worry: the webapp still uses it.**
- Are there existing tests that would break?
- Does the webapp (`/Users/sousa/Documents/Sousa Dev/SMB/SaoMiguelBus-webapp`) consume
  any of these endpoints in a way the plan ignores? The plan declares the webapp out of
  scope — assess whether that is actually safe or just deferred breakage.

---

## Part 3 — Challenge the design

Push on these. Say clearly if you think the plan is right; say clearly if not.

1. **Server-driven cutover.** All phase/date logic lives in `/api/v3/bootstrap`
   (`transitSchedule`), and unversioned search requests resolve dataset by date
   server-side. Is there a failure mode where an old client gets the *wrong* network?
   What happens to a client with a stale cached bootstrap? What about a user mid-session
   at local midnight on 1 September?
2. **Offline dual-dataset bundle.** The bundle ships both networks plus `cutoverDate`,
   and the client picks by device date. Estimated at ~1.3 MB before compression — **that
   estimate is unmeasured arithmetic, not a real payload.** Check it. Is AsyncStorage
   viable at that size on Android? The plan suggests moving to `expo-file-system` if not.
3. **Stop collapse (1456 → 816).** The plan collapses by name for search/pickers, keeps
   the pole on `StopTime.external_stop` for rendering, and shows the stop code (printed
   on the physical pole) at boarding time. Is one picker entry per name right, or should
   the two poles be selectable? Consider tourists, accessibility, and the 3 groups > 100 m.
4. **Sequence-based stop matching.** The proposed rule is "all (board, alight) pairs where
   `board.sequence < alight.sequence`, pick earliest departure ≥ requested start,
   shortest ride on ties." Does that give sane results on route 335 (37 repeated names)
   and on the 5 loop routes? Is the tie-break right? **Does it need to be identical
   between server and offline client, and is that realistically maintainable in two
   languages?**
5. **Sync strategy.** Weekly cron + a lazy staleness backstop, ~1117 requests at 0.35 s
   (~7 min), daily during late August. Too aggressive? Not aggressive enough? Is the
   pruning step safe if upstream returns a partial dataset during a deploy on their side?
6. **Tracking built but flag-gated off.** Reasonable, or speculative work for an endpoint
   that may never populate?
7. **What is missing entirely?** Fare calculation for a journey (the tariffs are
   distance-banded in km — does anything tell us the km between two stops?), service
   alerts, accessibility data, journeys that require a transfer between routes. Is
   ignoring transfers acceptable for a 55-route network that replaced a simpler one?

---

## Output

Write your findings to `docs/azoresbus/98-review-findings.md`. Structure:

1. **Verdict** — one paragraph. Is this plan safe to build from?
2. **Blocking issues** — things that must change before implementation starts. Include
   the evidence (actual API response, actual file:line).
3. **Corrections** — factual errors in the docs, with the measured value.
4. **Gaps** — things the plan does not address and should.
5. **Design challenges** — where you disagree, with reasoning.
6. **Confirmed** — a compact list of claims you verified as correct, so the next reader
   knows what has been checked. Brevity is fine here.
7. **Still unknown** — what you could not determine and how someone would find out.

Rules:

- **Cite evidence for every claim.** An actual response body, a file:line, a command and
  its output. "This looks wrong" without evidence is not a finding.
- **Do not trust the docs.** They are the thing under review. Where a doc states a
  measurement, re-measure it.
- **Do not edit the plan docs.** Report; the author will revise.
- Rank findings by impact. A wrong service-calendar model outranks a typo.
- If you find nothing wrong in a section, say so plainly and move on — do not pad.
