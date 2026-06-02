# UI-SDD 00 — Rebrand Overview & Cross-Cutting Rules

Spec-driven **UI rebrand** of the Azores Hub Expo client (`SaoMiguelBus`). One document per page lives in this folder; this file is the index and the contract every page doc inherits.

These docs describe **target UI**, not current code. They respect the product SDD: white-label token discipline ([`SDD/02`](../../SDD/02-multi-island-whitelabel.md) §4) and the Expo frontend architecture ([`SDD/10`](../../SDD/10-frontend-architecture.md)). Nothing here introduces literal brand colors into components.

---

## 1. Why rebrand

The app shipped feature-complete but visually utilitarian: flat cards, emoji glyphs (`⚙`, `📍`, `🗓`, `👍`), inconsistent spacing/radii, ad-hoc headers, and a minimal 8-token theme. The rebrand makes it feel like **one modern, native product** across iOS and Android:

- A single design system (tokens + components) instead of per-screen `StyleSheet` drift.
- Real vector iconography (`lucide-react-native`) everywhere — no emoji as UI.
- Platform-native feel: iOS large titles + SF-style spacing; Android Material 3 elevation + ripple.
- Consistent states (loading / empty / error / offline) with shared components.
- The **Hub** as the branded front door (see [`10-hub.md`](./10-hub.md)).

## 2. Brand foundation

São Miguel identity (tokens, never literals in components — [`config/island.ts`](../../config/island.ts)):

| Token | Value (São Miguel) | Role |
|-------|--------------------|------|
| `primary` | `#218732` (Azores green) | Primary actions, active states, brand |
| `secondary` | `#343434` (basalt) | Secondary actions, neutral emphasis |
| `accent` | `#ffc107` (amber) | Highlights, badges, ratings, sparing use |

The rebrand **extends** the token set with semantic tokens (surfaces, on-color, success/warning/danger, scrim) — see [`01-design-system.md`](./01-design-system.md) §2. White-label rule holds: swapping `EXPO_PUBLIC_ISLAND_KEY` reskins everything; no component edits.

## 3. Document set

| # | Doc | Pages covered |
|---|-----|----------------|
| 00 | this file | — |
| 01 | [`01-design-system.md`](./01-design-system.md) | tokens, type, spacing, elevation, icons, components |
| 02 | [`02-navigation-shell.md`](./02-navigation-shell.md) | root layout, tab bar, stack headers, header buttons |
| 10 | [`10-hub.md`](./10-hub.md) | Hub landing grid |
| 11–13 | [`11-transit-search.md`](./11-transit-search.md), [`12-transit-directions.md`](./12-transit-directions.md), [`13-transit-trip-detail.md`](./13-transit-trip-detail.md) | Transit |
| 20–21 | [`20-tours-list.md`](./20-tours-list.md), [`21-tours-detail.md`](./21-tours-detail.md) | Tours |
| 30–31 | [`30-earthquakes-list.md`](./30-earthquakes-list.md), [`31-earthquake-detail.md`](./31-earthquake-detail.md) | Seismic |
| 40–41 | [`40-trails-list.md`](./40-trails-list.md), [`41-trail-detail.md`](./41-trail-detail.md) | Trails |
| 50–51 | [`50-news-list.md`](./50-news-list.md), [`51-news-article.md`](./51-news-article.md) | News |
| 60–62 | [`60-marketplace-list.md`](./60-marketplace-list.md), [`61-marketplace-detail.md`](./61-marketplace-detail.md), [`62-marketplace-form.md`](./62-marketplace-form.md) | Marketplace |
| 70–72 | [`70-traffic-map.md`](./70-traffic-map.md), [`71-traffic-detail.md`](./71-traffic-detail.md), [`72-traffic-report.md`](./72-traffic-report.md) | Traffic |
| 80 | [`80-settings.md`](./80-settings.md) | Settings |
| 81 | [`81-onboarding-consent.md`](./81-onboarding-consent.md) | Consent / CMP |
| 90 | [`90-not-found.md`](./90-not-found.md) | 404 / fallback |

## 4. Per-page doc template

Every page doc uses this structure so they're comparable and implementable:

