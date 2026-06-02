# São Miguel Bus → Azores Hub (revamp)

Expo client (Android, iOS, Web) for the **Azores Hub** platform — Phase 2+ on branch `revamp`.

## Layout

| Path | Purpose |
|------|---------|
| [`app/`](./app/) | Expo Router screens (tabs, onboarding, consent) |
| [`config/`](./config/) | Island branding (`EXPO_PUBLIC_ISLAND_KEY`) |
| [`features/`](./features/) | Module UI (transit first) |
| [`lib/`](./lib/) | API client, analytics, consent, theme, i18n |
| [`locales/`](./locales/) | 8 languages ported from legacy webapp |
| [`legacy/`](./legacy/) | Frozen pre-revamp mobile app |
| [`SDD/`](./SDD/) | Software design documents |

## Run (Expo Go)

```bash
cp .env.example .env   # EXPO_PUBLIC_API_URL, EXPO_PUBLIC_ISLAND_KEY
npm install
npx expo start
```

Point `EXPO_PUBLIC_API_URL` at a running [SaoMiguelBus-api](https://github.com/sousa-dev/SaoMiguelBus-api) `revamp` backend (`/api/v3/*`). All requests send `X-Island: sao-miguel`.

## Related repos

- **API:** [SaoMiguelBus-api](https://github.com/sousa-dev/SaoMiguelBus-api) — Django 5, `/api/v3` + compat shims
- **Web PWA:** [SaoMiguelBus-webapp](https://github.com/sousa-dev/SaoMiguelBus-webapp) (reference only)
