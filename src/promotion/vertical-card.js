export function drawVerticalCard(canvas, manifest, phase = 4, showRiotId = false, matchImage = null, leagueLogo = null) {
  if (canvas.width !== 1080) canvas.width = 1080;
  if (canvas.height !== 1920) canvas.height = 1920;
  const c = canvas.getContext('2d');
  c.fillStyle = '#0e1015'; c.fillRect(0, 0, 1080, 1920);
  c.strokeStyle = '#333945'; c.lineWidth = 3; c.strokeRect(20, 20, 1040, 1880);
  c.textAlign = 'left'; c.textBaseline = 'alphabetic';
  if (leagueLogo) c.drawImage(leagueLogo, 76, 62, 200, 76);
  else { c.fillStyle = '#c79b3b'; c.font = 'bold 25px Arial'; c.fillText('LEAGUE OF LEGENDS', 76, 110); }
  c.fillStyle = '#e0a63d'; c.font = 'bold 50px Arial'; c.fillText('LOSING QUEUE', 305, 116);
  c.font = 'bold 24px Arial'; c.fillText('UNOFFICIAL', 308, 160);
  const fr = manifest.locale === 'fr';
  const hook = fr ? 'Cette ranked était-elle jouable ?' : 'Was this ranked game winnable?';
  c.fillStyle = '#e8eaf0'; c.font = 'bold 58px Arial';
  wrap(c, hook, 76, 305, 920, 70, 2);
  if (phase >= 1) {
    c.fillStyle = '#171c25'; c.fillRect(62, 405, 956, 690);
    c.strokeStyle = '#374151'; c.lineWidth = 2; c.strokeRect(62, 405, 956, 690);
    c.fillStyle = '#8a91a3'; c.font = 'bold 26px Arial';
    c.fillText(matchImage
      ? (phase === 1 ? (fr ? 'LA GAME EN IMAGE' : 'THE MATCHUP') : (fr ? 'ZOOM SUR TON ÉQUIPE' : 'YOUR TEAM UP CLOSE'))
      : (fr ? 'LE MATCH EN CHIFFRES' : 'THE MATCH IN NUMBERS'), 86, 450);
    if (matchImage) {
      const x = 86, y = 480, w = 908, h = 585;
      c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
      if (phase === 1) {
        const scale = Math.min(w / matchImage.width, h / matchImage.height);
        const dw = matchImage.width * scale, dh = matchImage.height * scale;
        c.drawImage(matchImage, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
      } else {
        const sw = matchImage.width * .62, sh = matchImage.height * .78;
        const sx = matchImage.width - sw, sy = Math.min(matchImage.height - sh, matchImage.height * .08);
        c.drawImage(matchImage, sx, sy, sw, sh, x, y, w, h);
      }
      c.restore();
    } else {
      const mine = manifest.score.mine, theirs = manifest.score.theirs;
      const p = manifest.winProbability.mine;
      c.fillStyle = '#232d3a'; c.fillRect(88, 490, 902, 155);
      c.fillStyle = '#e8eaf0'; c.font = 'bold 36px Arial';
      c.fillText(fr ? 'TON ÉQUIPE' : 'YOUR TEAM', 124, 550);
      c.textAlign = 'right'; c.fillText(fr ? 'ADVERSAIRES' : 'OPPONENTS', 955, 550); c.textAlign = 'left';
      c.fillStyle = '#4a90d9'; c.font = 'bold 70px Arial'; c.fillText(mine ?? '–', 126, 630);
      c.fillStyle = '#d97a4a'; c.textAlign = 'right'; c.fillText(theirs ?? '–', 955, 630); c.textAlign = 'left';
      c.fillStyle = '#8a91a3'; c.font = 'bold 38px Arial'; c.fillText('VS', 510, 615);
      c.fillStyle = '#e8eaf0'; c.font = 'bold 34px Arial';
      c.fillText(fr ? 'AVANT LA PARTIE' : 'BEFORE THE MATCH', 124, 755);
      if (p !== null && p >= 0 && p <= 100) {
        c.fillStyle = '#4a90d9'; c.fillRect(124, 815, 832 * p / 100, 64);
        c.fillStyle = '#d97a4a'; c.fillRect(124 + 832 * p / 100, 815, 832 * (100 - p) / 100, 64);
        c.fillStyle = '#e8eaf0'; c.font = 'bold 45px Arial';
        c.fillText(`${p}%`, 124, 945);
        c.textAlign = 'right'; c.fillText(`${100 - p}%`, 955, 945); c.textAlign = 'left';
      }
      c.fillStyle = '#8a91a3'; c.font = '31px Arial';
      c.fillText(fr ? 'Estimation avant la game' : 'Pregame estimate', 124, 1025);
    }
    c.fillStyle = '#8a91a3'; c.font = 'bold 31px Arial'; c.fillText(manifest.champion || 'League of Legends', 76, 1195);
    c.fillStyle = manifest.result === 'Victory' ? '#3fb68b' : '#e05d5d';
    c.font = 'bold 88px Arial'; c.fillText(manifest.result.toUpperCase(), 76, 1300);
    if (manifest.score.mine !== null && manifest.score.theirs !== null) {
      c.fillStyle = '#e8eaf0'; c.font = 'bold 48px Arial';
      c.fillText(`${manifest.score.mine} – ${manifest.score.theirs}`, 78, 1370);
    }
  }
  if (phase >= 2) {
    const verdict = manifest.verdict === 'NOT FAIR' && manifest.direction === 'favor' ? 'FAVORED' : manifest.verdict;
    c.fillStyle = verdict === 'FAIR' ? '#3fb68b' : verdict === 'FAVORED' ? '#e0a63d' : '#e05d5d';
    c.font = 'bold 100px Arial'; c.fillText(verdict, 535, 1290);
  }
  if (phase >= 3) {
    c.fillStyle = '#e8eaf0'; c.font = '34px Arial';
    wrap(c, manifest.reason || '', 76, 1455, 920, 45, 2);
    const p = manifest.winProbability.mine;
    if (p !== null && p >= 0 && p <= 100) {
      c.fillStyle = '#4a90d9'; c.fillRect(76, 1570, 928 * p / 100, 42);
      c.fillStyle = '#d97a4a'; c.fillRect(76 + 928 * p / 100, 1570, 928 * (100 - p) / 100, 42);
      c.fillStyle = '#e8eaf0'; c.font = 'bold 30px Arial';
      c.fillText(`${p}% ${fr ? 'chance de victoire estimée' : 'estimated win chance'}`, 76, 1665);
    }
  }
  if (phase >= 4) {
    c.fillStyle = '#e0a63d'; c.font = 'bold 48px Arial';
    c.fillText(fr ? 'Teste ta propre game' : 'Check your own game', 76, 1750);
    c.font = 'bold 38px Arial'; c.fillText('losingqueue.lol', 76, 1810);
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
