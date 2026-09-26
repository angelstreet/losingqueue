import * as store from '../lib/db.mjs';

const EVENTS = new Set(['creator_opened', 'image_generated', 'video_generated', 'caption_copied', 'share_intent_opened', 'deep_link_loaded', 'new_analysis_after_share']);
const SOURCES = new Set(['x', 'youtube', 'reddit', 'discord', 'whatsapp', 'facebook', 'direct']);
const CAMPAIGNS = new Set(['player_share', 'official_daily', 'unknown']);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}; }
  catch { return res.status(400).json({ error: 'Invalid JSON' }); }
  const { event, source = 'direct', campaign = 'unknown' } = body;
  if (!EVENTS.has(event) || !SOURCES.has(source) || !CAMPAIGNS.has(campaign)) return res.status(400).json({ error: 'Invalid event' });
  try {
    await store.init();
    await store.recordPromotionEvent(event, source, campaign);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(204).end();
  } catch { return res.status(500).json({ error: 'Could not record event' }); }
}
