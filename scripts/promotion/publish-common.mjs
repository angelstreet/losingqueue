import { readFile, stat } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { validateContent } from './validate-content.mjs';
import * as store from '../../lib/db.mjs';

export function publishOptions(args) {
  const opts = { publish: false, input: './promotion-output' };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--publish') opts.publish = true;
    else if (args[i] === '--dry-run') opts.publish = false;
    else if (args[i] === '--input') opts.input = args[++i];
    else throw new Error(`Unexpected argument: ${args[i]}`);
  }
  return opts;
}

export async function loadPackage(input) {
  const dir = resolve(input);
  const manifest = JSON.parse(await readFile(join(dir, 'manifest.json'), 'utf8'));
  const captions = {
    templateId: manifest.templateId,
    x: await readFile(join(dir, 'caption-x.txt'), 'utf8'),
    youtubeTitle: await readFile(join(dir, 'youtube-title.txt'), 'utf8'),
    youtubeDescription: await readFile(join(dir, 'youtube-description.txt'), 'utf8'),
  };
  const validation = validateContent(manifest, captions);
  if (!validation.ok || validation.contentHash !== manifest.contentHash) throw new Error(`Package validation failed: ${validation.problems.join(', ') || 'hash mismatch'}`);
  return { dir, manifest, captions, validation };
}

export async function fileAt(dir, name, maxBytes) {
  const path = join(dir, name);
  const size = (await stat(path)).size;
  if (size <= 0 || size > maxBytes) throw new Error(`${name} has invalid size`);
  return { path, size };
}

export async function withPublication(manifest, captions, platform, contentHash, action) {
  if (!process.env.TURSO_DATABASE_URL) throw new Error('Turso credentials are required for live publishing');
  await store.init();
  const summoner = manifest.riotId.replace('#', '-');
  const reserved = await store.reservePromotion(manifest.matchId, summoner, platform, captions.templateId, contentHash);
  if (!reserved) throw new Error('Duplicate or daily publishing limit reached');
  let externalId = null;
  try {
    externalId = await action();
    await store.finishPromotion(manifest.matchId, platform, externalId, true);
    return externalId;
  } finally {
    // If the platform accepted the post but logging failed, keep the pending row to
    // prevent an automatic retry from duplicating a public post.
    if (!externalId) await store.finishPromotion(manifest.matchId, platform, null, false);
  }
}
