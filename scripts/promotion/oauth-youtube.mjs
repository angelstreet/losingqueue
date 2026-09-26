import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';

const clientId = process.env.YOUTUBE_CLIENT_ID;
const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
if (!clientId || !clientSecret) {
  console.error('Set YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET for a Google OAuth desktop client.');
  process.exit(1);
}

const state = randomBytes(24).toString('hex');
const server = createServer();
server.listen(0, '127.0.0.1');
await new Promise(resolve => server.once('listening', resolve));
const redirectUri = `http://127.0.0.1:${server.address().port}/callback`;
const authorize = new URL('https://accounts.google.com/o/oauth2/v2/auth');
for (const [key, value] of Object.entries({
  client_id: clientId, redirect_uri: redirectUri, response_type: 'code',
  scope: 'https://www.googleapis.com/auth/youtube.upload', access_type: 'offline', prompt: 'consent', state,
})) authorize.searchParams.set(key, value);
console.log(`Open this URL and authorize the project channel:\n${authorize}`);

const timeout = setTimeout(() => { console.error('Authorization timed out.'); server.close(); }, 300_000);
server.on('request', async (req, res) => {
  const url = new URL(req.url, redirectUri);
  if (url.pathname !== '/callback' || url.searchParams.get('state') !== state || !url.searchParams.get('code')) {
    res.writeHead(400).end('Invalid authorization response'); return;
  }
  try {
    const token = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code: url.searchParams.get('code'), client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
    });
    if (!token.ok) throw new Error(`Token exchange failed (${token.status})`);
    const refreshToken = (await token.json()).refresh_token;
    if (!refreshToken) throw new Error('No refresh token returned; revoke prior consent and retry.');
    res.writeHead(200, { 'content-type': 'text/plain' }).end('Authorized. Return to the terminal.');
    console.log(`Store this as YOUTUBE_REFRESH_TOKEN in your secret manager:\n${refreshToken}`);
  } catch (error) {
    res.writeHead(500).end('Authorization failed. Check the terminal.');
    console.error(error.message);
  } finally {
    clearTimeout(timeout);
    server.close();
  }
});
