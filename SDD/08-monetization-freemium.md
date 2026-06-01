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
- Ads only load when `Entitlement.tier == "free"` **and** the `ads` consent purpose is granted; otherwise no ad SDK initializes.
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

Migrate the existing Viator integration (partner `P00222801`, campaign `sao-miguel-tours`) into the Events/Tours module:
- `ViatorListing` + an in-app Tours surface using Viator partner widgets/deep links with affiliate params.
- Commission is passive (Viator-side); no billing entity on our end beyond attribution tracking.

## 6. Cross-cutting

- Entitlement state is cached client-side per session and refreshed on launch / purchase / webhook push.
- All monetization respects consent ([`07`](./07-gdpr-data-governance.md)) and tenancy ([`02`](./02-multi-island-whitelabel.md)).
- Fail-safe: on entitlement-check error, default to **free/ads** (matches legacy fail-safe in the subscription integration guide).
