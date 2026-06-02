# UI-SDD 41 — Trail Detail

**Screen & route:** [`app/(tabs)/trails/[id].tsx`](../../app/(tabs)/trails/[id].tsx) → `/(tabs)/trails/[id]`. Components: `TrailMap`, `TrailWeather`, `useTrailWeather`.

---

## 1. Purpose
Full trail detail: route map, key stats, description, and current/forecast weather for planning a hike.

## 2. Current state
Detail for a trail with map + weather hook. Plain layout. Rebrand makes it a polished trip-planning page.

## 3. Rebrand direction
- **Hero:** cover image or `TrailMap` route preview up top; name `title`, difficulty `Badge`, region `caption`.
- **Stats row `Card`:** length (`Ruler`), duration (`Clock`), elevation gain (`Mountain`), type/loop — icon + value, tabular.
- **`TrailWeather` block:** today's conditions (`CloudSun` + temp) and a short forecast strip; tokenized cards, semantic warning if conditions are poor.
- **Route map `Card`:** themed `TrailMap` with start/end markers; tap → fullscreen map; offline tiles supported. "Open in Maps"/directions `Button` (`Navigation`).
- **Description** in `body`; highlights/points-of-interest as an icon list.
- Tokens; rounded media; consistent gutters.

## 4. iOS specifics
- Collapsing image header; inline title on scroll; haptic on any save/favorite; map respects insets.

## 5. Android specifics
- Collapsing toolbar; ripple; edge-to-edge; native maps intent for directions.

## 6. States
- **Loading:** skeleton hero + stats + weather.
- **Error:** `ErrorState` + retry.
- **Offline:** show cached trail + offline tiles; weather block shows `Banner` "needs connection" if unavailable.

## 7. Motion & haptics
- Header collapse on scroll; weather strip fades in.

## 8. Accessibility
- Stats labeled with units; weather announced ("18°, partly cloudy"); map has text alternative; difficulty by text + color.

## 9. Acceptance checklist
- [ ] Hero (image/route) + difficulty badge.
- [ ] Stats card (length/duration/elevation) with icons + tabular values.
- [ ] Weather block + themed route map card + directions button.
- [ ] Loading/error/offline (incl. offline tiles); tokens only; iOS + Android verified.
