# AGENTS.md

## Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

## AdMob (hybrid ads)

- First-party SMB ads from `GET /api/v1/ad` take priority; AdMob fills empty banner/interstitial slots when the user grants the `ads` consent purpose.
- **`react-native-google-mobile-ads` requires a dev client or EAS build** — it does not run in Expo Go.
- Configure optional env vars: `EXPO_PUBLIC_ADMOB_APP_ID_IOS`, `EXPO_PUBLIC_ADMOB_APP_ID_ANDROID`, `EXPO_PUBLIC_ADMOB_BANNER_IOS`, `EXPO_PUBLIC_ADMOB_BANNER_ANDROID`, `EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS`, `EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID`, `EXPO_PUBLIC_ADMOB_APP_OPEN_IOS`, `EXPO_PUBLIC_ADMOB_APP_OPEN_ANDROID`.
- App Open ads show on cold start (post-consent) and foreground return for non-premium users with `ads` consent; dev builds use Google test App Open units.
- Defaults reuse the legacy Android AdMob account IDs from the old native app.
- QA: `eas build --profile development` or `npx expo run:ios` / `run:android` after prebuild.

## Premium / monetization copy

- Never hardcode subscription prices in CTA labels or upsell banner/modal copy — RevenueCat's hosted paywall owns pricing (store-managed, can change remotely).
- Tour affiliate prices from the Viator API on book buttons/cards are exempt.
