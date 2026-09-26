export const LOCALES = ['fr', 'en'];
export const TONES = ['challenge', 'data', 'funny'];

export function shareLinkFor(origin, riotId, matchId) {
  const url = new URL(origin);
  url.search = '';
  url.searchParams.set('riot-search', riotId);
  url.searchParams.set('match', matchId);
  return url.toString();
}

export function trackedLink(deepLink, source, templateId, campaign = 'player_share') {
  if (!['x', 'youtube', 'reddit', 'discord', 'whatsapp', 'facebook'].includes(source)) throw new Error('Invalid source');
  const url = new URL(deepLink);
  url.searchParams.set('utm_source', source);
  url.searchParams.set('utm_medium', 'organic');
  url.searchParams.set('utm_campaign', campaign);
  url.searchParams.set('utm_content', templateId);
  return url.toString();
}

export function createManifest(entry, { riotId, region = 'euw', locale = 'en', tone = 'challenge', origin = 'https://www.losingqueue.lol/' }) {
  if (!LOCALES.includes(locale) || !TONES.includes(tone)) throw new Error('Invalid locale or tone');
  if (!/^[a-z0-9]{2,5}$/.test(region)) throw new Error('Invalid region');
  if (!/^[A-Z0-9]+_[0-9]+$/.test(entry?.matchId || '')) throw new Error('Invalid match ID');
  if (!riotId || riotId.length > 100 || !riotId.includes('#')) throw new Error('Invalid Riot ID');
  const team = entry.userTeam === 'red' ? 'red' : 'blue';
  const enemy = team === 'blue' ? 'red' : 'blue';
  const text = value => String(value || '').replace(/[\u0000-\u001f]/g, ' ').slice(0, 180);
  const number = value => value === null || value === undefined || value === '' ? null : Number.isFinite(Number(value)) ? Number(value) : null;
  return {
    version: 1, matchId: entry.matchId, riotId: text(riotId), region,
    verdict: ['FAIR', 'NOT FAIR'].includes(entry.matchmaking) ? entry.matchmaking : 'FAIR',
    direction: entry.direction === 'favor' || entry.direction === 'against' ? entry.direction : null,
    result: entry.result === 'Victory' ? 'Victory' : 'Defeat',
    champion: text(entry.user?.champ),
    score: { mine: number(entry.score?.[team]), theirs: number(entry.score?.[enemy]) },
    winProbability: { mine: number(entry.winProb?.[team]), theirs: number(entry.winProb?.[enemy]) },
    reason: text(entry.oneLiner),
    deepLink: shareLinkFor(origin, riotId, entry.matchId), locale, tone,
  };
}
