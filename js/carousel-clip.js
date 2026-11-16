// ─── ภาพหลายหน้า → คลิปสั้น 9:16 ฟีลเล่าเรื่อง: การ์ดสไลด์ลอยกลางจอ ซูมช้า เลื่อนเปลี่ยนหน้านุ่ม ๆ มีเพลงเบา ๆ ───
import { renderSlide, THEMES } from './carousel.js';
import { renderMusic } from './video/music.js';

const ease = (p) => (p <= 0 ? 0 : p >= 1 ? 1 : 1 - Math.pow(1 - p, 3));
function rr(x, X, Y, w, h, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); }
const words = (s) => [s.title, s.body, s.kicker, s.q, typeof s.a === 'string' ? s.a : '', ...(s.items || [])].filter(Boolean).join(' ').length;

/** สร้างคลิป · onProgress(0..1) → Blob */
export async function carouselToClip(deck, { onProgress, music = 'story' } = {}) {
  const T = THEMES[deck.theme] || THEMES.aom; const imgs = [];
  for (let i = 0; i < deck.slides.length; i++) { imgs.push((await renderSlide(deck.slides[i], deck, i)).canvas); onProgress?.(0.1 * (i + 1) / deck.slides.length); }
  const durs = deck.slides.map((s) => Math.min(5.5, Math.max(2.6, 1.8 + words(s) / 22)));
  const TR = 0.55; const total = durs.reduce((a, b) => a + b, 0) + 0.6;
  const W = 1080, H = 1920; const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const x = cv.getContext('2d');
  const bg = x.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, T.bg2); bg.addColorStop(1, T.bg);
  const starts = []; durs.reduce((a, d, i) => { starts[i] = a; return a + d; }, 0.3);
  const card = (im, cx, cy, sc, a) => { const w = 980 * sc, hh = w * 1350 / 1080; x.save(); x.globalAlpha = a; x.shadowColor = 'rgba(0,0,0,.22)'; x.shadowBlur = 50; x.shadowOffsetY = 18; rr(x, cx - w / 2, cy - hh / 2, w, hh, 34); x.fillStyle = '#fff'; x.fill(); x.restore(); x.save(); x.globalAlpha = a; rr(x, cx - w / 2, cy - hh / 2, w, hh, 34); x.clip(); x.drawImage(im, cx - w / 2, cy - hh / 2, w, hh); x.restore(); };
  const frame = (t) => {
    x.fillStyle = bg; x.fillRect(0, 0, W, H);
    x.save(); x.globalAlpha = 0.5; x.fillStyle = T.accent; x.beginPath(); x.arc(W * 0.9, H * 0.12 + Math.sin(t * 0.6) * 20, 160, 0, 7); x.globalAlpha = 0.08; x.fill(); x.beginPath(); x.arc(W * 0.08, H * 0.88 + Math.cos(t * 0.5) * 24, 220, 0, 7); x.fill(); x.restore();
    let i = starts.findIndex((s, k) => t >= s && t < s + durs[k]); if (i < 0) i = t < starts[0] ? 0 : imgs.length - 1;
    const lt = t - starts[i]; const zoom = 1 + 0.035 * Math.min(1, lt / durs[i]);
    const inP = i === 0 ? ease(t / 0.5) : ease(lt / TR);
    if (i > 0 && lt < TR) { const out = ease(lt / TR); card(imgs[i - 1], W / 2 - out * W * 0.9, H * 0.47, 1.035 - out * 0.08, 1 - out * 0.6); }
    card(imgs[i], W / 2 + (1 - inP) * W * 0.9, H * 0.47, zoom * (0.94 + 0.06 * inP), i === 0 ? inP : 1);
    // จุดหน้า
    const n = imgs.length; let dx = W / 2 - (n * 26) / 2; for (let k = 0; k < n; k++) { x.fillStyle = T.accent; x.globalAlpha = k === i ? 1 : 0.25; rr(x, dx, H * 0.86, k === i ? 34 : 14, 14, 7); x.fill(); dx += (k === i ? 34 : 14) + 12; } x.globalAlpha = 1;
  };
  // เสียง: เพลงเบา ๆ + ฟิ้วเบา ๆ ตอนเปลี่ยนหน้า
  const AC = window.AudioContext || window.webkitAudioContext; const ctx = new AC(); await ctx.resume().catch(() => {});
  const dest = ctx.createMediaStreamDestination();
  const buf = await renderMusic(music, Math.ceil(total + 1)).catch(() => null);
  const mime = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'].find((m) => window.MediaRecorder && MediaRecorder.isTypeSupported(m));
  if (!mime || !cv.captureStream) throw new Error('เครื่องนี้อัดวิดีโอจากแอปไม่ได้ ลองใช้ Chrome เวอร์ชันล่าสุด');
  const stream = cv.captureStream(30); dest.stream.getAudioTracks().forEach((tr) => stream.addTrack(tr));
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 }); const parts = []; rec.ondataavailable = (e) => e.data.size && parts.push(e.data); const done = new Promise((r) => { rec.onstop = r; });
  frame(0); rec.start(250); const t0 = ctx.currentTime;
  if (buf) { const src = ctx.createBufferSource(); src.buffer = buf; const g = ctx.createGain(); g.gain.value = 0.35; src.connect(g).connect(dest); src.connect(g); g.connect(ctx.destination); src.start(t0); }
  await new Promise((res) => { const loop = () => { const t = ctx.currentTime - t0; frame(t); onProgress?.(0.1 + 0.9 * Math.min(1, t / total)); if (t >= total) return res(); requestAnimationFrame(loop); }; requestAnimationFrame(loop); });
  rec.stop(); await done; stream.getTracks().forEach((t) => t.stop()); ctx.close().catch(() => {});
  return new Blob(parts, { type: mime.split(';')[0] });
}

/** ตรวจก่อนโพสต์ → [{i, level, msg, fix?}] */
export async function checkDeck(deck) {
  const out = [];
  for (let i = 0; i < deck.slides.length; i++) {
    const s = deck.slides[i]; const r = await renderSlide(s, deck, i);
    if (r.overflow) out.push({ i, level: 'warn', msg: 'ข้อความยาวเกินหน้า ตัวอักษรถูกย่อจนเล็ก', fix: 'split' });
    if ((s.title || '').length > 70) out.push({ i, level: 'info', msg: `หัวข้อยาว ${s.title.length} ตัวอักษร (อ่านบนมือถือยาก แนะนำไม่เกิน 60)` });
    if ((s.items || []).length > 6) out.push({ i, level: 'info', msg: `มี ${s.items.length} ข้อ แนะนำไม่เกิน 5–6 ข้อต่อหน้า`, fix: 'split' });
    if ((s.body || '').length > 220) out.push({ i, level: 'info', msg: 'เนื้อหายาว ลองตัดให้เหลือประเด็นเดียว', fix: 'split' });
    const small = r.blocks.filter((b) => b.size && b.size < 30 && b.key !== 'note' && !/^bars|^rows|^parts/.test(b.key)); if (small.length) out.push({ i, level: 'warn', msg: 'มีตัวอักษรเล็กกว่า 30px อาจอ่านไม่ออกในฟีด', fix: 'split' });
  }
  if (deck.slides.length > 10) out.push({ i: -1, level: 'info', msg: `มี ${deck.slides.length} หน้า (IG สูงสุด 20 · คนปัดจบมากที่สุดราว 7–10 หน้า)` });
  if (!deck.slides.some((s) => s.kind === 'cta')) out.push({ i: -1, level: 'info', msg: 'ยังไม่มีหน้าปิดท้ายชวนทัก' });
  return out;
}
