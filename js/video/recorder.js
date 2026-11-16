// ─── อัดคลิปในแอป: กล้อง 9:16 + ซับสดภาษาไทย (ระบบฟังเสียงของ Chrome) + บทเลื่อนตามเสียงพูด ───
import { h, icon, toast } from '../ui.js';
import { visLen } from './engine.js';

const SR = () => window.SpeechRecognition || window.webkitSpeechRecognition;
export const liveSupported = () => !!SR();
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** เปิดหน้าอัด → resolve({ file, live: [{text,s,e}], liveOk }) หรือ null ถ้าปิด */
export function openRecorder({ script = '' } = {}) {
  return new Promise((resolve) => {
    let facing = 'user', stream = null, mr = null, parts = [], t0 = 0, timer = null, rec = null, recording = false, liveOk = !!SR(), lock = null, closed = false;
    const live = []; const seen = {}; let session = 0, interim = '';
    const video = h('video.rc-video', { playsInline: true, muted: true, autoplay: true });
    const time = h('b.rc-time', '0:00');
    const chip = h('span.rc-chip', liveOk ? 'ซับสด: พร้อม' : 'ซับสด: เบราว์เซอร์นี้ไม่รองรับ (จะเขียนซับหลังอัด)');
    const subs = h('div.rc-subs', { 'aria-live': 'polite' });
    const lines = script.split('\n').map((l) => l.replace(/\*/g, '').trim()).filter(Boolean);
    const tp = h('div.rc-tp', lines.map((l) => h('p', l)));
    const cum = []; lines.reduce((a, l, i) => (cum[i] = a + visLen(l)), 0);
    const count = h('div.rc-count');
    const recBtn = h('button.rc-rec', { 'aria-label': 'เริ่ม/หยุดอัด', onclick: () => (recording ? stop() : countdown()) }, h('i'));
    const flipBtn = h('button.rc-ic', { 'aria-label': 'สลับกล้อง', onclick: () => { if (recording) return; facing = facing === 'user' ? 'environment' : 'user'; start(); } }, icon('sync'));
    const closeBtn = h('button.rc-ic', { 'aria-label': 'ปิด', onclick: () => close(null) }, icon('close'));
    const ov = h('div.rc', { role: 'dialog', 'aria-label': 'อัดคลิป' },
      video, h('div.rc-top', closeBtn, h('div.rc-mid', h('span.rc-dot'), time), flipBtn), lines.length ? tp : null, chip, subs, count,
      h('div.rc-bottom', h('small', 'ถือแนวตั้ง · แสงเข้าหน้า · พูดได้เลย ตัดช่วงเงียบ/พูดผิดให้ทีหลัง'), recBtn));
    document.body.append(ov); document.body.style.overflow = 'hidden';

    async function start() {
      stream?.getTracks().forEach((t) => t.stop());
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 1080 }, height: { ideal: 1920 }, aspectRatio: { ideal: 9 / 16 }, frameRate: { ideal: 30 } }, audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      } catch (e) { toast('เปิดกล้อง/ไมค์ไม่ได้ — อนุญาตการใช้กล้องในเบราว์เซอร์ก่อน'); close(null); return; }
      video.srcObject = stream; video.classList.toggle('mirror', facing === 'user'); video.play().catch(() => {});
    }
    function countdown() { let n = 3; count.textContent = n; count.classList.add('on'); const iv = setInterval(() => { n--; if (n > 0) count.textContent = n; else { clearInterval(iv); count.classList.remove('on'); begin(); } }, 700); }
    function begin() {
      if (!stream) return;
      const mime = ['video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find((m) => MediaRecorder.isTypeSupported(m)) || '';
      parts = []; mr = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), videoBitsPerSecond: 8_000_000 });
      mr.ondataavailable = (e) => { if (e.data?.size) parts.push(e.data); };
      mr.onstart = () => { t0 = performance.now(); };
      mr.onstop = finish;
      mr.start(500); t0 = performance.now(); recording = true; ov.classList.add('recording');
      navigator.wakeLock?.request('screen').then((l) => { lock = l; }).catch(() => {});
      timer = setInterval(() => { const s = (performance.now() - t0) / 1000; time.textContent = fmt(s); if (s > 180) stop(); }, 250);
      if (liveOk) listen();
    }
    function listen() {
      const R = SR(); if (!R || !recording) return;
      rec = new R(); rec.lang = 'th-TH'; rec.continuous = true; rec.interimResults = true; rec.maxAlternatives = 1; const sid = ++session;
      rec.onresult = (e) => {
        const now = (performance.now() - t0) / 1000; interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i]; const k = sid + ':' + i; if (seen[k] == null) seen[k] = now;
          if (r.isFinal) { if (seen[k] !== -1) { live.push({ text: r[0].transcript.trim(), s: Math.max(0, seen[k] - 0.4), e: Math.max(seen[k], now - 0.3) }); seen[k] = -1; } }
          else interim += r[0].transcript;
        }
        const last = live.slice(-1)[0]?.text || ''; subs.textContent = interim || last; chip.textContent = 'ซับสด: กำลังฟัง';
        follow(live.reduce((a, x) => a + visLen(x.text), 0) + visLen(interim));
      };
      rec.onerror = (e) => { if (['not-allowed', 'service-not-allowed', 'audio-capture', 'network'].includes(e.error)) { liveOk = false; chip.textContent = 'ซับสดใช้ไม่ได้ในเครื่องนี้ — จะเขียนซับหลังอัดให้'; } };
      rec.onend = () => { if (recording && liveOk && sid === session) setTimeout(listen, 120); };
      try { rec.start(); } catch { liveOk = false; }
    }
    function follow(n) { if (!lines.length) return; let i = cum.findIndex((c) => c >= n * 0.92); if (i < 0) i = lines.length - 1; [...tp.children].forEach((p, k) => p.classList.toggle('on', k === i)); tp.children[i]?.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
    function stop() { if (!recording) return; recording = false; clearInterval(timer); ov.classList.remove('recording'); try { rec?.stop(); } catch {} mr?.stop(); lock?.release?.().catch(() => {}); }
    function finish() {
      const type = (mr.mimeType || 'video/webm').split(';')[0]; const blob = new Blob(parts, { type });
      const ext = type.includes('mp4') ? 'mp4' : 'webm'; const d = new Date(); const name = `อัดในแอป-${d.getHours()}${String(d.getMinutes()).padStart(2, '0')}.${ext}`;
      close({ file: new File([blob], name, { type }), live: live.filter((x) => x.text), liveOk: liveOk && live.length > 0 });
    }
    function close(v) { if (closed) return; closed = true; recording = false; clearInterval(timer); try { rec?.abort(); } catch {} stream?.getTracks().forEach((t) => t.stop()); ov.remove(); document.body.style.overflow = ''; resolve(v); }
    if (lines.length) follow(0);
    start();
  });
}
