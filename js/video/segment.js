// ─── ตัดคนออกจากฉากหลัง (MediaPipe Selfie Segmentation · Apache-2.0) ทำในเครื่อง ───
const BASE = () => window.__MPSEG || 'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1.1675465747/';
let seg = null, loading = null, busy = false, last = null, onMask = null;

export function ready() { return !!seg; }
export function load() {
  if (seg) return Promise.resolve(seg);
  if (loading) return loading;
  loading = new Promise((res, rej) => {
    const go = async () => {
      try {
        const s = new window.SelfieSegmentation({ locateFile: (f) => BASE() + f });
        s.setOptions({ modelSelection: 0, selfieMode: false });
        s.onResults((r) => { busy = false; last = r.segmentationMask; onMask?.(last); });
        await s.initialize(); seg = s; res(s);
      } catch (e) { loading = null; rej(e); }
    };
    if (window.SelfieSegmentation) return go();
    const sc = document.createElement('script'); sc.src = BASE() + 'selfie_segmentation.js'; sc.crossOrigin = 'anonymous';
    sc.onload = go; sc.onerror = () => { loading = null; rej(new Error('โหลดตัวตัดฉากหลังไม่ได้ (ต้องต่ออินเทอร์เน็ต)')); };
    document.head.append(sc);
  });
  return loading;
}
/** ส่งเฟรมไปหา mask (ไม่รอ) · คืน mask ล่าสุด */
export function update(el, cb) {
  if (cb) onMask = cb;
  if (!seg || busy || !el || (el.readyState ?? 4) < 2) return last;
  busy = true; seg.send({ image: el }).catch(() => { busy = false; });
  return last;
}
export const mask = () => last;
export function reset() { last = null; }
