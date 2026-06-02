# SDD 02 — Multi-Island Scalability & White-Labeling

The single most important architectural change. Everything else hangs off it.

## 1. The tenant root: `Island`

```
Island (tenancy app — `src/tenancy/`, toggle in `src/src/settings.py`)
  key            slug, unique, immutable   e.g. "sao-miguel"
  name           display name              e.g. "São Miguel"
  archipelago    e.g. "Azores"
  is_live        bool — gate new vs legacy serving
  center_lat     float                     e.g. 37.7822
  center_lng     float                     e.g. -25.4998
  radius_km      int   geo-fence for data validity (legacy hardcoded 50)
  timezone       e.g. "Atlantic/Azores"
  default_locale e.g. "pt"                  Portuguese is the product default (see §7)
  locales        list[str]                 supported languages, e.g. ["pt","en","de","es","fr"]
  theme          JSON  (see §4)
  feature_flags  JSON  per-module enable/disable
  created_at / updated_at
```

`Island` (alias **Hub**) is the parent of every domain row. There is exactly one per deployment-as-island, but the schema supports many in one DB so a single backend instance can serve multiple islands (multi-tenant) *or* be cloned per island (single-tenant) — both work.

## 2. Tenant-scoped base model

Every domain model inherits:

```
TenantScopedModel (abstract)
  island = ForeignKey(Island, on_delete=PROTECT, db_index=True)
  objects = TenantManager()   # filters by active island from request context
```

- `TenantManager` reads the active island from a contextvar set by `tenancy.middleware.TenantMiddleware` (registered in `src/src/settings.py` MIDDLEWARE).
- A `for_island(island)` escape hatch exists for Celery tasks and cross-tenant admin.
- DB indexes are **composite, island-first** (e.g. `(island, cleaned_name)`), so per-island queries stay fast as more islands are added.

## 3. Request scoping

```
Client                         Backend
──────                         ───────
X-Island: sao-miguel    ─────▶ TenantMiddleware resolves Island
(or subdomain                  → sets active-island contextvar
 sao-miguel.azoreshub.app)     → all TenantManager queries auto-filter
                               → 400 if island unknown / not is_live
```

Resolution order: explicit `X-Island` header → subdomain → `?island=` query param (compat) → configured default. The legacy compat shim ([`04`](./04-api-design.md)) always injects `sao-miguel`.

## 4. Frontend white-labeling

A single config object per island drives all branding. Source of truth is the backend `Island.theme`, mirrored into a frontend build-time/runtime config so the app can theme before the first network call.

```ts
// app/config/island.ts  (selected by EXPO_PUBLIC_ISLAND_KEY at build/runtime)
export interface IslandConfig {
  islandKey: string;          // "sao-miguel"
  islandName: string;         // "São Miguel"
  primaryColor: string;       // PRIMARY_COLOR
  secondaryColor: string;     // SECONDARY_COLOR
  accentColor: string;
  logoLight: ImageRef;
  logoDark: ImageRef;
  appIcon: ImageRef;
  splash: ImageRef;
  defaultLocale: string;
  enabledModules: ModuleKey[]; // mirrors Island.feature_flags
  mapCenter: { lat: number; lng: number };
  storeLinks: { android?: string; ios?: string };
}
```

Rules:
- **No literal brand colors anywhere in components** — only theme tokens (`theme.primary`, etc.).
- Swapping island = swapping `EXPO_PUBLIC_ISLAND_KEY` + assets; no component edits.
- Module visibility is data-driven (`enabledModules`) so an island can launch with transit-only and add modules later.
- App-store builds are produced per island via Expo build profiles (EAS) parameterized by `ISLAND_KEY`.

## 5. Adding a new island (operational runbook, post-build)

1. Create `Island` row (key, geo, timezone, locales, theme, flags).
2. Load that island's transit/trails/etc. data (or none, to start empty).
3. Add an EAS build profile + assets for the new `ISLAND_KEY`.
4. Point a subdomain at the API. Done — zero code changes.

## 6. What this replaces in legacy

| Legacy | New |
|--------|-----|
| Hardcoded center `(37.782213, -25.499806)` + 50 km radius in `is_within_50km_radius()` | `Island.center_lat/lng/radius_km` |
| `Atlantic/Azores` literal in GMaps proxy | `Island.timezone` |
| Single set of routes/stops/ads | All tenant-scoped by `island` FK |
| Brand color `#28a745` baked into manifest/CSS | `Island.theme.primaryColor` token |
| Per-island = new repo/app | Per-island = config + data |

## 7. Language strategy (Portuguese-first, extensible)

The product primarily serves **Portuguese residents**, so **Portuguese (`pt`) is the default and source-of-truth locale** — it is the fallback whenever a key is missing in another catalog, and the default `Island.default_locale` for São Miguel.

**Officially supported locales** (translated + maintained):

| Locale | Language | Role |
|--------|----------|------|
| `pt` | Portuguese | **Default / primary / fallback** |
| `en` | English | Supported (tourist baseline) |
| `de` | German | Supported |
| `es` | Spanish | Supported |
| `fr` | French | Supported |

Legacy also shipped `it`, `uk`, `zh`. These are **retained as optional/community locales** (already-translated keys are kept) but are not part of the maintained core; they can be promoted to "supported" with no code change.

**Easy to upgrade (add a language):**
1. Add the new locale's typed catalog (one JSON/TS file, keyed identically — `pt` is the canonical key set).
2. Run the `check_locale_keys` equivalent to confirm full key parity against `pt`.
3. Add the locale code to that island's `Island.locales` list — it becomes selectable in **Settings → language**, with `pt` fallback for any gaps.

No component or routing changes are required; the supported-language set is **data-driven per island** via `Island.locales` / `Island.default_locale`. Different islands may expose different language subsets while sharing the same catalogs.