1. **Screen & route** — file path + Expo Router route.
2. **Purpose** — what the user does here, role in the Hub.
3. **Current state** — grounded summary of today's UI (with file ref).
4. **Rebrand direction** — layout, hierarchy, components (referenced from `01-design-system.md`), tokens, icons to introduce.
5. **iOS specifics** — large title, sheets, haptics, safe-area.
6. **Android specifics** — Material elevation, ripple, back handling, edge-to-edge.
7. **States** — loading / empty / error / offline (only those that apply).
8. **Motion & haptics** — transitions, micro-interactions.
9. **Accessibility** — labels, roles, hit targets, contrast, dynamic type.
10. **Acceptance checklist** — verifiable items.

## 5. Cross-cutting rules (apply to every page)

### 5.1 Tokens & theming
- Components reference theme tokens only (`theme.primary`, `theme.surface`, …). No hex literals, including `'#fff'` — use `theme.onPrimary` / `theme.onSurface`.
- All screens work in **light and dark** ([`SDD/10`](../../SDD/10-frontend-architecture.md) §3). Test both; never assume a white background.
- Spacing, radius, type come from the scale in `01-design-system.md` — no magic numbers in `StyleSheet`.

### 5.2 Icons
- `lucide-react-native` only; emoji are removed from UI (`⚙`→`Settings`, `📍`→`MapPin`, `🗓`→`CalendarClock`, `👍/👎`→`ThumbsUp/ThumbsDown`, `✕`→`X`, `🚶/🚌`→`Footprints/Bus`).
- Default stroke width `2`, sizes from the icon scale (`16/20/24/32`). Icon color = adjacent text color or accent, never a new literal.
- Every standalone icon button has `accessibilityLabel` and a ≥44×44pt (iOS) / 48×48dp (Android) hit target.

### 5.3 Native feel
- Use `Platform.select` for elevation (iOS shadow vs Android `elevation`) — codified as the `surface`/`card` elevation tokens.
- Respect safe areas via the shared `Screen` ([`components/Screen.tsx`](../../components/Screen.tsx)); content under a stack header passes `withStackHeader`.
- Modal pickers/sheets use real bottom sheets with grabber, rounded top corners, and scrim — not full-screen `Modal` where a sheet is expected.
- Lists use `FlatList` with `RefreshControl` tinted `theme.primary`; pull-to-refresh on every feed.

### 5.4 Motion & haptics
- Use `react-native-reanimated` (already a dep, `4.3.1`) for enter/press animations; keep durations 150–250ms, standard easing.
- Press feedback: Android ripple (`android_ripple`), iOS opacity/scale. Honor `prefers-reduced-motion`.
- Haptics (`expo-haptics`, to add) on commit actions only: pin toggle, submit report, felt-vote, favorite toggle.

### 5.5 States
- Shared `LoadingState`, `EmptyState`, `ErrorState`, `OfflineBanner` components (spec in `01-design-system.md` §6). No bare centered `ActivityIndicator` or lone muted `Text` per screen.
- Empty/error states get an icon, a title, a one-line explanation, and (where useful) a retry/CTA.

### 5.6 Accessibility (WCAG AA target)
- Text/background contrast ≥ 4.5:1; large text ≥ 3:1. The `accent` amber on white fails for body text → only for non-text or with dark text.
- Support Dynamic Type / font scaling; never clamp critical text to 1 line if it can wrap.
- All interactive elements expose `accessibilityRole` + `accessibilityLabel`; state changes use `accessibilityState`.

### 5.7 i18n
- All copy from typed catalogs, `pt` canonical ([`SDD/02`](../../SDD/02-multi-island-whitelabel.md) §7). New strings added to all 8 locales keyed off `pt.json`. No hardcoded user-facing strings (note: `onboarding/consent.tsx` and `+not-found.tsx` currently hardcode English — the rebrand fixes this).

## 6. Definition of done (per page)
- Light + dark verified on iOS and Android (simulator/emulator screenshots attached to the PR).
- No emoji, no hex literals, no magic spacing in the screen's `StyleSheet`.
- All four relevant states render correctly.
- a11y labels present; hit targets meet platform minimums.
- New strings exist in all locale files (parity check passes).
