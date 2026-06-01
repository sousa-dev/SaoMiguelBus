# Legacy São Miguel Bus (mobile)

This directory holds the **pre-revamp** codebase and documentation — the last shipped version of the app before the Azores Hub migration.

| Path | Contents |
|------|----------|
| `src/android-project/` | Native Android app (Kotlin) |
| `src/saomiguelbus/` | Partial Flutter port |
| `doc/` | Requirements, prototypes, schedule PDFs |
| `web/` | Embedded web data assets |
| `old/` | App Inventor project, keystores |
| `README.md` | Original repo readme (Play Store v4.0) |

**Active revamp work** lives at the repository root: [`MIGRATION_PLAN.md`](../MIGRATION_PLAN.md) and [`SDD/`](../SDD/).

Do not add new features here unless they are maintenance for existing production clients during the strangler-fig cutover.
