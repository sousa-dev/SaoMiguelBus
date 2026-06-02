# UI-SDD 01 — Design System

The shared vocabulary every page doc references. Implemented as theme tokens + a small component library under `lib/theme.tsx`, `lib/tokens.ts` (new), and `components/ui/` (new). White-label discipline per [`SDD/02`](../../SDD/02-multi-island-whitelabel.md) §4.

---

## 1. Principles

- **Token-first.** Spacing, radius, type, color, elevation are named tokens. `StyleSheet` consumes tokens, never raw numbers/hex.
- **Native, not uniform.** Same design language, platform-correct execution (iOS shadows + large titles; Android elevation + ripple + Material 3 shapes).
- **Calm surfaces, decisive color.** Mostly neutral surfaces; brand green for action and state; amber accent sparingly.
- **One component per job.** A single `Button`, `Card`, `Chip`, `SegmentedControl`, `Sheet` — variants via props, not copies.

## 2. Color tokens

Extend `AppTheme` ([`lib/theme.tsx`](../../lib/theme.tsx)) from 8 tokens to a semantic set. Current → added:

```ts
interface AppTheme {
  // brand (from island config)
  primary; secondary; accent;
  // surfaces (elevation ladder)
  background;        // app canvas
  surface;           // = card today
  surfaceElevated;   // sheets, menus, popovers
  surfaceSunken;     // inset wells (search bar, inputs)
  // on-colors (text/icon over a fill)
  onPrimary;         // text on primary (was '#fff')
  onSurface;         // = text
  onSurfaceMuted;    // = muted
  // lines & overlays
  border; divider; scrim; // scrim = rgba(0,0,0,.45) dark / .35 light
  // semantic status
  success; warning; danger; info;
  successSurface; warningSurface; dangerSurface; infoSurface; // tinted bg ~12% alpha
}
```

Dark/light both required. Status colors (suggested, tune for AA):

| Token | Light | Dark | Use |
|-------|-------|------|-----|
| `success` | `#1b8a3a` | `#4ade80` | confirmations, "active" report |
| `warning` | `#b45309` | `#fbbf24` | scheduled, caution |
| `danger` | `#dc2626` | `#f87171` | destructive, high magnitude, errors |
| `info` | `#2563eb` | `#60a5fa` | neutral info, news |

Rule: never place body text on `accent` (amber) over light — use `secondary`/`onSurface` text, amber as fill/indicator only.

## 3. Typography

Single type scale (system font: SF Pro on iOS, Roboto on Android — no custom brand font needed; `SpaceMono` stays for any mono/numeric usage only). Tokens `type.{role}` → `{ fontSize, lineHeight, fontWeight }`:

| Role | Size / line | Weight | Use |
|------|-------------|--------|-----|
| `display` | 28 / 34 | 700 | screen hero (island name, hub title region) |
| `title` | 22 / 28 | 700 | section/screen titles |
| `headline` | 17 / 22 | 600 | card titles, row labels |
| `body` | 15 / 21 | 400 | default text |
| `callout` | 14 / 19 | 500 | secondary emphasis |
| `caption` | 12 / 16 | 500 | metadata, chips, attributions |

Support OS font scaling; don't disable `allowFontScaling`. Numerals in schedules/magnitudes use tabular figures where available.

## 4. Spacing, radius, sizing

4-pt base scale. `space.{n}`: `xs 4 · sm 8 · md 12 · lg 16 · xl 24 · 2xl 32`.

- Screen gutter: `space.lg` (16). Card inner padding: `space.md`–`space.lg`.
- Radius `radius.{sm 8 · md 12 · lg 14 · xl 20 · pill 999}`. Cards `md`–`lg`; chips/pills `pill`; sheets top `xl`.
- Icon sizes `icon.{sm 16 · md 20 · lg 24 · xl 32}`.
- Min hit target: 44pt iOS / 48dp Android — enforce via `hitSlop` or min dimensions.

## 5. Elevation

`elevation.{flat|raised|overlay}` resolved per platform:

```ts
raised = Platform.select({
  ios:    { shadowColor:'#000', shadowOpacity:0.10, shadowRadius:8, shadowOffset:{width:0,height:2} },
  android:{ elevation: 3 },
});
overlay = ios: opacity .18 / radius 16 / y 6 ; android: elevation 8
```

