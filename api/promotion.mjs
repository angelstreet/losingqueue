import * as store from '../lib/db.mjs';
import { createManifest } from '../src/promotion/manifest.js';
import { captionsFor } from '../src/promotion/captions.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const { riotId, matchId, region = 'euw', locale = 'en', tone = 'challenge' } = req.query;
  if (typeof riotId !== 'string' || !/^[^#\u0000-\u001f]{1,80}#[^#\u0000-\u001f]{1,16}$/.test(riotId) ||
      typeof matchId !== 'string' || !/^[A-Z0-9]+_[0-9]+$/.test(matchId) ||
      typeof region !== 'string' || !/^[a-z0-9]{2,5}$/.test(region)) {
    return res.status(400).json({ error: 'Invalid match parameters' });
  }
  try {
    await store.init();
    const entry = await store.getAnalysis(matchId, riotId.replace('#', '-'));
    if (!entry || entry.remake || entry.live) return res.status(404).json({ error: 'Cached final analysis not found' });
    const manifest = createManifest(entry, { riotId, region, locale, tone });
    const captions = captionsFor(manifest);
    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600');
    return res.status(200).json({ manifest, captions });
  } catch (error) {
    if (/Invalid/.test(error.message)) return res.status(400).json({ error: error.message });
    return res.status(500).json({ error: 'Could not load promotion content' });
  }
}
