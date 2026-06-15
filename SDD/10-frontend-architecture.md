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
│   └── tours/             # Viator tours (gated by module key `events`)
├── premium/               # paywall, manage subscription
├── settings/              # language, theme, consent, account, privacy/DSAR
└── onboarding/consent.tsx # CMP, shown first launch before any tracking
config/
  island.ts                # IslandConfig selected by EXPO_PUBLIC_ISLAND_KEY
features/<module>/         # components + hooks + queries per module
lib/                       # api client, analytics SDK, consent, theme, i18n, offline
```

**Naming:** backend/bootstrap module key is `events`; Expo tab folder and analytics module string are `tours`; feature code lives under `features/events/`.

Tabs and routes are **conditionally registered** from `enabledModules` so a transit-only island doesn't render empty tabs. `resolveEnabledModules()` in `config/island.ts` unions bootstrap flags with static `enabledModules` so client-shipped tabs are not hidden when the API flag lags.

## 2.1 Tours module (shipped)

| Piece | Location |
|-------|----------|
| Tab | `app/(tabs)/tours/` — `_layout.tsx` (stack), `index.tsx` (list), `[tourId].tsx` (detail) |
| Data | `lib/api.ts` → `fetchTours` / `fetchTour` → `/api/v3/events/tours` |
| Types | `lib/types.ts` — `TourSummary`, `TourDetail`, `TourImage` |
| UI | `features/events/components/TourCard.tsx`, `hooks/useTourQueries.ts` |
| External booking | `features/events/viator.ts` — `openViatorExternal()` uses `Linking.openURL` (default system browser); fallback affiliate URL when list is empty |
| i18n | `navBarToursLabel`, `toursSubtitle`, `tourBookCta`, duration/price keys in all 8 locale files |

No WebView / `react-native-webview` — native cards only; commission via server-injected `bookingUrl` and footer fallback link.

## 3. Theming / white-label (see [`02`](./02-multi-island-whitelabel.md))

- `ThemeProvider` consumes `IslandConfig` (colors, logos, fonts) at the root.
- Components reference `theme.primary`/`theme.secondary`/etc., never literals.
- `EXPO_PUBLIC_ISLAND_KEY` selects the config + asset bundle at build (EAS profile per island).
- Dark/light support (legacy had a theme toggle) via token sets.

## 4. Consent gate (CMP)

- `ConsentGate` wraps the app; on first launch (or policy change) it shows `onboarding/consent.tsx` **before** initializing GA/Umami or sending any `AnalyticsEvent`.
- Consent stored locally + synced to backend `ConsentRecord`.
- Analytics SDKs lazy-init only when `analytics` purpose is granted. AdMob lazy-inits for **non-premium** users after CMP decision; Google UMP decides NPA vs personalized. SDK tears down on premium upgrade or when UMP denies `canRequestAds`.
- Settings has consent re-prompt, Google ad preferences (`showPrivacyOptionsForm`), data export, and deletion (DSAR — [`07`](./07-gdpr-data-governance.md)).

## 5. Configuration (fixes legacy hardcoding)

- `EXPO_PUBLIC_API_URL` — API base (legacy hardcoded `https://api.saomiguelbus.com`; **must** be env-driven so dev/staging/prod and local work).
- `EXPO_PUBLIC_ISLAND_KEY` — active tenant.
- All requests send `X-Island` header.
- **No secrets in client** — Google Maps key and proxy `AUTH_KEY` stay server-side (legacy leaks both in client source — [`11`](./11-security-auth.md)).
- **App identity (`app.json`):** display name **São Miguel Hub**; iOS `bundleIdentifier` **`com.sousadev.saomiguelhub`** (new App Store listing); Android `package` pinned to `com.hsousa_apps.Autocarros` so the Expo build ships as an in-place update to the existing Play Store listing (see [`12`](./12-risks-open-questions.md) §3.1).
- **Native deps:** pin `@react-native-async-storage/async-storage` to the Expo SDK bundled version (e.g. `2.2.0` for SDK 56) via `npx expo install` — v3.x breaks in Expo Go.

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
| Legacy webapp Viator widget embed | Native tour cards + detail; book opens system browser |

## 9. Implementation status (`SaoMiguelBus` `revamp`, 2026-06-02)

| Tab / module | Route | API | Notes |
|--------------|-------|-----|-------|
| Transit | `(tabs)/transit/` | `/api/v3/transit/*`, bootstrap | **Shipped** — primary tab |
| Tours (`events`) | `(tabs)/tours/` | `/api/v3/events/tours` | **Shipped** — requires API `VIATOR_API_KEY` + island `events` flag |
| Earthquakes (`seismic`) | `(tabs)/earthquakes/` | `/api/v3/seismic/*` | **Shipped** — list + map, time-window filters, felt vote |
| News | `(tabs)/news/` | `/api/v3/news/*` | Implemented; tab hidden unless bootstrap enables `news` |
| Trails | `(tabs)/trails/` | `/api/v3/trails/*` | Implemented; tab hidden unless `trails` |
| Marketplace | `(tabs)/marketplace/` | `/api/v3/marketplace/*` | Implemented; tab hidden unless `marketplace` |
| Traffic | `(tabs)/traffic/` | `/api/v3/traffic/*` | Client implemented; backend `traffic/urls_v3.py` still missing — wire before enabling tab |

**São Miguel default visibility:** static `enabledModules: ['transit', 'events']` plus bootstrap merge; other modules appear when `Island.feature_flags` enables them (see API migrations `0005`–`0010`).
