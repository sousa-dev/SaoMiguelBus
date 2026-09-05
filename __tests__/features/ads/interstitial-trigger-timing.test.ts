import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

/**
 * The search interstitial rolls when a search STARTS, so its own planning
 * (session policy, then a first-party fetch) overlaps the search fetch and the
 * results render underneath the ad. Waiting for results to land stacks the two
 * waits and the rider sits through both. Source-text check, like the other ad
 * guards — there is no renderer in this test setup.
 */

const screen = readFileSync(join(process.cwd(), 'app/(tabs)/transit/index.tsx'), 'utf8');

describe('search interstitial timing', () => {
  it('rolls the interstitial from every path that starts a search', () => {
    const rolls = screen.match(/rollSearchInterstitial\(\);/g) ?? [];
    assert.ok(
      rolls.length >= 3,
      'expected the Search button, saved-shortcut tap and deep-link auto-search ' +
        `to each roll the interstitial when they start a search; found ${rolls.length}`,
    );
  });

  it('does not wait for the fetch to finish before rolling a clicked search', () => {
    assert.match(
      screen,
      /rollSearchInterstitial\(\);\s*search\.refetch\(\);/,
      'the Search button must roll before kicking off the fetch, so the ad and ' +
        'the search overlap instead of queueing',
    );
    assert.match(
      screen,
      /<InterstitialOrchestrator trigger=\{interstitialTrigger\} ready=\{searchEnabled\} \/>/,
      'ready must gate on the search being enabled only, not on !isFetching',
    );
  });

  it('still rolls for results that arrive without a click, exactly once per search', () => {
    // Cache hits and dataset switches show results too, so they enter the same
    // pool — but a clicked search must not roll a second time when its results
    // land, or two 15% rolls could show two ads back to back.
    assert.match(
      screen,
      /interstitialRolledAtStartRef\.current = true;/,
      'the click path must mark that it already rolled for the in-flight search',
    );
    assert.match(
      screen,
      /if \(interstitialRolledAtStartRef\.current\) \{\s*interstitialRolledAtStartRef\.current = false;\s*return;\s*\}\s*setInterstitialTrigger/,
      'the results-arrival effect must consume the click mark instead of rolling ' +
        'again, and roll only when no click preceded these results',
    );
  });

  it('applies the same start-time roll on the MiniBus planner (embedded on the hub screen)', () => {
    const minibus = readFileSync(join(process.cwd(), 'app/(tabs)/minibus/index.tsx'), 'utf8');
    assert.match(
      minibus,
      /rollSearchInterstitial\(\);\s*setSubmitted\(/,
      'MiniBus must roll before submitting the search, so the ad overlaps it',
    );
    assert.match(
      minibus,
      /<InterstitialOrchestrator trigger=\{interstitialTrigger\} ready=\{hasSearched\} \/>/,
      'MiniBus ready must not wait on !isLoading',
    );
    assert.match(
      minibus,
      /if \(interstitialRolledAtStartRef\.current\) \{\s*interstitialRolledAtStartRef\.current = false;\s*return;\s*\}\s*setInterstitialTrigger/,
      'MiniBus must carry the same double-roll guard',
    );
  });
});
