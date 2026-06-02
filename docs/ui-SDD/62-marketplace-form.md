# UI-SDD 62 — Marketplace Listing Form (Create / Edit)

**Screens & routes:** [`app/(tabs)/marketplace/new.tsx`](../../app/(tabs)/marketplace/new.tsx) → `/(tabs)/marketplace/new`; [`app/(tabs)/marketplace/edit/[id].tsx`](../../app/(tabs)/marketplace/edit/[id].tsx) → `/(tabs)/marketplace/edit/[id]`. Component: `ProviderForm`.

---

## 1. Purpose
Create or edit a provider listing: name, category, contacts, location, description. Same `ProviderForm` for both; edit pre-fills.

## 2. Current state
`ProviderForm` with inputs; create vs edit. Likely raw `TextInput`s + a submit button. Rebrand standardizes to the form component set.

## 3. Rebrand direction
- **`Field`-based form.** Each input uses the shared `Field` (label `callout`, control, helper/error `danger`). Category via a picker/`Chip` select; location via map pin picker (reuse the traffic `LocationPickerModal` pattern, [`72-traffic-report.md`](./72-traffic-report.md)) with `MapPin`.
- **Grouped sections** in `Card`s: Basics (name/category), Contacts (phone/email/website with leading icons + validation), Location (map + address), Description (multiline).
- **Validation & submit.** Inline errors; primary `Button` "Save"/"Publish" (loading state), secondary cancel. Disable submit until valid. Edit shows a `Delete` (danger) option.
- **Keyboard handling** (`KeyboardAvoidingView`, scroll to focused field).
- Tokens; no raw inputs/buttons.

## 4. iOS specifics
- Presented as form sheet (push or modal); inline pickers; return-key navigation between fields; haptic on save; native keyboard accessory.

## 5. Android specifics
- Material text fields (filled/outlined) + ripple buttons; soft-input adjust; edge-to-edge; back confirms discard if dirty.

## 6. States
- **Submitting:** `Button` loading; fields disabled.
- **Validation error:** inline `Field` errors + summary `Banner` if needed.
- **Load (edit):** skeleton while fetching the listing to edit.
- **Offline:** `Banner`; submit disabled offline (mutation needs network).
- **Success:** toast/haptic + navigate back to detail.

## 7. Motion & haptics
- Error fields shake/scroll-into-view; success haptic.

## 8. Accessibility
- Every `Field` labeled + error associated; required fields announced; submit disabled reason communicated; map picker has accessible coordinate confirmation.

## 9. Acceptance checklist
- [ ] All inputs use shared `Field`; grouped in `Card` sections.
- [ ] Map pin picker for location; inline validation; loading/submitting/offline states.
- [ ] Edit pre-fills + delete option; discard-confirm on dirty back (Android).
- [ ] Tokens only; keyboard handling; iOS + Android verified.
