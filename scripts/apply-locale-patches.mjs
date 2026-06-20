#!/usr/bin/env node
/**
 * Merge locale patch files into locales/*.json using en.json key order.
 * Patch files live in locales/patches/{lang}.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const localesDir = path.join(root, 'locales');
const patchesDir = path.join(localesDir, 'patches');

function parseJsonc(text) {
  return JSON.parse(text.replace(/,\s*([\]}])/g, '$1'));
}

function stringifyLocale(obj) {
  const lines = ['{'];
  const keys = Object.keys(obj);
  keys.forEach((key, index) => {
    const comma = index < keys.length - 1 ? ',' : '';
    lines.push(`    ${JSON.stringify(key)}: ${JSON.stringify(obj[key])}${comma}`);
  });
  lines.push('}');
  lines.push('');
  return lines.join('\n');
}

const en = parseJsonc(fs.readFileSync(path.join(localesDir, 'en.json'), 'utf8'));
const enKeys = Object.keys(en);

const langs = fs
  .readdirSync(patchesDir)
  .filter((f) => f.endsWith('.json') && f !== 'supplemental.json')
  .map((f) => f.replace('.json', ''));

for (const lang of langs) {
  const localePath = path.join(localesDir, `${lang}.json`);
  const patchPath = path.join(patchesDir, `${lang}.json`);
  const existing = fs.existsSync(localePath)
    ? parseJsonc(fs.readFileSync(localePath, 'utf8'))
    : {};
  const patch = JSON.parse(fs.readFileSync(patchPath, 'utf8'));
  const merged = { ...existing, ...patch };

  const ordered = {};
  for (const key of enKeys) {
    if (key in merged) {
      ordered[key] = merged[key];
    } else if (lang === 'en') {
      ordered[key] = en[key];
    } else {
      console.warn(`[${lang}] missing key after patch: ${key} — falling back to en`);
      ordered[key] = en[key];
    }
  }

  fs.writeFileSync(localePath, stringifyLocale(ordered), 'utf8');
  console.log(`Updated locales/${lang}.json (${Object.keys(ordered).length} keys)`);
}
