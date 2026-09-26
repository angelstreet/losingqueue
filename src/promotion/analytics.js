const EVENTS = new Set(['creator_opened', 'image_generated', 'video_generated', 'caption_copied', 'share_intent_opened', 'deep_link_loaded', 'new_analysis_after_share']);
const SOURCES = new Set(['x', 'youtube', 'reddit', 'discord', 'whatsapp', 'facebook']);

export function shareAttribution(url = location.href) {
  const params = new URL(url).searchParams;
  const source = params.get('utm_source');
  const campaign = params.get('utm_campaign');
  return { source: SOURCES.has(source) ? source : 'direct', campaign: ['player_share', 'official_daily'].includes(campaign) ? campaign : 'unknown' };
}

export function promotionEvent(event, source, campaign) {
  if (!EVENTS.has(event)) return;
  const attribution = shareAttribution();
  const payload = JSON.stringify({ event, source: SOURCES.has(source) ? source : attribution.source, campaign: campaign || attribution.campaign });
  fetch('/api/share-event', { method: 'POST', headers: { 'content-type': 'application/json' }, body: payload, keepalive: true }).catch(() => {});
}
