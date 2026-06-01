# São Miguel Bus → Azores Hub (revamp)

This repository is being reorganized for the **Azores Hub** platform revamp: one Expo client (Android, iOS, Web) against a modernized multi-tenant backend.

## Layout

| Path | Purpose |
|------|---------|
| [`legacy/`](./legacy/) | Frozen pre-revamp mobile app, docs, and assets (Kotlin Android, Flutter stub, etc.) |
| [`SDD/`](./SDD/) | Software design documents for the new platform |
| [`MIGRATION_PLAN.md`](./MIGRATION_PLAN.md) | Executive migration index and phased plan |

## Status

Planning and architecture are in progress on the `revamp` branch. Application code for the new stack will land at the repo root (`app/`, etc.) as phases are approved — not under `legacy/`.

## Related repos

- **API:** [SaoMiguelBus-api](https://github.com/sousa-dev/SaoMiguelBus-api) — `legacy/` = Django 3.0; new backend from [`boilerplate/`](https://github.com/sousa-dev/SaoMiguelBus-api/tree/revamp/boilerplate) (djast) promoted to root; `python manage.py import_legacy` for data migration
- **Web PWA:** [SaoMiguelBus-webapp](https://github.com/sousa-dev/SaoMiguelBus-webapp) (unchanged; deprecated after API revamp)
