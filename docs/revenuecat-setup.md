# RevenueCat in-app purchases — setup & operations

Client integration ships in code (`lib/revenuecat.ts`, `features/premium/*`). The
items below are **manual prerequisites** the SDK cannot do for us — without them the
purchase entry points stay disabled (the app no-ops safely when unconfigured).

## 1. Env keys (`.env`, see `.env.example`)

| Var | Where | Notes |
|-----|-------|-------|
| `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` | RC → Project → API keys (Apple) | `appl_…` public key |
| `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` | RC → Project → API keys (Google) | `goog_…` public key |
| `EXPO_PUBLIC_REVENUECAT_TEST_API_KEY` | RC → Test Store | `test_…`, **dev only** (used only in `__DEV__`) |
| `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID` | RC → Entitlements | defaults to `Sao Miguel Hub Premium` — must match exactly |
| `EXPO_PUBLIC_REVENUECAT_CUSTOMER_CENTER` | — | `true` only after Customer Center is configured (paid plan) |

## 2. Native build (RN 0.85 / New Architecture)

`react-native-purchases` is a native module. After install you must rebuild:

```bash
npm run ios:prebuild     # or: npx expo prebuild
cd ios && pod install && cd ..
npm run ios              # expo run:ios — Expo Go will NOT work
```

De-risk check (KTD1): confirm `NativeModules.RNPurchases` is defined at runtime and
`Purchases.getOfferings()` resolves on a dev build with a real key. If autolinking
fails under bridgeless mode, add the module to `react-native.config.js`.

## 3. Dashboard config

- Offering `current` with packages mapped to **weekly / monthly / annual** products.
- Entitlement `Sao Miguel Hub Premium` attached to those products.
- A Paywall designed and published for the `current` offering (RevenueCatUI renders it).
- App Store Connect / Play Console products created and linked to RC.
- Sandbox / Test Store testers for purchase verification.

## 4. App User ID ↔ backend (cross-repo)

The SDK logs in with `smb_user_<backend_user_id>` (`revenueCatAppUserId`). The API
webhook (`reconcile_revenuecat`, SaoMiguelBus-api) **must** map this id back to the
`billing.Entitlement`. If the backend keys on a different/opaque id, change
`revenueCatAppUserId` to match — it is the single coordination point.

## 5. Entitlement reconciliation

After purchase the client unlocks premium optimistically for `OPTIMISTIC_GRACE_MS`
(5 min) then defers to `GET /api/v3/billing/entitlement`. The backend always wins
after the grace window — including refund/revocation downgrades. The RC webhook must
be live for entitlement to persist beyond the grace window.
