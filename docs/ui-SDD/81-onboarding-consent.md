# UI-SDD 81 — Onboarding / Consent (CMP)

**Screen & route:** [`app/onboarding/consent.tsx`](../../app/onboarding/consent.tsx) → `/onboarding/consent` (modal; shown first launch before any tracking — [`SDD/10`](../../SDD/10-frontend-architecture.md) §4, [`SDD/07`](../../SDD/07-gdpr-data-governance.md)).

---

## 1. Purpose
First-run (and re-consent) privacy gate: explain data use, let the user Accept all / Reject non-essential / customize purposes, before GA/Umami initialize. Legal + first impression.

**Ad model:** The free app is ad-supported. The `ads` toggle opts into **personalized** AdMob only — non-personalized ads still appear on the free tier when personalization is off. Premium removes ads entirely.

## 2. Current state
`ScrollView` with title, intro, four `PurposeRow`s (Switch) — strictly necessary (locked), analytics, ads, personalization — and three buttons (Accept all / Reject non-essential / Save choices). **Copy is hardcoded English** ("Privacy & consent", etc.) — violates the i18n rule; rebrand fixes this. Otherwise functional.

## 3. Rebrand direction
- **Branded, reassuring first screen.** Island logo/`ShieldCheck` hero, title `title`, concise intro `body`. Trustworthy, not legalese-heavy; link to full policy (`ExternalLink`).
- **Purpose rows** as a grouped list with leading icons (`BarChart3` analytics, `Megaphone` ads, `Sparkles` personalization, `Lock` strictly-necessary) using shared `ListRow` + native `Switch`; strictly-necessary visibly locked with explanation.
- **Action hierarchy.** Primary `Button` "Accept all"; secondary/outline "Reject non-essential"; "Save choices" as the confirm for custom toggles. On first run → `replace` into Hub (currently routes to `/transit`; update to `/(tabs)/hub`); on re-consent → back.
- **i18n:** move ALL copy to the 8 locale catalogs keyed off `pt.json` (new keys for title/intro/purposes/buttons). No hardcoded strings.
- Tokens; comfortable reading width; safe-area.

## 4. iOS specifics
- Modal (full screen first run; sheet for re-consent); large title; switches native; haptic on accept/save.

## 5. Android specifics
- Material switches + ripple buttons; back does not bypass first-run gate (must choose); edge-to-edge.

## 6. States
- **Busy:** buttons disabled + loading while persisting + syncing `ConsentRecord`.
- **Offline:** allow local decision; sync deferred; show subtle `Banner` that choices save locally and sync later.
- **Re-consent (policy change):** same screen, pre-filled with stored purposes; entry from Settings.
- **Google ad preferences:** Settings → "Manage ad preferences" → `AdsConsent.showPrivacyOptionsForm()` (native builds only).

## 7. Motion & haptics
- Gentle hero/content fade-in; haptic on commit.

## 8. Accessibility
- Switches labeled with purpose + description; locked row explains why; buttons clearly ordered; policy link labeled. High contrast; respects font scaling (legal text must scale).

## 9. Acceptance checklist
- [ ] All copy localized (8 locales, keyed off `pt`); no hardcoded English.
- [ ] Branded hero + grouped purpose rows with icons + locked necessary row.
- [ ] Clear primary/secondary action hierarchy; first-run routes to `/(tabs)/hub`.
- [ ] Busy/offline/re-consent states; tokens only; iOS + Android verified.
