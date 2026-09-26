import { timingSafeEqual } from 'node:crypto';
import * as store from '../lib/db.mjs';
import { createManifest } from '../src/promotion/manifest.js';
import { contentScore } from '../src/promotion/content-score.js';

function authorized(header, secret) {
  if (!secret || typeof header !== 'string' || !header.startsWith('Bearer ')) return false;
  const a = Buffer.from(header.slice(7));
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!authorized(req.headers.authorization, process.env.PROMOTION_AUTOMATION_TOKEN)) return res.status(401).json({ error: 'Unauthorized' });
  res.setHeader('Cache-Control', 'no-store');
  try {
    await store.init();
    if (!(await store.promotionFeedAllowed())) return res.status(429).json({ error: 'Try again shortly' });
    const recent = await store.recentPromotionPublications();
    const entries = await store.recentPromotionAnalyses();
    const candidates = entries.flatMap(entry => {
      const riotId = entry.summoner?.replace(/-([^-]+)$/, '#$1');
      if (!riotId || entry.remake || entry.live) return [];
      try {
        const region = entry.matchId?.split('_')[0]?.replace(/\d+$/, '').toLowerCase();
        const manifest = createManifest(entry, { riotId, region });
        const recentSummary = recent.map(p => ({ riotId: p.summoner?.replace(/-([^-]+)$/, '#$1'), verdict: p.verdict, direction: p.direction }));
        const score = contentScore({ ...entry, ...manifest }, recentSummary);
        if (recent.some(p => p.matchId === manifest.matchId) || score < 20) return [];
        return [{ manifest, score }];
      } catch { return []; }
    }).sort((a, b) => b.score - a.score).slice(0, 10);
    return res.status(200).json({ candidates });
  } catch { return res.status(500).json({ error: 'Could not load promotion feed' }); }
}
