import test from 'node:test';
import assert from 'node:assert/strict';
import { createManifest, trackedLink } from '../src/promotion/manifest.js';
import { captionsFor } from '../src/promotion/captions.js';
import { contentScore } from '../src/promotion/content-score.js';
import { validateContent } from '../scripts/promotion/validate-content.mjs';
import { selectCandidate } from '../scripts/promotion/select-candidate.mjs';

const fixture = {
  matchId: 'EUW1_123', matchmaking: 'NOT FAIR', direction: 'against',
  result: 'Defeat', userTeam: 'blue', user: { champ: 'Warwick' },
  score: { blue: 11, red: 21 }, winProb: { blue: 38, red: 62 },
  oneLiner: 'The team gap worked against you.',
};

test('normalizes only supported analysis fields and preserves deep links', () => {
  const m = createManifest(fixture, { riotId: 'Player#EUW', locale: 'fr' });
  assert.equal(m.score.mine, 11);
  assert.equal(m.winProbability.mine, 38);
  assert.equal(m.reason, fixture.oneLiner);
  assert.equal(createManifest({ ...fixture, winProb: null }, { riotId: 'Player#EUW' }).winProbability.mine, null);
  const url = new URL(trackedLink(m.deepLink, 'x', 'fr_challenge_01'));
  assert.equal(url.searchParams.get('riot-search'), 'Player#EUW');
  assert.equal(url.searchParams.get('match'), fixture.matchId);
  assert.equal(url.searchParams.get('utm_source'), 'x');
});

test('captions are bounded and do not invent match facts', () => {
  for (const locale of ['fr', 'en']) for (const tone of ['challenge', 'data', 'funny']) {
    const c = captionsFor(createManifest(fixture, { riotId: 'Player#EUW', locale, tone }));
    assert.ok(c.x.length < 280);
    assert.match(c.youtubeDescription, /heuristic|heuristique/i);
    assert.doesNotMatch(c.x, /teammate|coéquipier|forced|forcé/i);
  }
});

test('rejects unsupported input', () => {
  assert.throws(() => createManifest(fixture, { riotId: 'Player#EUW', locale: 'de' }));
  assert.throws(() => createManifest({ ...fixture, matchId: '<script>' }, { riotId: 'Player#EUW' }));
});

test('candidate scoring rewards strong verdicts and rejects incomplete content', () => {
  const m = createManifest(fixture, { riotId: 'Player#EUW' });
  assert.equal(contentScore({ ...fixture, ...m }), 35);
  assert.equal(contentScore({ ...fixture, ...m, remake: true }), -50);
  assert.equal(contentScore({ ...fixture, ...m, direction: 'favor', result: 'Defeat' }), 25);
  assert.equal(contentScore({ ...fixture, ...m, result: 'Victory' }), 55);
});

test('validation hashes deterministically and rejects missing disclosure', () => {
  const manifest = createManifest(fixture, { riotId: 'Player#EUW' });
  const captions = captionsFor(manifest);
  const first = validateContent(manifest, captions);
  assert.equal(first.ok, true);
  assert.equal(first.contentHash, validateContent(manifest, captions).contentHash);
  assert.equal(validateContent(manifest, { ...captions, youtubeDescription: 'No disclosure' }).ok, false);
});

test('candidate selection skips low scores and is stable on ties', () => {
  assert.equal(selectCandidate([{ manifest: { matchId: 'EUW1_2' }, score: 19 }]), null);
  assert.equal(selectCandidate([{ manifest: { matchId: 'EUW1_2' }, score: 30 }, { manifest: { matchId: 'EUW1_1' }, score: 30 }]).matchId, 'EUW1_1');
});
