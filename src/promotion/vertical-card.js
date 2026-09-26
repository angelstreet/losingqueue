export function drawVerticalCard(canvas, manifest, phase = 4, showRiotId = false) {
  if (canvas.width !== 1080) canvas.width = 1080;
  if (canvas.height !== 1920) canvas.height = 1920;
  const c = canvas.getContext('2d');
  c.fillStyle = '#0e1015'; c.fillRect(0, 0, 1080, 1920);
  c.strokeStyle = '#333945'; c.lineWidth = 3; c.strokeRect(20, 20, 1040, 1880);
  c.textAlign = 'left'; c.textBaseline = 'alphabetic';
  c.fillStyle = '#e0a63d'; c.font = 'bold 54px Arial'; c.fillText('LOSING QUEUE', 76, 130);
  c.font = 'bold 26px Arial'; c.fillText('UNOFFICIAL', 78, 185);
  const fr = manifest.locale === 'fr';
  const hook = fr ? 'Cette ranked était-elle jouable ?' : 'Was this ranked game winnable?';
  c.fillStyle = '#e8eaf0'; c.font = 'bold 58px Arial';
  wrap(c, hook, 76, 340, 920, 70, 2);
  if (phase >= 1) {
    c.fillStyle = '#8a91a3'; c.font = 'bold 34px Arial'; c.fillText(manifest.champion || 'League of Legends', 76, 610);
    c.fillStyle = manifest.result === 'Victory' ? '#3fb68b' : '#e05d5d';
    c.font = 'bold 92px Arial'; c.fillText(manifest.result.toUpperCase(), 76, 735);
    if (manifest.score.mine !== null && manifest.score.theirs !== null) {
      c.fillStyle = '#e8eaf0'; c.font = 'bold 48px Arial';
      c.fillText(`${manifest.score.mine} – ${manifest.score.theirs}`, 78, 815);
    }
  }
  if (phase >= 2) {
    const verdict = manifest.verdict === 'NOT FAIR' && manifest.direction === 'favor' ? 'FAVORED' : manifest.verdict;
    c.fillStyle = verdict === 'FAIR' ? '#3fb68b' : verdict === 'FAVORED' ? '#e0a63d' : '#e05d5d';
    c.font = 'bold 116px Arial'; c.fillText(verdict, 76, 1040);
  }
  if (phase >= 3) {
    c.fillStyle = '#e8eaf0'; c.font = '40px Arial';
    wrap(c, manifest.reason || '', 76, 1200, 920, 54, 3);
    const p = manifest.winProbability.mine;
    if (p !== null && p >= 0 && p <= 100) {
      c.fillStyle = '#4a90d9'; c.fillRect(76, 1470, 928 * p / 100, 48);
      c.fillStyle = '#d97a4a'; c.fillRect(76 + 928 * p / 100, 1470, 928 * (100 - p) / 100, 48);
      c.fillStyle = '#e8eaf0'; c.font = 'bold 34px Arial';
      c.fillText(`${p}% ${fr ? 'chance de victoire estimée' : 'estimated win chance'}`, 76, 1575);
    }
  }
  if (phase >= 4) {
    c.fillStyle = '#e0a63d'; c.font = 'bold 48px Arial';
    c.fillText(fr ? 'Teste ta propre game' : 'Check your own game', 76, 1740);
    c.font = 'bold 38px Arial'; c.fillText('losingqueue.lol', 76, 1800);
    if (showRiotId) {
      c.fillStyle = '#8a91a3'; c.font = '28px Arial';
      c.fillText(manifest.riotId.slice(0, 55), 76, 1860);
    }
  }
  return canvas;
}

export function drawStaticCard(canvas, manifest, width, height, showRiotId = false) {
  if (![[1200, 630], [1080, 1080]].some(([w, h]) => w === width && h === height)) throw new Error('Invalid card dimensions');
  canvas.width = width; canvas.height = height;
  const c = canvas.getContext('2d');
  const pad = width === 1200 ? 58 : 70;
  c.fillStyle = '#0e1015'; c.fillRect(0, 0, width, height);
  c.strokeStyle = '#303744'; c.lineWidth = 2; c.strokeRect(1, 1, width - 2, height - 2);
  c.textAlign = 'left';
  c.fillStyle = '#e0a63d'; c.font = 'bold 38px Arial'; c.fillText('LOSING QUEUE', pad, pad + 20);
  c.font = 'bold 15px Arial'; c.fillText('UNOFFICIAL', width - pad - 115, pad + 15);
  const verdict = manifest.verdict === 'NOT FAIR' && manifest.direction === 'favor' ? 'FAVORED' : manifest.verdict;
  c.fillStyle = manifest.result === 'Victory' ? '#3fb68b' : '#e05d5d';
  c.font = `bold ${width === 1200 ? 62 : 78}px Arial`;
  c.fillText(manifest.result.toUpperCase(), pad, height * .31);
  c.fillStyle = '#e8eaf0'; c.font = `bold ${width === 1200 ? 28 : 36}px Arial`;
  c.fillText(manifest.champion || 'League of Legends', pad, height * .38);
  if (manifest.score.mine !== null && manifest.score.theirs !== null) c.fillText(`${manifest.score.mine} – ${manifest.score.theirs}`, pad, height * .44);
  c.fillStyle = verdict === 'FAIR' ? '#3fb68b' : verdict === 'FAVORED' ? '#e0a63d' : '#e05d5d';
  c.font = `bold ${width === 1200 ? 70 : 92}px Arial`; c.fillText(verdict, pad, height * .63);
  c.fillStyle = '#e8eaf0'; c.font = `26px Arial`;
  wrap(c, manifest.reason, pad, height * .73, width - pad * 2, 34, width === 1200 ? 2 : 3);
  c.fillStyle = '#e0a63d'; c.font = 'bold 23px Arial'; c.fillText('losingqueue.lol', pad, height - pad);
  if (showRiotId) {
    c.textAlign = 'right'; c.fillStyle = '#8a91a3'; c.font = '18px Arial';
    c.fillText(manifest.riotId.slice(0, 55), width - pad, height - pad);
  }
  return canvas;
}

function wrap(c, text, x, y, width, lineHeight, maxLines) {
  const words = String(text).slice(0, 180).split(/\s+/);
  let line = '', lines = 0;
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (c.measureText(next).width > width && line) {
      c.fillText(line, x, y + lines * lineHeight); lines++;
      if (lines >= maxLines) return;
      line = word;
    } else line = next;
  }
  if (line && lines < maxLines) c.fillText(line, x, y + lines * lineHeight);
}
