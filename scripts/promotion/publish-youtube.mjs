import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { publishOptions, loadPackage, fileAt, withPublication } from './publish-common.mjs';

export async function videoDuration(path) {
  return new Promise((resolve, reject) => {
    const p = spawn('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', path]);
    let output = '';
    p.stdout.on('data', chunk => { output += chunk; });
    p.on('error', reject);
    p.on('close', code => code === 0 ? resolve(Number(output.trim())) : reject(new Error('ffprobe failed')));
  });
}

export async function publishYouTube(opts, fetchFn = fetch) {
  const { dir, manifest, captions, validation } = await loadPackage(opts.input);
  const video = await fileAt(dir, 'short.mp4', 128 * 1024 * 1024);
  const duration = await videoDuration(video.path);
  if (!Number.isFinite(duration) || duration < 12 || duration > 16) throw new Error('Short duration must be 12–16 seconds');
  if (!opts.publish) return { dryRun: true, privacy: 'private', duration, title: captions.youtubeTitle };
  const { YOUTUBE_CLIENT_ID: clientId, YOUTUBE_CLIENT_SECRET: clientSecret, YOUTUBE_REFRESH_TOKEN: refreshToken } = process.env;
  if (!clientId || !clientSecret || !refreshToken) throw new Error('YouTube OAuth credentials are required');
  return withPublication(manifest, captions, 'youtube', validation.contentHash, async () => {
    const tokenResponse = await fetchFn('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' }),
    });
    if (!tokenResponse.ok) throw new Error(`YouTube token refresh failed (${tokenResponse.status})`);
    const accessToken = (await tokenResponse.json()).access_token;
    if (!accessToken) throw new Error('YouTube access token missing');
    const init = await fetchFn('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
      method: 'POST', headers: {
        Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': 'video/mp4', 'X-Upload-Content-Length': String(video.size),
      },
      body: JSON.stringify({ snippet: { title: captions.youtubeTitle, description: captions.youtubeDescription, categoryId: '20' }, status: { privacyStatus: 'private' } }),
    });
    const location = init.headers.get('location');
    if (!init.ok || !location?.startsWith('https://www.googleapis.com/')) throw new Error(`YouTube upload initialization failed (${init.status})`);
    const uploaded = await fetchFn(location, { method: 'PUT', headers: { 'Content-Type': 'video/mp4', 'Content-Length': String(video.size) }, body: await readFile(video.path) });
    if (!uploaded.ok) throw new Error(`YouTube upload failed (${uploaded.status})`);
    const id = (await uploaded.json()).id;
    if (!id) throw new Error('YouTube did not return a video ID');
    return id;
  });
}

if (process.argv[1]?.endsWith('publish-youtube.mjs')) {
  try { console.log(await publishYouTube(publishOptions(process.argv.slice(2)))); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
