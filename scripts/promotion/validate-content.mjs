import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export function contentHash(manifest, captions) {
  const stable = [manifest.matchId, manifest.riotId, manifest.verdict, manifest.direction, manifest.result, manifest.reason, manifest.locale, manifest.tone, captions.templateId].join('\n');
  return createHash('sha256').update(stable).digest('hex');
}

export function validateContent(manifest, captions) {
  const problems = [];
  if (manifest.version !== 1 || !/^[A-Z0-9]+_[0-9]+$/.test(manifest.matchId)) problems.push('Invalid manifest');
  if (!/^https:\/\/www\.losingqueue\.lol\//.test(manifest.deepLink)) problems.push('Noncanonical deep link');
  if (!captions.x || captions.x.length > 280) problems.push('X caption too long');
  if (!captions.youtubeTitle || captions.youtubeTitle.length > 100) problems.push('YouTube title too long');
  if (!/heuristic|heuristique/i.test(captions.youtubeDescription) || !/unofficial|non officiel/i.test(captions.youtubeDescription)) problems.push('Missing disclosure');
  if (/(?:api[_-]?key|auth[_-]?token|refresh[_-]?token)=/i.test(JSON.stringify({ manifest, captions }))) problems.push('Possible credential in content');
  return { ok: problems.length === 0, problems, contentHash: contentHash(manifest, captions) };
}

if (process.argv[1]?.endsWith('validate-content.mjs')) {
  const input = process.argv[2];
  if (!input) { console.error('Usage: node validate-content.mjs <package-directory>'); process.exit(2); }
  const manifest = JSON.parse(await readFile(join(input, 'manifest.json'), 'utf8'));
  const captions = {
    x: await readFile(join(input, 'caption-x.txt'), 'utf8'),
    youtubeTitle: await readFile(join(input, 'youtube-title.txt'), 'utf8'),
    youtubeDescription: await readFile(join(input, 'youtube-description.txt'), 'utf8'),
    templateId: manifest.templateId,
  };
  const result = validateContent(manifest, captions);
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
}
