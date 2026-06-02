# SDD 10 — Frontend Architecture (Expo, single codebase)

One Expo (React Native + Web) codebase ships Android, iOS, and Web. Replaces the legacy webapp (2.4k-line `index.html` + global JS), native Android, and Flutter clients.

## 1. Stack

| Concern | Choice |
|---------|--------|
| Framework | Expo + **Expo Router** (file-based routing, deep links, web routes) |
| Language | TypeScript (strict) |
| Server state | TanStack Query (cache, retries, offline) |
| Client state | Zustand (theme, consent, session, entitlement) |
| Styling | Theme tokens from island config; no hardcoded brand values |
| i18n | typed i18n, **Portuguese-first** (`pt` default + fallback). Core: `pt,en,de,es,fr`; legacy `it,uk,zh` optional. Per-island set from `Island.locales` — see [`02 §7`](./02-multi-island-whitelabel.md#7-language-strategy-portuguese-first-extensible) |
| Maps | `react-native-maps` (native) + MapLibre/Leaflet (web); offline tiles via MapLibre |
| Push | Expo Notifications |
| Payments | Stripe web SDK + RevenueCat SDK |
| API types | generated from backend OpenAPI (single source of truth) |

## 2. Routing layout (Expo Router)

```
app/
├── _layout.tsx            # ThemeProvider(islandConfig) + ConsentGate + QueryClient + i18n
├── index.tsx              # redirect to default enabled module
├── (tabs)/
│   ├── _layout.tsx        # bottom tabs; tabs rendered per enabledModules
│   ├── transit/           # search, results, line detail, directions, favorites
│   ├── news/
│   ├── earthquakes/
│   ├── marketplace/
│   ├── trails/
│   ├── traffic/
│   └── events/            # incl. Viator tours
├── premium/               # paywall, manage subscription
├── settings/              # language, theme, consent, account, privacy/DSAR
└── onboarding/consent.tsx # CMP, shown first launch before any tracking
config/
  island.ts                # IslandConfig selected by EXPO_PUBLIC_ISLAND_KEY
features/<module>/         # components + hooks + queries per module
lib/                       # api client, analytics SDK, consent, theme, i18n, offline
```

Tabs and routes are **conditionally registered** from `enabledModules` so a transit-only island doesn't render empty tabs.

## 3. Theming / white-label (see [`02`](./02-multi-island-whitelabel.md))

- `ThemeProvider` consumes `IslandConfig` (colors, logos, fonts) at the root.
- Components reference `theme.primary`/`theme.secondary`/etc., never literals.
- `EXPO_PUBLIC_ISLAND_KEY` selects the config + asset bundle at build (EAS profile per island).
- Dark/light support (legacy had a theme toggle) via token sets.

## 4. Consent gate (CMP)

- `ConsentGate` wraps the app; on first launch (or policy change) it shows `onboarding/consent.tsx` **before** initializing GA/Umami/AdMob/AdSense or sending any `AnalyticsEvent`.
- Consent stored locally + synced to backend `ConsentRecord`.
- Analytics/Ads SDKs are lazy-initialized only for granted purposes and torn down on withdrawal.
- Settings has a "Privacy" screen for re-consent, data export, and deletion (DSAR — [`07`](./07-gdpr-data-governance.md)).

## 5. Configuration (fixes legacy hardcoding)

- `EXPO_PUBLIC_API_URL` — API base (legacy hardcoded `https://api.saomiguelbus.com`; **must** be env-driven so dev/staging/prod and local work).
- `EXPO_PUBLIC_ISLAND_KEY` — active tenant.
- All requests send `X-Island` header.
- **No secrets in client** — Google Maps key and proxy `AUTH_KEY` stay server-side (legacy leaks both in client source — [`11`](./11-security-auth.md)).

## 6. Offline strategy

- Transit schedule + trails + last news cached via TanStack Query persistence + AsyncStorage (replaces legacy `localStorage.apiData`).
- Offline map tiles (MapLibre MBTiles) for trails/traffic.
- Graceful degradation: features needing network (live directions, submitting reports) disable cleanly offline (legacy already hides directions offline).
- PWA: web target keeps installability + service worker (cleaner than the legacy SW that referenced a non-existent `agentHandler.js`).

## 7. Analytics SDK (client side, see [`06`](./06-analytics-tracking.md))

`track(module, eventType, properties)` — consent-gated, batched, PII-stripped, mirrors to GA/Umami only with consent.

## 8. Migration notes from legacy frontend

| Legacy | New |
|--------|-----|
| Show/hide `<section class="page">` | Expo Router screens |
| Global functions + `innerHTML` | React components + hooks |
| Cookies/`localStorage` ad-hoc state | Zustand + persisted Query cache |
| Hardcoded API URL | `EXPO_PUBLIC_API_URL` |
| Tailwind CDN, no build | RN styling/theme tokens, EAS builds |
| Three clients (web/Android/Flutter) | one Expo codebase |
| 8 JSON locales | typed i18n, **Portuguese-first**; core `pt,en,de,es,fr` maintained, `it,uk,zh` optional (keep keys, run `check_locale_keys` equivalent against `pt`) |
