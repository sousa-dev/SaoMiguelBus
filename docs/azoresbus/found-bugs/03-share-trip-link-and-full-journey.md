---
title: "Sharing — no app link, wrong language, and no way to share a whole journey"
issue: 4
severity: medium
repo: SaoMiguelBus
files:
  - features/transit/share-trip.ts
  - features/transit/components/ShareTripButton.tsx
  - features/transit/components/JourneyCard.tsx
  - app/(tabs)/transit/[tripId].tsx
---

# 4 — sharing a trip sends a bare string, and never the whole journey

## What ships today

[`features/transit/share-trip.ts:11`](../../../features/transit/share-trip.ts#L11)
is the entire message:

```ts
const message = `${trip.route}: ${trip.origin} → ${trip.destination} (${trip.start} – ${trip.end})`;
```

So a recipient gets, e.g.:

```
110: Ponta Delgada → Ribeira Grande (09h15 – 09h58)
```

Three problems:

1. **No link.** Nothing points at the app or the web app, so a share is a
   dead end for anyone who does not already have it installed.
2. **No locale.** The string has no translatable part at all — it is the same
   for a Portuguese and a Ukrainian user. The one piece of prose we could add
   ("check the app for the full schedule") therefore has nowhere to live.
3. **Legs only, never journeys.** Every share button in the AzoresBus results is
   fed a **single ride leg**, so a two-bus itinerary can only be shared as two
   separate half-trips.

### Why (3) happens

`ShareTripButton` takes a `TransitSearchResult`
([ShareTripButton.tsx:10-12](../../../features/transit/components/ShareTripButton.tsx#L10-L12)).
Inside a journey card it is rendered per ride leg, from `rideLegAsTrip(leg, journey)`
([JourneyCard.tsx:355-358](../../../features/transit/components/JourneyCard.tsx#L355-L358)).
The adapter says so in its own module doc
([journey-legs.ts:9-13](../../../features/transit/lib/journey-legs.ts#L9-L13)):

> The consequence is deliberate and worth stating: on a two-bus itinerary the
> rider tracks or shares ONE leg, not the whole journey.

The FAB on the trip detail screen has the same limit — it builds a
`TransitSearchResult` from the trip and calls the same `shareTrip`
([[tripId].tsx:90-104](../../../app/(tabs)/transit/[tripId].tsx#L90-L104)).

## Fix

### A. Localised message with an app link

Precedent already exists in this codebase: `fabShareMarketplaceInviteMessage`
carries a `{{url}}` placeholder and is translated in all eight catalogues. Do the
same here.

New keys (all eight catalogues — see [01](01-missing-i18n-keys.md) for the parity
rule):

```jsonc
// pt.json
"transitShareTripMessage": "{{route}}: {{origin}} → {{destination}} ({{start}} – {{end}})",
"transitShareJourneyMessage": "{{route}}: {{origin}} → {{destination}} ({{start}} – {{end}})",
"transitShareJourneyTransfer": "Muda em {{stop}} · {{route}} às {{time}}",
"transitShareFooter": "Vê o horário completo na app: {{url}}",

// en.json
"transitShareFooter": "Check the app for the full schedule: {{url}}",
```

`shareTrip` currently takes no `t`. Give it one rather than importing the i18n
singleton, so the message follows the language the user picked in Settings
(`i18n.language`), not the device locale:

```ts
export async function shareTrip(
  trip: TransitSearchResult,
  options: { t: TFunction; alertTitle?: string },
): Promise<void>
```

Both call sites already have `useTranslation()` in scope
([ShareTripButton.tsx:15](../../../features/transit/components/ShareTripButton.tsx#L15),
[[tripId].tsx:50](../../../app/(tabs)/transit/[tripId].tsx#L50)).

### B. The URL

Base it on `https://app.saomiguelhub.com`, behind an env-overridable constant
next to the existing [`lib/legal-urls.ts`](../../../lib/legal-urls.ts) pattern:

```ts
// lib/app-links.ts
const APP_BASE = (process.env.EXPO_PUBLIC_APP_WEB_URL ?? 'https://app.saomiguelhub.com')
  .replace(/\/$/, '');
```

Deep-link where the web app can actually receive it. Checked against
`SaoMiguelBus-webapp`:

| Target | Route | Params it reads |
|--------|-------|-----------------|
| One trip | `/transit/trip/:tripId` | `tripId` path param (`App.tsx:38`) |
| A search | `/transit?origin=&destination=` | `TransitPage.tsx:36-41` reads both and auto-enables the search |

So:

- **Single trip / leg** → `${APP_BASE}/transit/trip/${trip.id}`
- **Whole journey** → `${APP_BASE}/transit?origin=…&destination=…` (URL-encoded),
  because the web app has no journey route and a journey id
  (`"1234-3:5678-1"`, built in
  [services/v3.py:279-281](../../../../SaoMiguelBus-api/src/transit/services/v3.py#L279-L281))
  means nothing to it. The rider who opens it lands on the same search, which is
  the honest degraded target.

Add `?lang=` only if the web app grows a locale query param; it does not read one
today, so do not send one.

### C. Journey-level sharing

Add a sibling to `shareTrip`:

```ts
export async function shareJourney(
  journey: TransitJourney,
  options: { t: TFunction; alertTitle?: string },
): Promise<void>
```

Message shape — the transfer is the part worth spelling out, since it is exactly
what the two separate leg-shares lose:

```
110: Ponta Delgada (09h15) → Lagoa (09h34)
Muda em Lagoa · 205 às 09h48
205: Lagoa (09h48) → Vila Franca (10h21)

Vê o horário completo na app: https://app.saomiguelhub.com/transit?origin=…&destination=…
```

Build it from `journeyRideLegs(journey)` and the `transfer` legs already present
in `journey.legs`; `journeyRouteLabel(journey, displayRouteNumber)` in
[journey-legs.ts:41-49](../../../features/transit/lib/journey-legs.ts#L41-L49)
gives the `"110 → 205"` header. `TransitTransferLeg` carries `at`, `from`,
`waitMinutes`, `walkMinutes` — mention the walk when `walkMinutes > 0`.

### D. Where the buttons go

- **Journey card**: add one share action at the card level, next to the
  show/hide-steps row
  ([JourneyCard.tsx:142-155](../../../features/transit/components/JourneyCard.tsx#L142-L155)),
  calling `shareJourney`. Keep the per-leg `ShareTripButton` inside
  `RideLegPanel` — sharing one bus of a two-bus trip is still a real thing to
  want.
- **Direct journeys** (`transfers === 0`): only the card-level button; the
  per-leg one is a duplicate. Gate on `journeyRideLegs(journey).length > 1`.
- **Trip detail FAB**: unchanged target, but through the new localised
  `shareTrip`.

### E. Analytics

`shareTrip` already fires `track('transit', 'share', { trip_id, route })`
([share-trip.ts:12](../../../features/transit/share-trip.ts#L12)). `shareJourney`
should fire the same event with `{ journey_id, routes, transfers }` so the two
are comparable and we can see whether whole-journey sharing is actually used.

## Verification

- Share a direct trip in Portuguese, English and one RTL-free non-Latin locale
  (`zh`): the footer sentence is translated and the URL is intact.
- Share a two-bus journey: one message, both buses, the change named.
- Open each shared URL on a device without the app: the web app loads the trip
  or the pre-filled search rather than the home page.
