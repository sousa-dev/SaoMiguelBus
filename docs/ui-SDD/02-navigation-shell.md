# UI-SDD 02 — Navigation Shell

The chrome shared by all screens: root layout, bottom tab bar, stack headers, and header buttons. Files: [`app/_layout.tsx`](../../app/_layout.tsx), [`app/(tabs)/_layout.tsx`](../../app/(tabs)/_layout.tsx), per-module `_layout.tsx`, [`lib/navigation.ts`](../../lib/navigation.ts), [`components/SettingsHeaderButton.tsx`](../../components/SettingsHeaderButton.tsx), [`app/(tabs)/hub/_layout.tsx`](../../app/(tabs)/hub/_layout.tsx).

---

## 1. Purpose
Consistent, native navigation: a branded bottom tab bar (Hub + up to 4 user-pinned modules), stack headers per module, and standardized header actions. This is the frame the rebrand hangs on.

## 2. Current state
- Root `Stack` with `(tabs)`, `settings` (modal), `onboarding/consent` (modal); headers hidden at root.
- Bottom `Tabs` set active/inactive tint to `theme.primary`/`theme.muted`, header green. Hub is the fixed first tab; other tabs use `href` = route when enabled+pinned, else `null`; `tabBarIcon` from `lib/modules.tsx`.
- Stack headers via `useAppStackScreenOptions()` — green bg, white tint, no shadow.
- `SettingsHeaderButton` = bordered box with lucide `Settings`. Hub edit header button = text "Edit/Done" toggling `useHubStore.editMode`.

## 3. Rebrand direction

### 3.1 Tab bar
- Token-driven: `tabBarActiveTintColor = primary`, inactive = `onSurfaceMuted`, bar bg = `surface`, top hairline = `divider`.
- Icons from registry at `icon.lg` (24); active state slightly heavier stroke (2.25) or filled variant where lucide offers one.
- Labels `caption`, single line; keep labels (don't hide) for clarity across locales.
- iOS: translucent blur background (`expo-blur`, to add) over content; respect home-indicator inset. Android: solid `surface`, elevation hairline, edge-to-edge with bottom inset handled.
- Badge support (token `danger`/`accent`) for future unread/alert counts (e.g., active traffic nearby) — reserve the slot now.

### 3.2 Stack headers
- Replace the flat green bar with a **token header**: `surface` background, `onSurface` title (`headline`/`title`), `primary` only for actionable header text/icons. This reads more modern/native than a saturated green bar and matches iOS/Android norms; the green stays as the action/brand accent.
  - If brand prefers the colored header, keep `primary` bg but standardize height, `onPrimary` title, and `onPrimary` icons — pick one and apply globally via `useAppStackScreenOptions()`.
- iOS: enable **large titles** (`headerLargeTitle`) on top-level module screens (Hub, lists); collapse to inline on scroll. Detail screens use inline title + back chevron + screen title.
- Android: Material top app bar, title left-aligned, 1 hairline/elevation on scroll, up arrow on detail screens.
- Standard `headerRight` slot hosts icon actions (`Settings`, edit, filter) as `IconButton`s (44/48 hit target, `accessibilityLabel`).

### 3.3 Header buttons
- `SettingsHeaderButton` → shared `IconButton` (ghost) with `Settings` icon; color = header on-color token. Drop the manual border or make it a subtle `surfaceSunken` circle consistently.
- Hub edit toggle → `IconButton` with `Pencil` (edit) / `Check` (done) plus accessible label; or a text button styled from `Button` ghost variant. Group multiple header actions with consistent spacing.

## 4. iOS specifics
- Large titles on list/landing screens; modal screens (`settings`, `onboarding/consent`) use page-sheet presentation with grabber.
- Back swipe enabled (already `gestureEnabled`/`fullScreenGestureEnabled`). Header blur + safe-area top.

## 5. Android specifics
- Predictive back / hardware back returns through stack and closes sheets/modals first.
- Material 3 app bar + ripple on header actions; edge-to-edge with proper status-bar icon contrast for light/dark.
- Tab bar elevation + ripple on tab press.

## 6. Motion
- Tab switch: cross-fade content; no horizontal slide between tabs.
- Header large→inline title collapse animates with scroll (iOS native).

## 7. Accessibility
- Tabs expose `accessibilityRole="tab"` + selected state; labels localized.
- Header icon buttons labeled; min hit target enforced.
- Status bar style follows theme (light icons on dark/green, dark icons on light) via `expo-status-bar`.

## 7b. Global floating action button (FAB)

A single **speed-dial FAB** is mounted once at the root in [`app/_layout.tsx`](../../app/_layout.tsx) via [`components/GlobalFab.tsx`](../../components/GlobalFab.tsx) and appears on every screen (hidden only on form/modal routes: `feedback`, `settings`, `onboarding`, and the marketplace/traffic create forms — see `isFabHidden` in [`lib/fab-registry.ts`](../../lib/fab-registry.ts)).

- **Smart menu.** Actions are route-aware: static per-route actions come from `getStaticActions(pathname)` ([`lib/fab-registry.ts`](../../lib/fab-registry.ts)); stateful screens inject their own via `useFabActions()` ([`lib/fab-store.ts`](../../lib/fab-store.ts)) while focused (e.g. traffic "Report traffic" opens the category sheet; marketplace "Add listing"). A permanent **"Send feedback"** action is always appended last.
- **Feedback.** "Send feedback" routes to [`app/feedback.tsx`](../../app/feedback.tsx) (modal) with the originating route + label as params. The form composes a mail draft to `info@sousadev.com` via `expo-mail-composer` (with a `mailto:` fallback) — no backend.
- **Positioning.** Absolute, bottom-right, offset above the tab bar by `insets.bottom + tabBarHeight + space.lg`. Reuses the `Fab` look (`primary` bg, `elevation(3)`, `radius.full`).

## 8. Acceptance checklist
- [ ] One source of truth for header style in `useAppStackScreenOptions()`; all modules consume it.
- [ ] Tab bar uses tokens; works light/dark, iOS blur + Android elevation, safe-area correct.
- [ ] Header actions are labeled `IconButton`s meeting hit-target minimums.
- [ ] Large titles on iOS top-level screens; Material app bar on Android.
- [ ] Modals present as sheets with grabber; Android back closes them first.
