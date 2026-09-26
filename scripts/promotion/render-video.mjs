import { createServer } from 'node:http';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const ROOT = new URL('../../', import.meta.url);

export async function renderAssets(manifest, out, formats = ['x', 'square', 'short']) {
  const html = await readFile(new URL('./render.html', import.meta.url));
  const module = await readFile(new URL('../../src/promotion/vertical-card.js', import.meta.url));
  const server = createServer((req, res) => {
    if (req.url === '/') { res.setHeader('content-type', 'text/html'); res.end(html); }
    else if (req.url === '/vertical-card.js') { res.setHeader('content-type', 'text/javascript'); res.end(module); }
    else { res.statusCode = 404; res.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  const temp = await mkdtemp(join(tmpdir(), 'losingqueue-promo-'));
  try {
    const { chromium } = await import('playwright');
    browser = await chromium.launch({ headless: true, ...(process.env.PROMOTION_CHROME_PATH ? { executablePath: process.env.PROMOTION_CHROME_PATH } : {}) });
    const page = await browser.newPage({ viewport: { width: 1200, height: 1920 }, deviceScaleFactor: 1 });
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.waitForFunction(() => typeof window.drawPromotion === 'function');
    const capture = async (kind, file, phase = 4) => {
      await page.evaluate(({ manifest, kind, phase }) => window.drawPromotion(manifest, kind, phase), { manifest, kind, phase });
      await page.locator('canvas').screenshot({ path: file });
    };
    if (formats.includes('x')) await capture('x', join(out, 'card-x.png'));
    if (formats.includes('square')) await capture('square', join(out, 'card-square.png'));
    if (formats.includes('short')) {
      const phases = [0, 1, 2, 3, 4];
      for (const phase of phases) await capture('vertical', join(temp, `frame-${phase}.png`), phase);
      const lines = phases.flatMap((phase, i) => [`file '${join(temp, `frame-${phase}.png`).replaceAll('\\', '/').replaceAll("'", "'\\''")}'`, `duration ${[2, 3, 3, 4, 3][i]}`]);
      lines.push(`file '${join(temp, 'frame-4.png').replaceAll('\\', '/')}'`);
      await writeFile(join(temp, 'frames.txt'), lines.join('\n'));
      await ffmpeg(['-y', '-f', 'concat', '-safe', '0', '-i', join(temp, 'frames.txt'), '-r', '30', '-t', '15', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', join(out, 'short.mp4')]);
    }
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
    await rm(temp, { recursive: true, force: true });
  }
}

function ffmpeg(args) {
  return new Promise((resolve, reject) => {
    const child = spawn('ffmpeg', ['-loglevel', 'error', ...args], { stdio: ['ignore', 'ignore', 'pipe'] });
    let errors = '';
    child.stderr.on('data', chunk => { errors += chunk; });
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve() : reject(new Error(`FFmpeg failed: ${errors.slice(-1000)}`)));
  });
}
