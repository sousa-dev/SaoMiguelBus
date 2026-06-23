# AGENTS.md

## Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

## AdMob (hybrid ads)

- **Free tier is ad-supported:** first-party SMB ads from `GET /api/v1/ad` take priority; AdMob fills empty banner/interstitial/app-open slots for all non-premium users after CMP decision.
- The `ads` consent purpose opts into **personalized** AdMob only. Rejecting it still shows non-personalized AdMob when Google UMP grants `canRequestAds`.
- Google UMP (`AdsConsent`) runs in `admob-runtime.native.ts`; do not set `requestNonPersonalizedAdsOnly` while UMP is active — GMA reads the TCF string.
- Settings exposes `showAdPrivacyOptionsForm()` for Google ad preference changes.
- **`react-native-google-mobile-ads` requires a dev client or EAS build** — it does not run in Expo Go.
- Configure optional env vars: `EXPO_PUBLIC_ADMOB_APP_ID_IOS`, `EXPO_PUBLIC_ADMOB_APP_ID_ANDROID`, `EXPO_PUBLIC_ADMOB_BANNER_IOS`, `EXPO_PUBLIC_ADMOB_BANNER_ANDROID`, `EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS`, `EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID`, `EXPO_PUBLIC_ADMOB_APP_OPEN_IOS`, `EXPO_PUBLIC_ADMOB_APP_OPEN_ANDROID`, `EXPO_PUBLIC_ADMOB_REWARDED_IOS`, `EXPO_PUBLIC_ADMOB_REWARDED_ANDROID`.
- App Open ads show on cold start (post-CMP) and foreground return for non-premium users; dev builds use Google test App Open units.
- **Rewarded ad-free window:** sidebar **Remove Ads** shows a **Free** badge (and transit header **Remove Ads For Free**) only when a rewarded ad is loaded; tap opens a modal to watch a video for **15 minutes** of device-local ad-free navigation (`azores_hub_ad_free_until` in AsyncStorage). Without a loaded reward, sidebar/header fall back to the paywall CTA. Premium (`usePremium()`, including the 7-day pass) suppresses all ads and reward upsell UI. Requires dev client/EAS — uses Google test rewarded units in `__DEV__`.
- `app.config.js` sets `delayAppMeasurementInit: true` on the AdMob plugin.
- Defaults reuse the legacy Android AdMob account IDs from the old native app.
- QA: `eas build --profile development` or `npx expo run:ios` / `run:android` after prebuild. Test EEA with `AdsConsentDebugGeography.EEA`.

## Premium / monetization copy

- Never hardcode subscription prices in CTA labels or upsell banner/modal copy — RevenueCat's hosted paywall owns pricing (store-managed, can change remotely).
- Tour affiliate prices from the Viator API on book buttons/cards are exempt.

## RevenueCat (IAP)

- Premium CTAs open the hosted paywall **without requiring sign-in**. Purchases work against RevenueCat's anonymous App User ID (backed by the Apple/Google store account); device premium is derived from `CustomerInfo` and persisted locally.
- On sign-in/register, the SDK calls `Purchases.logIn(smb_user_<id>)` to transfer anonymous purchases to the backend account. **Dashboard requirement:** enable **transfer purchases to the new App User ID** (not "keep with original").
- App User ID format: `smb_user_<django_user_id>` — must match backend `billing.services.REVENUECAT_APP_USER_ID_PREFIX`.
- Env: `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`, `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`, optional `EXPO_PUBLIC_REVENUECAT_TEST_API_KEY`, `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID` (default `Sao Miguel Hub Premium`).
- Requires a dev client or EAS build — IAP does not run in Expo Go.

## PDL Mini Bus maps

- Stop coordinates ship in the offline bundle (`network.lines[].stops[]`: `latitude`, `longitude`, `external_id`) and on journey leg `board`/`alight` refs from `GET /api/v3/minibus/route`.
- **Live tracking** (`/minibus/live`, `GET /api/v3/minibus/vehicles`) is served only by the API — the app never calls Eleven Systems directly. If staging returns `tracking_unavailable`, fix upstream access on the API host (often Cloudflare blocking Hetzner; see `SaoMiguelBus-api/src/minibus/docs/tailscale-tracking-proxy.md`).
- In-app maps only (v1): `OsmMapView` on line detail (`MinibusLineMap`) and journey directions (`MinibusJourneyMap` + `MinibusDirectionsSteps`). Polylines are straight stop-to-stop segments; no external Apple/Google Maps handoff.
- Helpers: `features/minibus/stopCoordinates.ts` (`linePolyline`, `journeyPolylines`, `fitRegionForCoordinates`).
