// Usage: node make-video.mjs --locale fr --out out.mp4 [--data game.json] [--image screenshot.png] [--preview | --grid] [--fps 30]
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const PROMO = resolve(here, '../../..'); // repo root (playwright + public/ logo live there)
const require = createRequire(join(PROMO, 'package.json'));
const { chromium } = require('playwright');

const args = Object.fromEntries(process.argv.slice(2).map((a, i, arr) => a.startsWith('--') ? [a.slice(2), arr[i + 1]?.startsWith('--') || arr[i + 1] === undefined ? true : arr[i + 1]] : []).filter(Boolean));
const locale = args.locale || 'fr';
const out = resolve(args.out || join(PROMO, 'promotion-output', `short-${locale}.mp4`));
const FPS = Number(args.fps || 30), DUR = 15;
const preview = Boolean(args.preview) || Boolean(args.grid); // only dump a few key frames as PNG
const grid = Boolean(args.grid); // only dump the screenshot with a coordinate grid
const imagePath = resolve(args.image || join(here, 'match.png'));
const config = args.data ? JSON.parse(await readFile(resolve(args.data), 'utf8')) : {};

const files = {
  '/': ['text/html', join(here, 'promo.html')],
  '/match.png': ['image/png', imagePath],
  '/league-of-legends-logo.svg': ['image/svg+xml', join(PROMO, 'public/league-of-legends-logo.svg')],
};
const server = createServer(async (req, res) => {
  const f = files[req.url]; if (!f) { res.statusCode = 404; return res.end(); }
  res.setHeader('content-type', f[0]); res.end(await readFile(f[1]));
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/`;

const frames = join(here, `frames-${locale}`);
await rm(frames, { recursive: true, force: true }); await mkdir(frames, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('pageerror', e.message));
  await page.goto(url);
  await page.waitForFunction(() => typeof window.renderFrame === 'function');
  console.log('config', JSON.stringify(await page.evaluate(cfg => window.setConfig(cfg), config)));
  console.log('assets', await page.evaluate(() => window.loadAssets()));
  const grab = async (t, file) => {
    const data = await page.evaluate(([t, locale]) => { window.renderFrame(t, locale); return document.getElementById('c').toDataURL('image/png'); }, [t, locale]);
    await writeFile(file, Buffer.from(data.slice(data.indexOf(',') + 1), 'base64'));
  };
  if (grid) {
    const data = await page.evaluate(() => window.renderGrid());
    await writeFile(join(here, 'grid.png'), Buffer.from(data.slice(data.indexOf(',') + 1), 'base64'));
    console.log('wrote grid.png (screenshot with 50px grid, red box = rowRect, red dot = rowFocus)');
  } else if (preview) {
    const KEY = [0.6, 1.8, 3.0, 5.2, 7.0, 8.4, 9.0, 10.8, 12.8, 14.5];
    for (const t of KEY) await grab(t, join(here, `preview-${locale}-${t.toFixed(1)}.png`));
    // contact sheet of the key frames
    const inputs = KEY.flatMap(t => ['-i', join(here, `preview-${locale}-${t.toFixed(1)}.png`)]);
    const fc = KEY.map((_, i) => `[${i}]`).join('') + `tile=${KEY.length}x1`;
    await new Promise(res => { const p = spawn('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', `${KEY.map((_, i) => `[${i}]scale=300:-1[s${i}]`).join(';')};${KEY.map((_, i) => `[s${i}]`).join('')}hstack=${KEY.length}`, '-frames:v', '1', join(here, `preview-${locale}-sheet.png`)], { stdio: 'inherit' }); p.on('close', res); });
    console.log('preview frames written');
  } else {
    const n = FPS * DUR; const t0 = Date.now();
    for (let i = 0; i < n; i++) {
      await grab(i / FPS, join(frames, `f${String(i).padStart(4, '0')}.png`));
      if (i % 60 === 0) console.log(`frame ${i}/${n} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
    }
  }
} finally { await browser.close(); await new Promise(r => server.close(r)); }
if (preview) process.exit(0);

// ---- audio: synthesized pad + riser + hits + ticks + whooshes, all in one aevalsrc expression
const gate = (a, b) => `between(t,${a},${b})`;
const tau = t0 => `(t-${t0})`;
const pad = `(0.15*sin(2*PI*55*t)*(1+0.25*sin(2*PI*0.35*t))+0.075*sin(2*PI*110.4*t)+0.04*sin(2*PI*165.2*t)+0.025*sin(2*PI*220.6*t))*min(t/1.5,1)*min(1,max(0,(15-t)/1.3))`;
const riser = `${gate(7.0, 8.6)}*0.13*pow(${tau(7.0)}/1.6,2)*sin(2*PI*(110*${tau(7.0)}+180*${tau(7.0)}*${tau(7.0)}))`;
const hit = (t0, amp) => `gte(t,${t0})*${amp}*exp(-${tau(t0)}*6)*sin(2*PI*(48*${tau(t0)}+40*(1-exp(-${tau(t0)}*25))))`;
const tick = t0 => `gte(t,${t0})*0.16*exp(-${tau(t0)}*45)*sin(2*PI*1500*${tau(t0)})`;
const whoosh = t0 => `0.09*(random(0)-0.5)*2*exp(-abs(t-${t0}-0.15)*7)`;
const expr = [pad, riser, hit(8.6, .45), hit(9.4, .45), hit(11.6, .3), tick(7.7), tick(7.9), tick(8.1), tick(12.25), whoosh(2.4), whoosh(6.0), whoosh(11.6)].join('+');
const audioGraph = `aevalsrc='${expr}':s=44100:d=${DUR},lowpass=f=9000,alimiter=limit=0.9`;

const ffArgs = ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', join(frames, 'f%04d.png'), '-f', 'lavfi', '-i', audioGraph,
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-c:a', 'aac', '-b:a', '160k', '-ac', '2', '-shortest', '-movflags', '+faststart', out];
await new Promise((res, rej) => { const p = spawn('ffmpeg', ffArgs, { stdio: ['ignore', 'inherit', 'inherit'] }); p.on('error', rej); p.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg exit ' + c))); });
// poster = the CTA frame
await new Promise((res, rej) => { const p = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-i', out, '-ss', '13', '-frames:v', '1', out.replace(/\.mp4$/, '-poster.png')], { stdio: 'inherit' }); p.on('close', c => c === 0 ? res() : rej(new Error('poster failed'))); });
console.log('wrote', out);
