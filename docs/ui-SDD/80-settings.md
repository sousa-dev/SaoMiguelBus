# UI-SDD 80 — Settings

**Screen & route:** [`app/settings.tsx`](../../app/settings.tsx) → `/settings` (modal presentation). Opened via `SettingsHeaderButton`.

---

## 1. Purpose
Language, appearance (theme), and privacy/consent management. Account/DSAR entry points per [`SDD/10`](../../SDD/10-frontend-architecture.md) §4 / [`SDD/07`](../../SDD/07-gdpr-data-governance.md).

## 2. Current state
`ScrollView` with a title, language list (selectable rows, selected = `primary` fill), a privacy section linking to consent, and a back button. Functional; rows are hand-rolled; no theme toggle yet (SDD calls for one); back button is custom rather than the modal's native dismiss.

## 3. Rebrand direction
- **Grouped list (iOS Settings / Android preferences style).** Sections as `Card`/inset-grouped lists with section headers (`callout`, `onSurfaceMuted`):
  - **Language** — rows with the language name + a `Check` on the selected; flag/`Globe` icon optional. Replace full-fill selected row with a checkmark (more native).
  - **Appearance** — theme `SegmentedControl` (System / Light / Dark), satisfying the SDD theme-toggle requirement; wire to a theme-override store.
  - **Privacy** — "Manage consent" row (`ShieldCheck`, chevron → consent), "Export my data" + "Delete my data" (DSAR) rows.
  - **About** — version, links (terms/privacy), island name.
- **Rows** use a shared `ListRow` (leading icon, label, trailing value/chevron/`Check`), tokenized; chevrons `ChevronRight`.
- **Dismiss** via native modal (swipe-down / header `X` or "Done") rather than a custom back button.
- All strings i18n (already keyed); add appearance keys.

## 4. iOS specifics
- Inset-grouped lists; modal with grabber + "Done"; `SegmentedControl` for theme; selection `Check`.

## 5. Android specifics
- Material list/preference rows + ripple; back/`X` closes modal; edge-to-edge.

## 6. States
- **Loading:** locales come from bootstrap; show current language immediately, no spinner needed.
- **Offline:** settings are local; fully usable offline. DSAR actions needing network show `Banner` when offline.

## 7. Motion & haptics
- Selection check animates; theme switch cross-fades the app theme; haptic on theme/language change.

## 8. Accessibility
- Rows expose role + selected state; theme control labeled; destructive "Delete data" clearly marked; language names in their own script.

## 9. Acceptance checklist
- [ ] Inset-grouped sections (Language / Appearance / Privacy / About) via shared `ListRow`.
- [ ] Theme `SegmentedControl` (System/Light/Dark) wired to a theme override.
- [ ] Native modal dismiss; selection via `Check` not full-fill.
- [ ] DSAR entry points present; tokens only; iOS + Android verified.
