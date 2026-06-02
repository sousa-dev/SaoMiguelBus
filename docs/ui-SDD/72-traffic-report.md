# UI-SDD 72 — Traffic Report Form (New)

**Screen & route:** [`app/(tabs)/traffic/new.tsx`](../../app/(tabs)/traffic/new.tsx) → `/(tabs)/traffic/new`. Components: `TrafficReportForm`, `CategoryPickerSheet`, `ReportLocationField`, `LocationPickerModal`.

---

## 1. Purpose
Create a detailed traffic/incident report: category, location (current, map-pick, or picker), optional schedule window, and description. Entered from the quick-report sheet "add details" or a map pin.

## 2. Current state
`TrafficReportForm` with category, `ReportLocationField` + `LocationPickerModal`, schedule, description; pre-fills `category`/`lat`/`lng` from params. Functional; needs the form/component system + a real sheet for the location picker.

## 3. Rebrand direction
- **`Field`-based form** grouped in `Card`s: Category (chips/grid with icons, reuse `CategoryPickerSheet` visual language), Location (`ReportLocationField` showing the chosen point + map thumbnail, "change" opens `LocationPickerModal` as a shared `Sheet`/fullscreen map with a center pin + confirm), Schedule (toggle + native date/time pickers when schedulable), Description (multiline `Field`).
- **Location picker** uses `MapPin`/`Crosshair`, "use my location" and "pick on map"; validates the point is within island bounds (`isWithinIslandBounds`) with an inline error.
- **Submit:** primary `Button` (loading) "Report"; disabled until category + valid location; haptic + toast on success, back to map.
- Tokens; keyboard handling; no raw inputs/`Alert` (use toast/`Banner`).

## 4. iOS specifics
- Form sheet presentation; native date/time pickers; haptic on submit; keyboard accessory + return navigation.

## 5. Android specifics
- Material fields + date/time dialogs + ripple; soft-input adjust; edge-to-edge; back confirms discard if dirty.

## 6. States
- **Submitting:** `Button` loading; fields disabled.
- **Validation:** inline errors (missing category, out-of-bounds location).
- **Offline:** `Banner`; submit disabled (mutation needs network).
- **Success:** haptic + toast, navigate back; new report appears on map.
- **Error:** `Banner`/toast (`trafficReportError`), keep form data.

## 7. Motion & haptics
- Location confirm animates pin drop; error fields scroll into view; success haptic.

## 8. Accessibility
- Fields labeled + errors associated; category options labeled; location confirmation announces coordinates/address; submit disabled reason communicated.

## 9. Acceptance checklist
- [ ] `Field`-based, grouped form; category grid with icons.
- [ ] Location via shared `Sheet`/map picker with island-bounds validation.
- [ ] Native schedule pickers; submitting/validation/offline/success/error states.
- [ ] No `Alert`/emoji; tokens only; keyboard handling; iOS + Android verified.
