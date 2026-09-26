import { readFile } from 'node:fs/promises';
import { publishOptions, loadPackage, fileAt, withPublication } from './publish-common.mjs';

export async function publishX(opts, fetchFn = fetch) {
  const { dir, manifest, captions, validation } = await loadPackage(opts.input);
  const image = await fileAt(dir, 'card-x.png', 5 * 1024 * 1024);
  if (!opts.publish) return { dryRun: true, caption: captions.x, image: image.path };
  const token = process.env.X_USER_ACCESS_TOKEN;
  if (!token) throw new Error('X user access token with write permission is required');
  return withPublication(manifest, captions, 'x', validation.contentHash, async () => {
    const upload = await fetchFn('https://api.x.com/2/media/upload', {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ media: (await readFile(image.path)).toString('base64'), media_category: 'tweet_image' }),
    });
    if (!upload.ok) throw new Error(`X media upload failed (${upload.status})`);
    const mediaId = (await upload.json()).data?.id;
    if (!mediaId) throw new Error('X did not return a media ID');
    const post = await fetchFn('https://api.x.com/2/tweets', {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: captions.x, media: { media_ids: [mediaId] } }),
    });
    if (!post.ok) throw new Error(`X post failed (${post.status})`);
    const id = (await post.json()).data?.id;
    if (!id) throw new Error('X did not return a post ID');
    return id;
  });
}

if (process.argv[1]?.endsWith('publish-x.mjs')) {
  try { console.log(await publishX(publishOptions(process.argv.slice(2)))); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
