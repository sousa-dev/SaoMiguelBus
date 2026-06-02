# UI-SDD 70 — Traffic (Map)

**Screen & route:** [`app/(tabs)/traffic/index.tsx`](../../app/(tabs)/traffic/index.tsx) → `/(tabs)/traffic`. Components: `TrafficMap`, `TrafficMapMarker`, `QuickReportButton`, `CategoryPickerSheet`, `ProximityAlert`, `ReportCard`, `LocationPickerModal`.

---

## 1. Purpose
Live, community traffic/incident map: see nearby active reports, get a proximity alert, view scheduled events, and quickly report an incident (quick categories, map-pick, or full form). Real-time, glanceable.

## 2. Current state
Full-screen `TrafficMap` (web falls back to list) with: a scheduled pill using `🗓`, a quick-report button, `CategoryPickerSheet`, a `ProximityAlert`, a perm banner, map-pick mode banner, a draft-pin bar (with `✕`), and a `Modal` for scheduled reports. Lots of floating chrome, emoji glyphs, and a transparent `Modal` instead of a real sheet. Rich functionality, inconsistent presentation.

## 3. Rebrand direction
- **Map first, clean overlays.** Themed map (light/dark), `TrafficMapMarker` color/icon by category severity (semantic tokens), user-location dot, recenter `IconButton` (`Crosshair`).
- **Consolidate floating chrome.** Replace ad-hoc bars with shared `Banner`s and one consistent overlay system:
  - Scheduled access → a `Chip`/`Button` with `CalendarClock` (replace `🗓`).
  - Map-pick hint, draft-pin, permission-denied → `Banner`s (info/warning) with `X`/action via `IconButton` (replace `✕`).
- **Quick report → shared `Fab`** (`Plus`/`TriangleAlert`), opening `CategoryPickerSheet` as a shared `Sheet` (grabber, category grid with icons, "add details"/"pick on map").
- **Scheduled list** moves from raw `Modal` to shared `Sheet` (rounded top, grabber, header, `ReportCard` list).
- **`ProximityAlert`** as a top `Banner`/toast (danger surface, `TriangleAlert`) with dismiss + tap-to-open; haptic on appear.
- **`ReportCard`** (also web list): category `Badge` (severity color + icon), distance/time `caption`, status (`active`/`scheduled`) badge.

## 4. iOS specifics
- Large title optional (map is full-bleed); sheets are native; haptic on report submit + proximity alert; FAB above home indicator.

## 5. Android specifics
- Material FAB + ripple; sheets handle back; map attribution legible; edge-to-edge; back exits pick mode before leaving.

## 6. States
- **Loading:** spinner overlay (existing position) → tokenized; markers populate on load.
- **Empty:** no active reports → subtle `Banner`/overlay ("no reports nearby"); web list `EmptyState` (`trafficEmpty`).
- **Error:** report submit failure → toast/`Banner` (`trafficReportError`) instead of `Alert`.
- **Offline:** `Banner`; show cached/last reports; submitting disabled.
- **Permission denied:** `Banner` (`trafficLocationDenied`) with a "settings" action.

## 7. Motion & haptics
- Proximity alert slides in (haptic); markers animate; sheet springs; pick-mode entrance highlights map.

## 8. Accessibility
- Markers/cards expose category + status as text. Floating banners use `accessibilityRole="status"`/`alert`. FAB + recenter labeled. Pick-mode instructions announced.

## 9. Acceptance checklist
- [ ] Themed map + severity markers + recenter button.
- [ ] All floating bars consolidated into `Banner`s; no emoji (`🗓`/`✕` → icons).
- [ ] Quick report `Fab` + `CategoryPickerSheet` and scheduled list both use shared `Sheet`.
- [ ] Proximity alert as banner/toast with haptic; submit errors via toast not `Alert`.
- [ ] Loading/empty/error/offline/denied; tokens only; iOS + Android verified.
