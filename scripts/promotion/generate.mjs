import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createManifest } from '../../src/promotion/manifest.js';
import { captionsFor } from '../../src/promotion/captions.js';
import { renderAssets } from './render-video.mjs';
import { validateContent } from './validate-content.mjs';
import { selectCandidate } from './select-candidate.mjs';

export function options(args) {
  const parsed = {};
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    if (!key.startsWith('--')) throw new Error(`Unexpected argument: ${key}`);
    if (key === '--auto' || key === '--no-render') parsed[key.slice(2)] = true;
    else parsed[key.slice(2)] = args[++i];
  }
  if (![parsed.url, parsed.auto, parsed.manifest].filter(Boolean).length) throw new Error('Provide --url, --auto, or --manifest');
  if ([parsed.url, parsed.auto, parsed.manifest].filter(Boolean).length !== 1) throw new Error('Select only one input');
  parsed.locale ||= 'en'; parsed.tone ||= 'challenge'; parsed.out ||= './promotion-output';
  if (!['fr', 'en'].includes(parsed.locale) || !['challenge', 'data', 'funny'].includes(parsed.tone)) throw new Error('Invalid locale or tone');
  parsed.formats = (parsed.formats || 'x,square,short').split(',');
  if (parsed.formats.some(f => !['x', 'square', 'short'].includes(f))) throw new Error('Invalid format');
  return parsed;
}

async function getJson(url, token) {
  const response = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!response.ok) throw new Error(`Promotion API returned ${response.status}`);
  return response.json();
}

export async function generate(opts) {
  const apiBase = new URL(opts['api-base'] || 'https://www.losingqueue.lol');
  if (!['https:', 'http:'].includes(apiBase.protocol)) throw new Error('Invalid API base');
  let manifest;
  if (opts.manifest) {
    const source = JSON.parse(await readFile(resolve(opts.manifest), 'utf8'));
    manifest = source.manifest || source;
  } else if (opts.auto) {
    const token = process.env.PROMOTION_AUTOMATION_TOKEN;
    if (!token) throw new Error('PROMOTION_AUTOMATION_TOKEN is required for --auto');
    const feed = await getJson(new URL('/api/promotion-feed', apiBase), token);
    manifest = selectCandidate(feed.candidates);
    if (!manifest) throw new Error('No eligible candidate');
  } else {
    const link = new URL(opts.url);
    if (!['http:', 'https:'].includes(link.protocol)) throw new Error('Invalid deep link');
    const riotId = link.searchParams.get('riot-search');
    const matchId = link.searchParams.get('match');
    if (!riotId || !matchId) throw new Error('Deep link needs riot-search and match');
    const region = matchId.split('_')[0].replace(/\d+$/, '').toLowerCase();
    const endpoint = new URL('/api/promotion', apiBase);
    for (const [key, value] of Object.entries({ riotId, matchId, region, locale: opts.locale, tone: opts.tone })) endpoint.searchParams.set(key, value);
    const data = await getJson(endpoint);
    manifest = data.manifest;
  }
  // Normalize a local manifest through the same strict field allowlist as the API.
  manifest = createManifest({
    matchId: manifest.matchId, matchmaking: manifest.verdict, direction: manifest.direction,
    result: manifest.result, userTeam: 'blue', user: { champ: manifest.champion },
    score: { blue: manifest.score?.mine, red: manifest.score?.theirs },
    winProb: { blue: manifest.winProbability?.mine, red: manifest.winProbability?.theirs },
    oneLiner: manifest.reason,
  }, { riotId: manifest.riotId, region: manifest.region, locale: opts.locale, tone: opts.tone });
  const captions = captionsFor(manifest);
  const validation = validateContent(manifest, captions);
  if (!validation.ok) throw new Error(`Content validation failed: ${validation.problems.join(', ')}`);
  const out = resolve(opts.out);
  await mkdir(out, { recursive: true });
  await Promise.all([
    writeFile(join(out, 'manifest.json'), JSON.stringify({ ...manifest, templateId: captions.templateId, contentHash: validation.contentHash }, null, 2)),
    writeFile(join(out, 'caption-x.txt'), captions.x),
    writeFile(join(out, 'youtube-title.txt'), captions.youtubeTitle),
    writeFile(join(out, 'youtube-description.txt'), captions.youtubeDescription),
    writeFile(join(out, 'validation.json'), JSON.stringify(validation, null, 2)),
  ]);
  if (!opts['no-render']) await renderAssets(manifest, out, opts.formats);
  return out;
}

if (process.argv[1]?.endsWith('generate.mjs')) {
  try { console.log(`Generated ${await generate(options(process.argv.slice(2)))}`); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
