# Promote Losing Queue

Losing Queue turns an analyzed game into shareable content. The verdict is a heuristic based on pregame data. Losing Queue is unofficial and is not endorsed by Riot Games. Share your own games and avoid unsolicited replies, comments, mentions, or repeated near-identical posts.

## Share from the site

Analyze a ranked game, then choose **Create content** beside Share. Select French or English and a tone. The sheet shows an image preview, an X caption, a YouTube title and description, and actions to copy, share, or download. **Download Short** saves a 15-second WebM where `MediaRecorder` supports it; otherwise it downloads a 1080×1920 PNG. The exported image hides player Riot IDs by default. **Show my Riot ID in image** reveals only your own ID. Public deep links preserve `riot-search` and `match` and include UTM tags; UTM values are ignored when loading the match.

Only aggregate event counts are stored by day, event, source, and campaign. No full IP address, clipboard content, or Riot API key is stored for promotion analytics. The conversion event is a new completed analysis after a visitor opened a tracked match link.

## Generate a package locally

Install Node 22 or newer, FFmpeg with `ffprobe`, and Playwright's Chromium (`npm ci` then `npx playwright install chromium`). Chrome may be used by setting `PROMOTION_CHROME_PATH` to its executable. In PowerShell, use the `node` form below to ensure flags are passed unchanged.

```sh
node scripts/promotion/generate.mjs --url "https://www.losingqueue.lol/?riot-search=Player%23EUW&match=EUW1_123" --locale fr --tone challenge --out promotion-output
```

The package contains `manifest.json`, `caption-x.txt`, `youtube-title.txt`, `youtube-description.txt`, `card-x.png` (1200×630), `card-square.png` (1080×1080), `short.mp4` (1080×1920, about 15 seconds), and `validation.json`. The renderer uses the same normalized analysis fields as the browser and never calculates another fairness score. Use `--formats x,square,short` to choose outputs, or `--no-render` for text only. Output stays ignored by Git by default.

For owner candidate selection, set `PROMOTION_AUTOMATION_TOKEN` and use `--auto`. The token only reaches the protected feed endpoint. The feed uses a bounded database query and skips already published and low-scoring matches. A 30-second server-side throttle limits feed requests. Set `--api-base` only for a trusted local or staging API.

Validate any package before publishing:

```sh
node scripts/promotion/validate-content.mjs promotion-output
node scripts/promotion/publish-youtube.mjs --input promotion-output --dry-run
node scripts/promotion/publish-x.mjs --input promotion-output --dry-run
```

Dry run is the default. Live publishing requires `--publish`, platform credentials, and Turso credentials. A publication row is reserved before a live API call, successful uploads record the returned ID, and failed calls release their reservation. If a platform accepts a post but the database write fails, the pending row stays in place to prevent an accidental duplicate. One successful post per platform per 24 hours is allowed.

## GitHub Actions

**Generate promotion package** runs manually or once daily when `PROMOTION_AUTOMATION_TOKEN` is configured. It generates exactly one package, validates it, and uploads an artifact. It never publishes. The YouTube and X workflows are manual only and default to dry run. They upload a package artifact even in dry run. All workflows use minimal `contents: read` permissions and full commit SHAs for actions. Publishing secrets are unavailable to pull-request workflows because none of these workflows run on pull requests.

Repository secrets for automatic candidate selection: `PROMOTION_AUTOMATION_TOKEN`. Live publishing additionally needs `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`. Do not use `VITE_*` names for these secrets.

## Optional YouTube publishing

Create a Google Cloud OAuth **desktop** client with YouTube Data API access. Set `YOUTUBE_CLIENT_ID` and `YOUTUBE_CLIENT_SECRET` locally, then run `node scripts/promotion/oauth-youtube.mjs`. Open the printed consent URL for the project channel and store the returned refresh token as `YOUTUBE_REFRESH_TOKEN` in your local secret manager or GitHub repository secrets. The helper listens only on `127.0.0.1` for the one-time callback. Do not commit tokens or paste them into issues or artifacts.

The uploader refreshes its access token, checks the MP4 duration and metadata, and uses the [official resumable `videos.insert` API](https://developers.google.com/youtube/v3/guides/using_resumable_upload_protocol). Upload privacy is always **private** in this implementation so the first runs can be reviewed. Google may restrict uploads from unverified API projects to private viewing until its audit is completed. OAuth revocation or expiration requires a new refresh token.

## Optional X publishing

Use an X developer app with official write access and a user access token. Store it as `X_USER_ACCESS_TOKEN` outside the browser bundle. The adapter sends one original image post using the [official media upload](https://docs.x.com/x-api/media/upload-media) and [post creation](https://docs.x.com/x-api/posts/create-post) endpoints. No replies, searches, follows, likes, or website automation are performed. If your account lacks official API access, keep the workflow in dry-run mode and publish the generated image and caption manually. Check current X access and pricing before enabling live runs.

## Contribute templates

Edit `content/promotion/templates.fr.json` or `templates.en.json`, then run `npm test`. Placeholders are limited to `{hook}`, `{verdict}`, and `{url}`. Keep X captions within the platform limit, retain the heuristic/unofficial disclosure in YouTube descriptions, and never infer Riot's intent or name individual teammates. The candidate score uses only analyzed match facts; translations must not add new factual claims.

## Troubleshooting

- **Playwright browser missing:** run `npx playwright install chromium`, or set `PROMOTION_CHROME_PATH`.
- **FFmpeg or ffprobe missing:** install both and add them to `PATH`; `--formats x,square` avoids video assembly.
- **Browser video export downloads a PNG:** the browser lacks a supported WebM recording codec; the vertical PNG is the fallback.
- **OAuth refresh fails:** regenerate a refresh token for the same channel and replace the secret.
- **No eligible candidate:** use a cached deep link, wait for a fresh high-interest game, or inspect the protected feed and publication history as the owner.
