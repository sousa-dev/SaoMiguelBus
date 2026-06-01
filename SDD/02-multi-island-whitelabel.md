# SDD 02 — Multi-Island Scalability & White-Labeling

The single most important architectural change. Everything else hangs off it.

## 1. The tenant root: `Island`

```
Island (apps/tenancy)
  key            slug, unique, immutable   e.g. "sao-miguel"
  name           display name              e.g. "São Miguel"
  archipelago    e.g. "Azores"
  is_live        bool — gate new vs legacy serving
  center_lat     float                     e.g. 37.7822
  center_lng     float                     e.g. -25.4998
  radius_km      int   geo-fence for data validity (legacy hardcoded 50)
  timezone       e.g. "Atlantic/Azores"
  default_locale e.g. "pt"
  locales        list[str]                 supported languages
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

- `TenantManager` reads the active island from a thread-local / contextvar set by middleware.
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
