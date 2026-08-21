# Notifications — plan set

Everything needed to add notifications to the São Miguel Hub mobile app. **Scope is
`SaoMiguelBus` only** — no `SaoMiguelBus-api` code change is required or planned.

Two distinct notification classes ship together in one release. They differ in almost
every dimension, which is why they are specified separately:

| | **Service announcements** | **Journey alarms** |
|---|---|---|
| Who gets them | Everyone, free | Premium only |
| What arms them | The app, from server config | The rider, per journey |
| Fire time source | `bootstrap.transitSchedule` | The tracked itinerary's timetable |
| Gate | None | `guardPremiumAction` → paywall |
| First instance | The 1 September network cutover | — |

## Read in this order

| Doc | What it settles |
|---|---|
| [00-overview.md](./00-overview.md) | Problem, scope, requirements, key technical decisions |
| [01-service-announcements.md](./01-service-announcements.md) | The free broadcast channel and the 1 September announcement |
| [02-journey-alarms-ux.md](./02-journey-alarms-ux.md) | The bell CTA, the preference sheet, every entry point |
| [03-preferences-and-storage.md](./03-preferences-and-storage.md) | What the rider chooses and where it is stored |
| [04-scheduling-engine.md](./04-scheduling-engine.md) | The pure module that turns an itinerary into alarm instants |
| [05-permissions-and-lifecycle.md](./05-permissions-and-lifecycle.md) | Permission flow, Android channels, reconciliation, cancellation |
| [06-premium-gating.md](./06-premium-gating.md) | Paywall integration and what happens when entitlement lapses |
| [07-i18n-and-copy.md](./07-i18n-and-copy.md) | Every string, in all eight locales |
| [08-analytics.md](./08-analytics.md) | Events emitted |
| [09-testing.md](./09-testing.md) | What is tested and how, given the runner is `tsx --test` |
| [10-rollout-and-risks.md](./10-rollout-and-risks.md) | Config, store review, the 1 September reach problem, deferred work |

## Decisions taken before writing

Recorded here so a reader knows which options were considered and closed.

| Decision | Chosen | Alternatives rejected |
|---|---|---|
| Repo scope | `SaoMiguelBus` only | API changes for an `announceAt` field |
| Release strategy | One bundled release | Split, announcement-first (would have reached 1 Sept) |
| Alarm types | Leave now · Change · Alight · Complete | Per-stop alarms (see [04](./04-scheduling-engine.md) §5) |
| Preferences | Global default, overridable per journey | Global-only; per-journey-only |
| Preference storage | zustand + AsyncStorage | `expo-sqlite`; account sync via API |
| Announcement source | Derived from existing bootstrap fields | Hardcoded date; client-bundled list |
| Announcement gating | Free, ungated | Premium; free-with-upsell |
| Platform | iOS + Android | Expo Web (not used by this project) |
| Delivery | Local notifications | Remote push (see [10](./10-rollout-and-risks.md) §6) |
