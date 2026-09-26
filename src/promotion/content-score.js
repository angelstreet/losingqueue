export function contentScore(entry, recent = [], now = Date.now(), freshnessDays = 30) {
  if (!entry?.matchId || entry.remake || entry.live || !entry.deepLink) return -50;
  let score = 0;
  const verdict = entry.verdict || entry.matchmaking;
  const direction = entry.direction;
  if (verdict === 'NOT FAIR' && direction === 'against') score += 35;
  if (verdict === 'NOT FAIR' && direction === 'favor' && entry.result === 'Defeat') score += 25;
  if (verdict === 'NOT FAIR' && entry.result === 'Victory') score += 20;
  const p = entry.winProbability?.mine ?? (entry.userTeam ? entry.winProb?.[entry.userTeam] : null);
  if (p !== null && p !== undefined && (p <= 35 || p >= 65)) score += 15;
  if ((entry.facts || []).some(f => f.type === 'duo_gap' && Math.abs(f.value) >= 1) ||
      (entry.duos || []).some(d => d[3] === 'enemy')) score += 12;
  if ((entry.facts || []).some(f => f.type === 'team_gap' && Math.abs(f.value) >= 15)) score += 10;
  if (entry.players?.some(p => p.badge === 'ACE' && p.n?.replace('#', '-') === entry.summoner)) score += 8;
  const s = entry.score;
  if (s && Number.isFinite(s.mine) && Number.isFinite(s.theirs) && Math.abs(s.mine - s.theirs) >= 15) score += 5;
  if (recent.slice(0, 7).some(p => p.riotId === entry.riotId)) score -= 40;
  if (recent.slice(0, 3).some(p => p.verdict === verdict && p.direction === direction)) score -= 35;
  if (entry.when && now - new Date(entry.when).getTime() > freshnessDays * 86400000) score -= 25;
  return score;
}
