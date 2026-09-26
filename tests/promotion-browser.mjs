// Optional smoke check against a local Vite preview, with API responses mocked.
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true, ...(process.env.PROMOTION_CHROME_PATH ? { executablePath: process.env.PROMOTION_CHROME_PATH } : {}) });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const entry = {
    matchId: 'EUW1_123', result: 'Defeat', userTeam: 'blue', user: { champ: 'Warwick', kda: '2/3/4' },
    score: { blue: 11, red: 21 }, winProb: { blue: 38, red: 62 },
    matchmaking: 'NOT FAIR', direction: 'against', oneLiner: 'A lopsided tier spread worked against you.',
    when: '2026-09-25T12:00:00Z', duration: 1800, players: [], duos: [],
  };
  const manifest = {
    version: 1, matchId: entry.matchId, riotId: 'Player#EUW', region: 'euw',
    verdict: entry.matchmaking, direction: entry.direction, result: entry.result, champion: entry.user.champ,
    score: { mine: 11, theirs: 21 }, winProbability: { mine: 38, theirs: 62 }, reason: entry.oneLiner,
    deepLink: 'https://www.losingqueue.lol/?riot-search=Player%23EUW&match=EUW1_123', locale: 'en', tone: 'challenge',
  };
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    const body = path === '/api/analyze' ? { cached: true, entry }
      : path === '/api/history' ? { games: [{ ...entry, cached: true, champ: 'Warwick' }], total: 1 }
      : path === '/api/promotion' ? { manifest, captions: { x: 'Test caption', youtubeTitle: 'Test title', youtubeDescription: 'Test description' } }
      : {};
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.goto('http://127.0.0.1:4173/?riot-search=Player%23EUW&match=EUW1_123');
  await page.getByRole('button', { name: 'Create content' }).first().click();
  await page.waitForFunction(() => document.querySelector('#creatorCaption')?.value === 'Test caption');
  if (errors.length) throw new Error(errors.join('\n'));
  console.log('Creator sheet smoke check passed');
} finally { await browser.close(); }
