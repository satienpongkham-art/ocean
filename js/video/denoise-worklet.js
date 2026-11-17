// ─── ลดเสียงรบกวนแบบเรียลไทม์ (spectral gating) ───
// FFT 1024 จุด ซ้อนกัน 75% · ประมาณระดับเสียงรบกวนแต่ละความถี่แบบติดตามค่าต่ำสุด (เสียงพัดลม แอร์ ซ่า ฮัม)
// ลดเฉพาะส่วนที่เป็นเสียงรบกวน มีพื้นขั้นต่ำกันเสียงพูดกลายเป็นเสียงหุ่นยนต์ · เกลี่ยตามเวลาและความถี่กัน "เสียงดนตรีเพี้ยน"
const N = 1024, HOP = 256, BINS = N / 2 + 1;

function makeFFT(n) {
  const lev = Math.log2(n); const rev = new Uint32Array(n); for (let i = 0; i < n; i++) { let r = 0; for (let b = 0; b < lev; b++) r |= ((i >> b) & 1) << (lev - 1 - b); rev[i] = r; }
  const cs = new Float32Array(n / 2), sn = new Float32Array(n / 2); for (let i = 0; i < n / 2; i++) { cs[i] = Math.cos(-2 * Math.PI * i / n); sn[i] = Math.sin(-2 * Math.PI * i / n); }
  return (re, im, inv) => {
    for (let i = 0; i < n; i++) { const j = rev[i]; if (j > i) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
    for (let size = 2; size <= n; size <<= 1) {
      const half = size >> 1, step = n / size;
      for (let i = 0; i < n; i += size) for (let j = 0, k = 0; j < half; j++, k += step) {
        const wr = cs[k], wi = inv ? -sn[k] : sn[k]; const a = i + j, b = a + half;
        const tr = re[b] * wr - im[b] * wi, ti = re[b] * wi + im[b] * wr;
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
      }
    }
  };
}

class Chan {
  constructor() {
    this.inBuf = new Float32Array(N); this.outBuf = new Float32Array(N); this.fill = 0; this.outQ = new Float32Array(0);
    this.re = new Float32Array(N); this.im = new Float32Array(N);
    this.S = new Float32Array(BINS); this.noise = new Float32Array(BINS); this.G = new Float32Array(BINS).fill(1); this.frames = 0;
    this.pending = new Float32Array(HOP); this.pn = 0; this.ready = []; this.readPos = 0; this.cur = null;
  }
}

class Denoise extends AudioWorkletProcessor {
  constructor(opt) {
    super(); this.fft = makeFFT(N); this.win = new Float32Array(N);
    for (let i = 0; i < N; i++) this.win[i] = Math.sqrt(0.5 - 0.5 * Math.cos(2 * Math.PI * i / N)); // sqrt-Hann ทั้งขาเข้าและขาออก
    this.ch = []; const po = opt?.processorOptions || {}; this.strength = po.strength ?? 1; this.on = po.on ?? true; this.ov = po.over; this.fl = po.floor;
    this.port.onmessage = (e) => { if (e.data.strength != null) { this.strength = e.data.strength; this.ov = this.fl = undefined; } if (e.data.on != null) this.on = e.data.on; };
  }
  frame(c) {
    const { re, im, S, noise, G } = c; const w = this.win;
    for (let i = 0; i < N; i++) { re[i] = c.inBuf[i] * w[i]; im[i] = 0; }
    this.fft(re, im, false);
    const first = c.frames < 4; c.frames++;
    const strong = this.strength > 1.5; const over = this.ov ?? (strong ? 2.2 : 1.6), floor = this.fl ?? (strong ? 0.1 : 0.15);
    const tmp = this._tmp || (this._tmp = new Float32Array(BINS));
    for (let k = 0; k < BINS; k++) {
      const p = re[k] * re[k] + im[k] * im[k];
      S[k] = first ? p : 0.65 * S[k] + 0.35 * p;
      // ติดตามระดับเสียงรบกวน: ลงเร็วเมื่อเบากว่า ขึ้นช้า ๆ (ประมาณ 3 dB ต่อวินาที)
      // เริ่มต่ำไว้ก่อน (เผื่อเริ่มกลางเสียงพูด) แล้วปรับขึ้นเร็วในวินาทีแรก
      if (first) noise[k] = S[k] * 0.1; else if (S[k] < noise[k]) noise[k] = 0.85 * noise[k] + 0.15 * S[k]; else noise[k] *= c.frames < 250 ? 1.01 : 1.0035;
      const g = Math.max(floor, 1 - over * noise[k] / (S[k] + 1e-12));
      tmp[k] = g;
    }
    for (let k = 0; k < BINS; k++) { // เกลี่ยข้ามความถี่ + ตามเวลา (เปิดเร็ว ปิดช้ากว่า)
      const g = (tmp[Math.max(0, k - 1)] + 2 * tmp[k] + tmp[Math.min(BINS - 1, k + 1)]) / 4;
      G[k] = g > G[k] ? 0.6 * g + 0.4 * G[k] : 0.25 * g + 0.75 * G[k];
      const gg = this.on ? G[k] : 1; re[k] *= gg; im[k] *= gg;
      if (k > 0 && k < N / 2) { re[N - k] = re[k]; im[N - k] = -im[k]; }
    }
    this.fft(re, im, true);
    const o = c.outBuf;
    for (let i = 0; i < N; i++) o[i] += (re[i] / N) * w[i] * 0.5; // sqrt-Hann² ซ้อน 75% รวมได้ 2
    const out = o.slice(0, HOP); o.copyWithin(0, HOP); o.fill(0, N - HOP);
    return out;
  }
  process(inputs, outputs) {
    const inp = inputs[0], out = outputs[0]; if (!out.length) return true;
    for (let ch = 0; ch < out.length; ch++) {
      const x = inp[ch] || inp[0]; const y = out[ch];
      if (!x) { y.fill(0); continue; }
      const c = this.ch[ch] || (this.ch[ch] = new Chan());
      for (let i = 0; i < x.length; i++) {
        // เลื่อนหน้าต่างขาเข้า
        c.pending[c.pn++] = x[i];
        if (c.pn === HOP) { c.inBuf.copyWithin(0, HOP); c.inBuf.set(c.pending, N - HOP); c.pn = 0; c.ready.push(this.frame(c)); }
        if (!c.cur || c.readPos >= HOP) { c.cur = c.ready.shift() || null; c.readPos = 0; }
        y[i] = c.cur ? c.cur[c.readPos++] : 0;
      }
    }
    return true;
  }
}
registerProcessor('aom-denoise', Denoise);
