import { drawVerticalCard } from './vertical-card.js';

export function verticalPng(manifest, showRiotId = false) {
  const canvas = document.createElement('canvas');
  drawVerticalCard(canvas, manifest, 4, showRiotId);
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG export failed')), 'image/png'));
}

export async function shortWebm(manifest, showRiotId = false) {
  const type = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(t => window.MediaRecorder?.isTypeSupported(t));
  if (!type || !HTMLCanvasElement.prototype.captureStream) throw new Error('Video export unavailable');
  const canvas = document.createElement('canvas');
  drawVerticalCard(canvas, manifest, 0, showRiotId);
  const stream = canvas.captureStream(12);
  const chunks = [];
  const recorder = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 4_000_000 });
  const done = new Promise((resolve, reject) => {
    recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    recorder.onerror = reject;
    recorder.onstop = () => resolve(new Blob(chunks, { type }));
  });
  recorder.start();
  const timeline = [[0, 2000], [1, 3000], [2, 3000], [3, 4000], [4, 3000]];
  for (const [phase, duration] of timeline) {
    drawVerticalCard(canvas, manifest, phase, showRiotId);
    await new Promise(resolve => setTimeout(resolve, duration));
  }
  recorder.stop();
  const blob = await done;
  stream.getTracks().forEach(t => t.stop());
  return blob;
}