Surfaces map: `surface`=flat/raised, `surfaceElevated`=overlay. The seismic map-empty card ([`app/(tabs)/earthquakes/index.tsx`](../../app/(tabs)/earthquakes/index.tsx)) already does this by hand — replace with the token.

## 6. Core components (`components/ui/`)

Specs (props are directional, not final API):

- **`Button`** — variants `primary | secondary | outline | ghost | danger`; sizes `md | lg`; optional leading lucide icon; `loading` shows inline spinner + disables; full-width option. Replaces the per-screen `searchBtn`/`directionsBtn`/`btn` styles. iOS: opacity+scale press; Android: ripple. `onPrimary` text on filled.
- **`Card`** — `surface` bg, `radius.lg`, `raised` elevation, `space.lg` padding, optional `onPress` (adds ripple/opacity + `accessibilityRole="button"`). Base for module/list cards.
- **`Chip`** — pill, selectable; selected = `primary` fill + `onPrimary` text, else `surfaceSunken` + `onSurface`, `border`. Replaces day chips, seismic window chips, category filters.
- **`SegmentedControl`** — iOS-style segmented for binary/tertiary view toggles (map/list, grid/list). Replaces seismic map/list toggle + hub layout toggle.
- **`SearchField`** — `surfaceSunken`, leading `Search` icon, clear `X`, rounded `pill`/`md`. Replaces raw `TextInput` search rows.
- **`Field`** — labeled input/select wrapper (label `callout`, control, helper/error in `danger`). For transit time, marketplace/traffic forms.
- **`Fab`** — circular/extended FAB, `primary`, `overlay` elevation, leading icon (`Plus`). Replaces marketplace `+ Add` pill and traffic quick-report button; consistent bottom-right, above tab bar + safe area.
- **`Sheet`** — bottom sheet: scrim, rounded `radius.xl` top, grabber handle, header (title + close `X`), scrollable body, safe-area bottom padding. Replaces traffic scheduled `Modal` + category picker + felt-vote sheet for consistency.
- **`Banner`** — inline status strip (`info|warning|danger|success` surface + icon + text + optional action). Replaces offline banner, traffic perm/pick/draft bars.
- **`Badge`** — small status pill (magnitude class, "scheduled", "active", category). Uses semantic surfaces.
- **`StateView`** — unified `LoadingState` (centered spinner + optional label), `EmptyState` (icon + title + body + optional CTA), `ErrorState` (icon + title + retry button). All accept an icon and use tokens.
- **`Avatar`/`Thumb`** — rounded image with fallback initial/icon for tours, news, providers.

## 7. Iconography map (lucide)

Canonical glyphs (modules in [`lib/modules.tsx`](../../lib/modules.tsx)); per-screen icons noted in page docs:

| Context | Icon |
|---------|------|
| Settings | `Settings` |
| Search / pickers | `Search`, `MapPin`, `ArrowRightLeft` (swap origin/dest) |
| Transit | `Bus`, `Footprints`, `Clock`, `CalendarDays` |
| Favorites | `Star` / `StarOff` |
| Vote | `ThumbsUp` / `ThumbsDown` |
| Tours | `Ticket`, `Star` (rating), `ExternalLink` |
| Seismic | `Activity`, `Waves`, `TriangleAlert` |
| Trails | `Footprints`, `Mountain`, `Ruler`, `CloudSun` |
| News | `Newspaper`, `Tag` |
| Marketplace | `Store`, `Phone`, `Mail`, `Navigation`, `Plus` |
| Traffic | `TriangleAlert`, `CalendarClock`, `Crosshair`, `X` |
| Close / dismiss | `X` |

## 8. Motion

- Screen push: platform default stack animation (iOS slide, Android fade-through).
- Press: `scale 0.98` + opacity (iOS), ripple (Android), 120ms.
- List item appearance: optional subtle fade/slide (`reanimated` `FadeIn`), ≤200ms, reduced-motion aware.
- Sheet: spring in/out; backdrop fade.

## 9. Accessibility baseline
- Token color pairs chosen for AA; document any exception inline.
- `StateView`, `Banner`, `Badge` ship with sensible default roles (`alert` for error, `status` for offline).
- Icon-only controls require `accessibilityLabel` (i18n).
- Honor reduced motion and font scaling globally.

## 10. Migration order (suggested)
1. Land tokens (`lib/tokens.ts`) + extend `AppTheme`.
2. Build `components/ui/` primitives with both platforms + dark mode.
3. Adopt per module via the page docs (02 shell first, then 10 hub, then feature modules).
