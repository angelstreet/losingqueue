export function selectCandidate(candidates) {
  const eligible = (candidates || []).filter(item => item?.manifest?.matchId && Number.isFinite(item.score) && item.score >= 20);
  eligible.sort((a, b) => b.score - a.score || a.manifest.matchId.localeCompare(b.manifest.matchId));
  return eligible[0]?.manifest || null;
}
