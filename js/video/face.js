// ─── มองกล้อง: สแกนหน้าในคลิป (MediaPipe Face Landmarker ทำในเครื่อง) ───
// ต่อเฟรม: หน้าตรงแค่ไหน (หันซ้าย-ขวา ก้ม-เงย) · กะพริบตา · สายตาเหลือบไปทางอื่น (เช่น อ่านโน้ต) · ยิ้ม · กรอบหน้า
// ใช้กับ: เลือกเทคที่มองกล้องดีกว่า · วางภาพแทรกทับช่วงที่ไม่ได้มองกล้อง · เลือกเฟรมปก · ตรวจซับทับหน้า
const VER = '0.10.14';
const LIB = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VER}`;
const MODEL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
let lm = null, loading = null;

export async function load() {
  if (lm) return lm; if (loading) return loading;
  loading = (async () => {
    const V = await import(/* @vite-ignore */ (window.__MPFACE || LIB) + '/vision_bundle.mjs');
    const fs = await V.FilesetResolver.forVisionTasks((window.__MPFACE || LIB) + '/wasm');
    lm = await V.FaceLandmarker.createFromOptions(fs, { baseOptions: { modelAssetPath: window.__MPFACE_MODEL || MODEL, delegate: 'CPU' }, runningMode: 'IMAGE', numFaces: 1, outputFaceBlendshapes: true });
    return lm;
  })();
  try { return await loading; } finally { loading = null; }
}

const clamp = (v) => Math.max(0, Math.min(1, v));
/** ผลของ 1 เฟรม → { s: คะแนนมองกล้อง 0..1, smile, blink, box } */
export function frameScore(res) {
  const L = res?.faceLandmarks?.[0]; if (!L) return { s: 0, smile: 0, blink: 0, box: null };
  const bs = Object.fromEntries((res.faceBlendshapes?.[0]?.categories || []).map((c) => [c.categoryName, c.score]));
  const nose = L[1], le = L[234], ri = L[454], top = L[10], chin = L[152];
  const yaw = (nose.x - le.x) / Math.max(1e-4, ri.x - le.x) - 0.5; // 0 = หน้าตรง
  const pitch = (nose.y - top.y) / Math.max(1e-4, chin.y - top.y) - 0.56;
  const blink = Math.min(bs.eyeBlinkLeft ?? 0, bs.eyeBlinkRight ?? 0);
  const look = Math.max(...['eyeLookOutLeft', 'eyeLookInLeft', 'eyeLookUpLeft', 'eyeLookDownLeft', 'eyeLookOutRight', 'eyeLookInRight', 'eyeLookUpRight', 'eyeLookDownRight'].map((k) => bs[k] ?? 0));
  const smile = ((bs.mouthSmileLeft ?? 0) + (bs.mouthSmileRight ?? 0)) / 2;
  let x0 = 1, y0 = 1, x1 = 0, y1 = 0; for (const p of L) { if (p.x < x0) x0 = p.x; if (p.x > x1) x1 = p.x; if (p.y < y0) y0 = p.y; if (p.y > y1) y1 = p.y; }
  const s = (1 - clamp((Math.abs(yaw) - 0.06) / 0.2)) * (1 - clamp((Math.abs(pitch) - 0.06) / 0.18)) * (blink > 0.5 ? 0.25 : 1) * (1 - 0.75 * clamp((look - 0.4) / 0.35));
  return { s: +s.toFixed(2), smile: +smile.toFixed(2), blink: +blink.toFixed(2), box: [x0, y0, x1, y1].map((v) => +v.toFixed(3)) };
}

/**
 * สแกนคลิป → { pts: [[t, s, smile]], box: [x0,y0,x1,y1] เฉลี่ย (สัดส่วนของภาพ) } หรือ null ถ้าไม่เจอหน้าเลย
 * step = ระยะห่างเฟรม (วินาที)
 */
export async function scanClip(url, { step = 0.33, onProgress } = {}) {
  const det = await load();
  const v = document.createElement('video'); v.muted = true; v.preload = 'auto'; v.playsInline = true; v.src = url;
  await new Promise((r) => { v.onloadeddata = r; v.onerror = r; setTimeout(r, 6000); });
  if (!v.videoWidth || !isFinite(v.duration)) return null;
  const W = 320, H = Math.round(W * v.videoHeight / v.videoWidth); const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  const pts = []; const boxes = []; const n = Math.max(1, Math.floor(v.duration / step));
  for (let i = 0; i <= n; i++) {
    const t = Math.min(v.duration - 0.05, i * step + 0.05);
    await new Promise((r) => { const done = () => { v.removeEventListener('seeked', done); r(); }; v.addEventListener('seeked', done); v.currentTime = t; setTimeout(done, 1200); });
    x.drawImage(v, 0, 0, W, H); let f;
    try { f = frameScore(det.detect(c)); } catch { f = { s: 0, smile: 0, box: null }; }
    pts.push([+t.toFixed(2), f.s, f.smile]); if (f.box) boxes.push(f.box);
    onProgress?.(i / n);
  }
  v.removeAttribute('src'); v.load();
  if (!boxes.length) return null;
  const box = [0, 1, 2, 3].map((k) => +(boxes.reduce((a, b) => a + b[k], 0) / boxes.length).toFixed(3));
  return { pts, box };
}

// ── ใช้ผลสแกน (ไม่ต้องโหลดโมเดล) ──
/** คะแนนมองกล้องเฉลี่ยในช่วงเวลาต้นฉบับ [a, b] ของคลิป → 0..1 หรือ null ถ้าไม่มีข้อมูล */
export function gazeIn(P, clip, a, b) {
  const g = P.gaze?.[clip]?.pts; if (!g?.length) return null;
  const xs = g.filter((p) => p[0] >= a - 0.1 && p[0] <= b + 0.1); if (!xs.length) return null;
  return xs.reduce((s, p) => s + p[1], 0) / xs.length;
}
/** ช่วงที่ไม่ได้มองกล้อง (เวลาในคลิปที่ส่งออก) ยาวอย่างน้อย minDur → [{t0, t1}] · sl = segList(P) */
export function lookAway(P, sl, { thr = 0.4, minDur = 1.0 } = {}) {
  const out = [];
  for (const s of sl) {
    const g = P.gaze?.[s.clip]?.pts; if (!g?.length) continue; let st = null;
    const close = (t) => { if (st != null && t - st >= minDur) out.push({ t0: +(s.o0 + st - s.a).toFixed(2), t1: +(s.o0 + t - s.a).toFixed(2) }); st = null; };
    for (const p of g) { if (p[0] < s.a || p[0] > s.b) continue; if (p[1] < thr) { if (st == null) st = p[0]; } else close(p[0]); }
    close(s.b);
  }
  return out;
}
/** เฟรมที่เหมาะทำปก (หน้าตรง ตาเปิด ยิ้ม) เวลาในคลิปที่ส่งออก → [t] ห่างกันอย่างน้อย gap วินาที */
export function coverTimes(P, sl, { n = 3, gap = 2, ok = () => true } = {}) {
  const cand = [];
  for (const s of sl) for (const p of P.gaze?.[s.clip]?.pts || []) if (p[0] >= s.a + 0.2 && p[0] <= s.b - 0.2) cand.push([s.o0 + p[0] - s.a, p[1] * 0.7 + p[2] * 0.3]);
  cand.sort((a, b) => b[1] - a[1]); const out = [];
  for (const [t, sc] of cand) { if (sc < 0.45) break; if (!ok(t)) continue; if (out.every((u) => Math.abs(u - t) >= gap)) out.push(+t.toFixed(2)); if (out.length >= n) break; }
  return out;
}
