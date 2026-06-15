# SDD 08 — Freemium Monetization

Three revenue mechanisms, all tenant-scoped and consent-aware: **subscriptions**, **ads (free tier)**, and **Pay-to-Promote**.

## 1. Tiers

| | Free | Premium |
|--|------|---------|
| Core features (transit, news, earthquakes, trails, marketplace, events, traffic) | ✅ | ✅ |
| Ads | ✅ shown | ❌ removed |
| Real-time GPS alerts (traffic/transit proximity) | ❌ | ✅ |
| Personalized notifications | ❌ | ✅ |
| Priority support | ❌ | ✅ |

Premium = ad-free + advanced real-time + personalization. Free is fully functional, ad-supported.

## 2. Subscription billing — unified `Entitlement`

Two billing providers because app-store rules require IAP on mobile:

| Platform | Provider |
|----------|----------|
| Web | **Stripe** (Checkout + Billing Portal) |
| iOS / Android | **RevenueCat** (wraps App Store / Play Billing IAP) |

Both reconcile into one `Entitlement` model in the `billing` app ([`03-data-model.md`](./03-data-model.md) §5):

```
stripe_payments (boilerplate) ──webhook──▶ billing.services.reconcile_stripe(...)
RevenueCat webhook ──────────────────────▶ billing.services.reconcile_revenuecat(...)
Legacy email allow-list ───────────────────▶ Entitlement(source="legacy_email", status="active")
                                                    │
              GET /api/v3/billing/entitlement  ◀──── single source of truth
```

- **Reuse boilerplate `stripe_payments`** for Stripe Checkout, webhooks, and `services.py` payment flow; `billing` adds `Entitlement`, RevenueCat, and legacy allow-list on top.
- The app asks the backend (not the store) "am I premium?" → consistent across platforms.
- Webhooks update status; a periodic Celery job in `billing/tasks.py` reconciles drift.
- **Legacy migration:** existing `Subscription(email, is_active)` rows → `Entitlement(source="legacy_email")`, preserving current premium users with no payment data to migrate (legacy never integrated Stripe).
- Legacy `/api/v1/subscription/verify/` keeps working via the compat shim (returns the same `{hasActiveSubscription, subscriptionType, expiresAt, features, message}` shape).

Legacy reference pricing (from webapp): weekly €0.99 / monthly €1.99 / yearly €19.99 — re-validated, configured as products in Stripe/RevenueCat, not hardcoded in the client.

## 3. Ads (free tier)

| Ad system | Use |
|-----------|-----|
| **AdMob** | native (iOS/Android) banner/interstitial |
| **AdSense** | web |
| **First-party `Ad`** | migrated legacy campaigns (geo/route-targeted, `seen`/`clicked`, actions: open/directions/call/sms/email/whatsapp) |

Rules:
- **Free tier is ad-supported:** first-party ads + AdMob fallback (NPA when `ads` purpose is off; personalized when on and UMP allows).
- AdMob initializes after CMP decision for non-premium users; Google UMP `canRequestAds` is the legal floor for third-party ad tags.
- The `ads` consent purpose gates **personalized** AdMob only — not whether ads appear on the free tier.
- First-party ads are served via `GET /api/v3/ads?slot=&platform=` (compat: `/api/v1/ad`), targeting by `StopGroup`/route, scoped to island.
- Premium users: ad slots are removed (not just hidden) and ad SDKs never initialize.

## 4. Pay-to-Promote

Strictly **boost-only** monetization for Marketplace and Events. **No monthly fees, no per-job commissions.** Basic listings are 100% free.

```
Promotion
  target_type   service_provider | community_event
  target_id
  status        active | scheduled | expired
  start / end
  tier          (e.g. featured, top-of-category)
```

- A provider/promoter buys a time-boxed boost (one-off payment via Stripe/RevenueCat).
- Promoted items get `is_promoted=true` + ranking boost in list endpoints and a "Promoted" label (transparency).
- Promotions expire automatically (Celery), reverting ranking.
- Boost purchases are normal payments → tracked as `AnalyticsEvent(module, event_type="promote")`.

## 5. Viator affiliate (passive income)

**Shipped (2026-06):** partner `P00222801`, campaign `sao-miguel-tours` — affiliate params injected server-side on every `bookingUrl` from `GET /api/v3/events/tours*`. Expo **Tours** tab shows native cards; booking opens the **system browser** (`Linking.openURL`) so users keep Viator sessions. Legacy webapp still uses the Viator JS widget until PWA retirement.

**Planned:** optional `ViatorListing` DB cache if caching/attribution needs exceed Partner API TTL rules; community events CRUD + pay-to-promote remain separate ([`09`](./09-modules.md) §7).

Commission is passive (Viator-side); no billing entity on our end beyond attribution tracking (`tours` analytics: `book_click`, etc.).

## 6. Cross-cutting

- Entitlement state is cached client-side per session and refreshed on launch / purchase / webhook push.
- All monetization respects consent ([`07`](./07-gdpr-data-governance.md)) and tenancy ([`02`](./02-multi-island-whitelabel.md)).
- Fail-safe: on entitlement-check error, default to **free/ads** (matches legacy fail-safe in the subscription integration guide).
