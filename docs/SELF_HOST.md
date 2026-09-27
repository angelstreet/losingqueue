# Self-host / fork

1. **Fork this repo**, then import it on [vercel.com/new](https://vercel.com/new) — leave Root Directory empty; `vercel.json` pins the Vite build and function timeouts.
2. Create a free SQLite database at [turso.tech](https://turso.tech) and copy its URL + auth token.
3. Get a Riot API key at [developer.riotgames.com](https://developer.riotgames.com) (dev keys are free, expire every 24h; a personal key is permanent).
4. Optional accounts: create a free [Clerk](https://clerk.com) app and note its publishable key + frontend API URL.
5. In Vercel → Project → Settings → Environment Variables:

   | Variable | Value |
   |---|---|
   | `RIOT_API_KEY` | shared key for keyless visitors (optional — without it the app is BYOK-only) |
   | `TURSO_DATABASE_URL` | `libsql://your-db.turso.io` |
   | `TURSO_AUTH_TOKEN` | Turso token |
   | `VITE_CLERK_PUBLISHABLE_KEY` | optional — Clerk publishable key (`pk_...`) |
   | `CLERK_ISSUER` | optional — e.g. `https://your-instance.clerk.accounts.dev` |

6. Deploy. Done.

## Local development

```bash
npm install
# terminal 1 — API shim on :3131 (hosts the same serverless functions locally)
RIOT_API_KEY=RGAPI-xxx TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... CLERK_ISSUER=... npm run dev:api
# terminal 2 — Vite on :5173 (proxies /api to :3131)
VITE_CLERK_PUBLISHABLE_KEY=pk_... npx vite
```
