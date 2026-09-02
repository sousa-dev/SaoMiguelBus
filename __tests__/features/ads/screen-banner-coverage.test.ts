import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { describe, it } from 'node:test';

/**
 * Guards the top-banner rollout (see the "Add top banner ads" plan): every
 * content-bearing screen must show a Google-AdMob-compliant top banner,
 * either by rendering `ScreenTopAdBanner`/`AdBanner` itself or by living
 * under a module `Stack` whose `screenLayout` is `ModuleStackScreenLayout`
 * (features/ads/components/ModuleStackScreenLayout.tsx) — never both, since
 * that renders the same slot twice and double-counts the AdMob impression.
 */

const APP_DIR = join(process.cwd(), 'app');

// Files that are not screens at all, or are deliberately ad-free. Every entry
// carries a reason — this list is the audit trail for "why no banner here".
const AD_EXEMPT_ROUTES = new Set<string>([
  // Bare `<Redirect>`, no UI to attach a banner to.
  'app/index.tsx',
  // Error screen — AdMob prohibits ads on screens without publisher content.
  'app/+not-found.tsx',
  // The CMP flow itself: `canInitAdMob` requires `decided`, but the
  // first-party tier does not gate on consent, so showing any ad here would
  // undermine the consent screen.
  'app/onboarding/consent.tsx',
  'app/onboarding/personalize.tsx',
  // Superuser-only tooling reachable only by the publisher — serving ads to
  // the publisher is the invalid-traffic surface Google suspends accounts
  // over, and the audience of one means zero revenue upside anyway.
  'app/admin/marketplace/index.tsx',
  'app/admin/marketplace/category/[id].tsx',
  'app/admin/marketplace/provider/[id].tsx',
  'app/admin/marketplace/review/[id].tsx',
]);

// Not routes: the Expo Router config files and the web document shell.
const NON_ROUTE_BASENAMES = new Set(['_layout.tsx', '+html.tsx']);

function collectRouteFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      files.push(...collectRouteFiles(path));
    } else if (entry.endsWith('.tsx') && !NON_ROUTE_BASENAMES.has(entry)) {
      files.push(path);
    }
  }
  return files;
}

/** Nearest ancestor `_layout.tsx` (including the file's own directory), or null. */
function findNearestLayout(filePath: string): string | null {
  let dir = dirname(filePath);
  for (;;) {
    const candidate = join(dir, '_layout.tsx');
    if (existsSync(candidate)) {
      return candidate;
    }
    if (dir === APP_DIR) {
      return null;
    }
    dir = dirname(dir);
  }
}

const HAS_BANNER_PATTERN = /ScreenTopAdBanner|<AdBanner\b/;
const HAS_MODULE_STACK_LAYOUT_PATTERN = /screenLayout=\{ModuleStackScreenLayout\}/;

describe('screen banner coverage', () => {
  const routeFiles = collectRouteFiles(APP_DIR);
  assert.ok(routeFiles.length > 0, 'expected to find route files under app/');

  const missing: string[] = [];
  const doubled: string[] = [];

  for (const file of routeFiles) {
    const relPath = relative(process.cwd(), file).split('\\').join('/');
    if (AD_EXEMPT_ROUTES.has(relPath)) {
      continue;
    }

    const content = readFileSync(file, 'utf8');
    const hasOwnBanner = HAS_BANNER_PATTERN.test(content);

    const layoutFile = findNearestLayout(file);
    const underModuleStackLayout = layoutFile
      ? HAS_MODULE_STACK_LAYOUT_PATTERN.test(readFileSync(layoutFile, 'utf8'))
      : false;

    if (!hasOwnBanner && !underModuleStackLayout) {
      missing.push(relPath);
    }
    if (hasOwnBanner && underModuleStackLayout) {
      doubled.push(relPath);
    }
  }

  it('every non-exempt screen renders a top banner, directly or via its stack layout', () => {
    assert.deepEqual(
      missing,
      [],
      `Screens with no ad banner and no ModuleStackScreenLayout stack — add ` +
        `ScreenTopAdBanner or add the screen to AD_EXEMPT_ROUTES with a reason:\n${missing.join('\n')}`,
    );
  });

  it('no screen double-renders a banner (own banner + ModuleStackScreenLayout stack)', () => {
    assert.deepEqual(
      doubled,
      [],
      `Screens that render their own banner AND sit under a ` +
        `ModuleStackScreenLayout stack — this renders the same ad slot twice ` +
        `and double-counts the impression. Remove one:\n${doubled.join('\n')}`,
    );
  });

  it('every AD_EXEMPT_ROUTES entry is still a real route file', () => {
    const routeSet = new Set(routeFiles.map((file) => relative(process.cwd(), file).split('\\').join('/')));
    const stale = [...AD_EXEMPT_ROUTES].filter((route) => !routeSet.has(route));
    assert.deepEqual(
      stale,
      [],
      `AD_EXEMPT_ROUTES lists routes that no longer exist — remove them:\n${stale.join('\n')}`,
    );
  });
});
