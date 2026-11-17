// ─── ซับแบบมืออาชีพ: เวลาระดับตัวอักษรจากตัวถอดเสียง → คำ → ช่วงซับ ───
// หลักที่ใช้: ครบทุกคำ (ไม่ตัดคำทิ้ง) · ไม่ตัดกลางคำ · ไม่ทิ้งคำเชื่อมไว้ท้ายช่วง · ขึ้น-ลงตรงเสียงพูด · หายตอนเงียบ · ไม่สั้นจนอ่านไม่ทัน
const SEG = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter('th', { granularity: 'word' }) : null;
const GSEG = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter('th', { granularity: 'grapheme' }) : null;
const MARKS = /[ัิ-ฺ็-๎]/g;
export const vlen = (s) => s.replace(MARKS, '').length;
const r2 = (v) => Math.round(v * 100) / 100;

/** ผลจาก Whisper (return_timestamps:'word') → ตัวอักษรพร้อมเวลา [{c,t0,t1}] */
export function charsFromAsr(chunks, offset = 0) {
  const out = [];
  for (const k of chunks || []) {
    const a = (k.timestamp?.[0] ?? 0) + offset, b = Math.max(a, (k.timestamp?.[1] ?? a) + offset); const cs = [...(k.text || '')]; const n = cs.length || 1;
    cs.forEach((c, i) => out.push({ c, t0: a + (b - a) * i / n, t1: a + (b - a) * (i + 1) / n }));
  }
  return out;
}
/** ลบการวนคำ (หน่วย 1–12 ตัวอักษร ซ้ำติดกัน ≥4 ครั้ง) และข้อความหลอนท้ายคลิป */
export function cleanChars(chars) {
  let s = chars.map((x) => x.c).join(''); const keep = new Array(chars.length).fill(true);
  const re = /(.{1,12}?)\1{3,}/gs; let m;
  while ((m = re.exec(s))) { const unit = m[1].length; for (let i = m.index + unit; i < m.index + m[0].length; i++) keep[i] = false; }
  for (const h of ['ขอบคุณที่รับชม', 'โปรดติดตามตอนต่อไป', 'กดไลค์กดแชร์', 'Subtitles by']) { const i = s.lastIndexOf(h); if (i >= 0 && i > s.length - h.length - 6) for (let k = i; k < s.length; k++) keep[k] = false; }
  return chars.filter((_, i) => keep[i]);
}
/** พจนานุกรมคำแก้: [['ผิด','ถูก'], ...] แทนที่โดยคงช่วงเวลาเดิม */
export function applyDict(chars, pairs = []) {
  let out = chars;
  for (const [bad, good] of pairs) {
    if (!bad || bad === good) continue; const s = out.map((x) => x.c).join(''); const low = s.toLowerCase(); const b = bad.toLowerCase(); let from = 0, i; const res = []; let last = 0;
    while ((i = low.indexOf(b, from)) >= 0) {
      res.push(...out.slice(last, i)); const span = out.slice(i, i + [...bad].length); const a = span[0].t0, e = span[span.length - 1].t1; const g = [...good];
      g.forEach((c, k) => res.push({ c, t0: a + (e - a) * k / g.length, t1: a + (e - a) * (k + 1) / g.length }));
      last = i + [...bad].length; from = last;
    }
    if (last) { res.push(...out.slice(last)); out = res; }
  }
  return out;
}
export const BUILTIN_DICT = [['เอไอเอ', 'AIA'], ['เฮลท์แฮปปี้', 'Health Happy'], ['เฮลท์ แฮปปี้', 'Health Happy'], ['เฮลแฮปปี้', 'Health Happy'], ['ซีไอพลัส', 'CI Plus'], ['โอพีดี', 'OPD'], ['ไอพีดี', 'IPD'], ['ไอซียู', 'ICU'], ['โคเพย์เมนต์', 'Copayment'], ['โคเพย์', 'Copay'], ['ไวทัลลิตี้', 'Vitality'], ['เปอร์เซ็น ', 'เปอร์เซ็นต์ '], ['เอเดีย', 'ไอเดีย'], ['วัดเจ็ต', 'บัดเจ็ต'], ['บัดเจ็ด', 'บัดเจ็ต'], ['คอนเท้น', 'คอนเทนต์'], ['ติ๊กต็อก', 'TikTok'], ['ติ๊กต๊อก', 'TikTok'], ['เฟสบุ๊ค', 'Facebook'], ['เฟซบุ๊ก', 'Facebook'], ['ยูทูป', 'YouTube'], ['ไลน์โอเอ', 'LINE OA'], ['แพลนนิ่ง', 'Planning'], ['ยูนิตลิงค์', 'Unit Linked'], ['ยูนิตลิงก์', 'Unit Linked']];

const normCh = (c) => c.toLowerCase();
const skip = (c) => /[\s*.,!?…"'“”()\-–—:;]/.test(c);
/**
 * จับคู่ข้อความอ้างอิง (บทของเรา / ซับสดของ Google) กับตัวอักษรจากเสียง → ตัวอักษรของข้อความอ้างอิงพร้อมเวลา
 * คืน { chars, score } (score = สัดส่วนตัวอักษรที่จับคู่ได้ 0..1)
 */
export function alignText(ref, hyp) {
  const R = [...ref]; const ri = []; R.forEach((c, i) => { if (!skip(c)) ri.push(i); });
  const H = hyp.filter((x) => !skip(x.c)); const n = ri.length, m = H.length;
  if (!n || !m) return { chars: R.map((c) => ({ c, t0: 0, t1: 0 })), score: 0 };
  // Needleman–Wunsch แบบจำกัดแถบ (band) รอบเส้นทแยง
  const band = Math.max(60, Math.ceil(Math.abs(n - m) + Math.max(n, m) * 0.25)); const W = 2 * band + 1; const NEG = -1e9;
  const sc = new Int32Array((n + 1) * W).fill(NEG); const tr = new Uint8Array((n + 1) * W);
  const col = (i, j) => j - Math.round(i * m / n) + band; // ตำแหน่งในแถบ
  const get = (i, j) => { const k = col(i, j); return k < 0 || k >= W ? NEG : sc[i * W + k]; };
  for (let i = 0; i <= n; i++) {
    const c0 = Math.max(0, Math.round(i * m / n) - band), c1 = Math.min(m, Math.round(i * m / n) + band);
    for (let j = c0; j <= c1; j++) {
      const k = col(i, j); if (k < 0 || k >= W) continue; let best = NEG, t = 0;
      if (i === 0 && j === 0) { best = 0; }
      else {
        if (i > 0 && j > 0) { const v = get(i - 1, j - 1); if (v > NEG) { const s = v + (normCh(R[ri[i - 1]]) === normCh(H[j - 1].c) ? 2 : -1); if (s > best) { best = s; t = 1; } } }
        if (i > 0) { const v = get(i - 1, j); if (v > NEG && v - 1 > best) { best = v - 1; t = 2; } }
        if (j > 0) { const v = get(i, j - 1); if (v > NEG && v - 1 > best) { best = v - 1; t = 3; } }
      }
      sc[i * W + k] = best; tr[i * W + k] = t;
    }
  }
  const tm = new Array(n).fill(null); let i = n, j = m, hit = 0;
  while (i > 0 || j > 0) { const k = col(i, j); const t = k >= 0 && k < W ? tr[i * W + k] : (i > 0 ? 2 : 3); if (t === 1) { tm[i - 1] = H[j - 1]; if (normCh(R[ri[i - 1]]) === normCh(H[j - 1].c)) hit++; i--; j--; } else if (t === 2) i--; else if (t === 3) j--; else break; }
  // เติมเวลาให้ตัวที่จับคู่ไม่ได้ (เฉลี่ยระหว่างตัวข้างเคียง)
  const t0s = tm.map((x) => (x ? x.t0 : null)), t1s = tm.map((x) => (x ? x.t1 : null));
  const firstK = t0s.findIndex((v) => v != null); if (firstK < 0) return { chars: R.map((c) => ({ c, t0: 0, t1: 0 })), score: 0 };
  for (let k = 0; k < n; k++) if (t0s[k] == null) { let a = k - 1; while (a >= 0 && t1s[a] == null) a--; let b = k + 1; while (b < n && t0s[b] == null) b++; const ta = a >= 0 ? t1s[a] : t0s[firstK], tb = b < n ? t0s[b] : (a >= 0 ? t1s[a] : t0s[firstK]); const span = b - a; t0s[k] = ta + (tb - ta) * (k - a - 1) / Math.max(1, span - 1 || 1); t1s[k] = ta + (tb - ta) * (k - a) / Math.max(1, span - 1 || 1); if (t1s[k] < t0s[k]) t1s[k] = t0s[k]; }
  const out = R.map((c) => ({ c, t0: null, t1: null })); ri.forEach((idx, k) => { out[idx].t0 = t0s[k]; out[idx].t1 = t1s[k]; });
  let lastT = t0s[0]; for (const x of out) { if (x.t0 == null) { x.t0 = lastT; x.t1 = lastT; } else lastT = x.t1; }
  return { chars: out, score: hit / n };
}

/** ตัวอักษร → คำ [{w, t0, t1, sp}] (sp = มีช่องว่างนำหน้า = ขอบวลี) */
export function wordsFromChars(chars) {
  const text = chars.map((x) => x.c).join(''); const out = []; let pos = 0; let sp = false;
  const segs = SEG ? [...SEG.segment(text)].map((s) => s.segment) : text.split(/(\s+)/).filter(Boolean);
  for (const w of segs) {
    const n = [...w].length; const span = chars.slice(pos, pos + n); pos += n;
    if (!w.trim()) { sp = true; continue; }
    if (/^[.,!?…"'“”]+$/.test(w)) { if (out.length) out[out.length - 1].w += w; continue; }
    out.push({ w, t0: span[0].t0, t1: Math.max(span[span.length - 1].t1, span[0].t0 + 0.02), sp }); sp = false;
  }
  return out;
}
/** ขยับขอบคำที่ตกในช่วงเงียบ ให้ชิดขอบเสียงพูดจริง (ranges = [{a,b}] จากระดับเสียง) */
export function snapToSpeech(words, ranges) {
  if (!ranges?.length) return words;
  const inR = (t) => ranges.some((r) => t >= r.a - 0.02 && t <= r.b + 0.02);
  for (const w of words) {
    if (!inR(w.t0)) { const nx = ranges.find((r) => r.a > w.t0 && r.a - w.t0 < 0.9 && r.a < w.t1 + 0.3); if (nx) w.t0 = nx.a; }
    if (!inR(w.t1)) { const pv = [...ranges].reverse().find((r) => r.b < w.t1 && w.t1 - r.b < 0.9 && r.b > w.t0); if (pv) w.t1 = pv.b; }
    if (w.t1 < w.t0 + 0.04) w.t1 = w.t0 + 0.04;
  }
  for (let i = 1; i < words.length; i++) if (words[i].t0 < words[i - 1].t0) words[i].t0 = words[i - 1].t0;
  return words;
}

// คำที่ไม่ควรอยู่ท้ายช่วง (ต้องติดกับคำถัดไป) / ไม่ควรขึ้นต้นช่วง (ต้องติดกับคำก่อนหน้า)
const LEAD = new Set(['ที่', 'และ', 'หรือ', 'ของ', 'จะ', 'ไม่', 'การ', 'ความ', 'ใน', 'กับ', 'แต่', 'เพราะ', 'เพราะว่า', 'ถ้า', 'เพื่อ', 'ให้', 'คือ', 'ว่า', 'ก็', 'ยัง', 'ต้อง', 'ได้', 'อยู่', 'เป็น', 'มี', 'โดย', 'สำหรับ', 'จาก', 'ถึง', 'แล้วก็', 'หรือว่า', 'อย่าง', 'แบบ', 'ผู้', 'นัก', 'ค่า', 'อีก', 'ทุก', 'แค่', 'เกือบ', 'ประมาณ']);
const TRAIL = new Set(['ครับ', 'ค่ะ', 'คะ', 'นะ', 'นะครับ', 'นะคะ', 'เลย', 'ด้วย', 'อะ', 'อ่ะ', 'ล่ะ', 'สิ', 'ซิ', 'หรอ', 'เหรอ', 'ไหม', 'มั้ย', 'แหละ', 'เนอะ', 'ๆ', 'จ้า', 'จ้ะ', 'ฮะ', 'น่ะ', 'บาท', 'ปี', 'เดือน', 'วัน', 'คน', 'ล้าน', 'แสน', 'หมื่น', 'พัน', 'เปอร์เซ็นต์', '%', 'เท่า', 'ครั้ง']);

const COMPOUND = new Set(['สถานที่', 'หน้าที่', 'พื้นที่', 'เจ้าหน้าที่', 'ที่อยู่', 'ที่ปรึกษา', 'ภาพประกอบ', 'คลิปวิดีโอ', 'ประกันชีวิต', 'ประกันสุขภาพ', 'ประกันภัย', 'โรงพยาบาล', 'ค่ารักษา', 'ค่าห้อง', 'ค่าใช้จ่าย', 'เงินเดือน', 'เงินเก็บ', 'เงินออม', 'เงินสด', 'เงินเฟ้อ', 'ดอกเบี้ย', 'ลดหย่อนภาษี', 'ทรัพย์สิน', 'โรคร้ายแรง', 'โรคร้าย', 'ความคุ้มครอง', 'การลงทุน', 'การเงิน', 'วางแผน', 'ทุกวัน', 'ทุกคน', 'ทุกปี', 'ทุกเดือน', 'ตั้งนาน', 'มากพอ', 'ยังไง', 'อย่างไร', 'เท่าไร', 'เท่าไหร่', 'ทำไม', 'ตัวเอง', 'คุณเอง', 'เราเอง']);
/** รวมคำที่ตัวตัดคำแยกออกจากกัน แต่ควรอยู่ด้วยกัน */
function joinCompounds(words) {
  const out = [];
  for (const w of words) {
    const p = out[out.length - 1];
    if (p && !w.sp && w.t0 - p.t1 < 0.25 && (COMPOUND.has(p.w + w.w) || /^[0-9][0-9,.]*$/.test(p.w) && /^[0-9,.%]+$/.test(w.w) || w.w === 'ๆ' || /^[ะ-ฺ็-๎]/.test(w.w))) { p.w += w.w; p.t1 = w.t1; }
    else out.push({ ...w });
  }
  return out;
}
/**
 * คำ → ช่วงซับ · max = ตัวอักษรสูงสุดต่อช่วง
 * 1) แบ่งตรงที่เว้นหายใจ (≥ gap) เสมอ  2) วลีที่ยาวเกิน แบ่งเป็นส่วนเท่า ๆ กัน ณ จุดที่ "เสียน้อยที่สุด"
 *    (ไม่ทิ้งคำเชื่อมไว้ท้าย · ไม่ขึ้นต้นด้วยคำลงท้าย · ไม่แยกชิ้นคำสั้น ๆ · ชอบจุดที่มีช่องว่าง/เว้นจังหวะ)
 * คืน [{line, words:[{w,key,t0,t1}], text, t0, t1}]
 */
// เว้นวรรคระหว่างไทยกับอังกฤษ ตามแบบซับมืออาชีพ: "กับ SpaceX ตั้งนาน"
const TH = '[\u0E01-\u0E5B]', EN = '[A-Za-z]';
export const spaceMix = (s) => s.replace(new RegExp(`(${TH})(${EN})`, 'g'), '$1 $2').replace(new RegExp(`(${EN})(${TH})`, 'g'), '$1 $2');
const mixGap = (a, b) => (new RegExp(TH + '$').test(a) && new RegExp('^' + EN).test(b)) || (new RegExp(EN + '$').test(a) && new RegExp('^' + TH).test(b));
export function chunkWords(words0, { max = 14, gap = 0.3, lineGap = 0.55, lineMax = 34 } = {}) {
  const words = joinCompounds(words0); const groups = [];
  // 1) วลีตามจังหวะหายใจ
  const phrases = []; let cur = [];
  words.forEach((w, i) => { const prev = words[i - 1]; if (cur.length && (w.br || w.t0 - prev.t1 >= gap)) { phrases.push(cur); cur = []; } cur.push(w); });
  if (cur.length) phrases.push(cur);
  // 2) แบ่งวลียาวด้วย DP
  const L = (w) => vlen(w.w);
  for (const ph of phrases) {
    const n = ph.length; const tot = ph.reduce((a, w) => a + L(w), 0);
    if (tot <= max || n === 1) { groups.push(ph); continue; }
    const k = Math.ceil(tot / max); const target = tot / k; const pre = [0]; ph.forEach((w) => pre.push(pre[pre.length - 1] + L(w)));
    const brk = (i) => { // โทษของการแบ่งระหว่างคำ i-1 กับ i
      const a = ph[i - 1], b = ph[i]; let c = 0;
      if (LEAD.has(a.w)) c += 9; if (TRAIL.has(b.w)) c += 9;
      if (!LEAD.has(a.w) && !TRAIL.has(b.w) && !LEAD.has(b.w) && (L(a) <= 3 || L(b) <= 2) && !b.sp) c += 4;
      if (b.sp) c -= 6; c -= Math.min(6, (b.t0 - a.t1) * 25);
      return c;
    };
    const INF = 1e9; const best = Array.from({ length: n + 1 }, () => new Array(k + 1).fill(INF)); const from = Array.from({ length: n + 1 }, () => new Array(k + 1).fill(-1)); best[0][0] = 0;
    for (let j = 1; j <= k; j++) for (let i = j; i <= n; i++) for (let p = j - 1; p < i; p++) {
      if (best[p][j - 1] >= INF) continue; const len = pre[i] - pre[p]; if (len > max + 5) continue;
      const cost = best[p][j - 1] + Math.pow((len - target) / target, 2) * 12 + (i < n ? brk(i) : 0);
      if (cost < best[i][j]) { best[i][j] = cost; from[i][j] = p; }
    }
    let kk = k; if (best[n][kk] >= INF) { // แบ่ง k ส่วนไม่ได้ (คำยาวมาก) → ตัดแบบเรียงไป
      let g = [], len = 0; for (const w of ph) { if (g.length && len + L(w) > max) { groups.push(g); g = []; len = 0; } g.push(w); len += L(w); } if (g.length) groups.push(g); continue;
    }
    const cuts = []; let i = n; while (kk > 0) { const p = from[i][kk]; cuts.unshift([p, i]); i = p; kk--; }
    for (const [a, b] of cuts) groups.push(ph.slice(a, b));
  }
  // ช่วงสั้นมาก (≤3 ตัวอักษร) รวมกับช่วงข้างเคียงที่ไม่เว้นหายใจ
  for (let g = groups.length - 1; g >= 0; g--) {
    const a = groups[g]; const txt = a.map((w) => w.w).join(''); const flash = a[a.length - 1].t1 - a[0].t0 < 0.4; if (vlen(txt) > 3 && !flash) continue;
    const p = groups[g - 1], n = groups[g + 1]; const gp = flash ? Math.max(gap, 0.6) : gap;
    if (n && flash && n[0].t0 - a[a.length - 1].t1 < gp && (!p || n[0].t0 - a[a.length - 1].t1 <= a[0].t0 - p[p.length - 1].t1) && vlen(n.map((w) => w.w).join('')) + vlen(txt) <= max + 6) { n.unshift(...a); groups.splice(g, 1); }
    else if (p && a[0].t0 - p[p.length - 1].t1 < gp && vlen(p.map((w) => w.w).join('')) + vlen(txt) <= max + 6) { p.push(...a); groups.splice(g, 1); }
    else if (n && n[0].t0 - a[a.length - 1].t1 < gp && vlen(n.map((w) => w.w).join('')) + vlen(txt) <= max + 6) { n.unshift(...a); groups.splice(g, 1); }
  }
  // บรรทัด (ช็อต): เว้นหายใจยาว หรือสะสมยาวพอแล้วเจอขอบวลี
  let line = 0, lineLen = 0; const out = [];
  groups.forEach((g, i) => {
    const pg = groups[i - 1]; const pause = pg ? g[0].t0 - pg[pg.length - 1].t1 : 0; const txtLen = vlen(g.map((w) => w.w).join(''));
    if (pg && (g[0].br || pause >= lineGap || ((g[0].sp || pause >= gap) && lineLen >= 14) || lineLen + txtLen > lineMax)) { line++; lineLen = 0; }
    lineLen += txtLen;
    const ws = g.map((w, k2) => ({ w: (k2 && (w.sp || mixGap(g[k2 - 1].w, w.w)) ? ' ' : '') + spaceMix(w.w), key: false, t0: r2(w.t0), t1: r2(w.t1) }));
    out.push({ line, words: ws, text: ws.map((w) => w.w).join(''), t0: g[0].t0, t1: g[g.length - 1].t1, ...(g[0].br || (pg && pause >= 0.6) ? { brk: 1 } : {}) });
  });
  return timeChunks(out);
}
/** เวลาขึ้น-ลงของแต่ละช่วง: นำเสียงเล็กน้อย · ค้างต่อถึงช่วงถัดไปถ้าพูดต่อเนื่อง · หายตอนเงียบ · ไม่สั้นกว่า 0.45 วิ */
export function timeChunks(ch, { lead = 0.05, hold = 0.22, joinGap = 0.45, minDur = 0.45 } = {}) {
  const lastT = (c) => { for (let k = c.words.length - 1; k >= 0; k--) if (c.words[k].t1 != null) return c.words[k].t1; return c.t1; };
  const firstW = (c) => c.words.find((w) => w.t0 != null) || { t0: c.t0, t1: c.t0 + 0.3 };
  ch.forEach((c, i) => {
    const n = ch[i + 1]; const start = Math.max(i ? ch[i - 1].t1 : 0, c.t0 - lead); const endSpeech = lastT(c);
    let end = n ? (n.t0 - lead - endSpeech < joinGap ? n.t0 - lead : endSpeech + hold) : endSpeech + hold + 0.15;
    if (end - start < minDur) end = n ? Math.min(Math.max(end, start + minDur), Math.max(end, firstW(n).t0 + (firstW(n).t1 - firstW(n).t0) * 0.3)) : start + minDur;
    c.t0 = r2(start); c.t1 = r2(Math.max(end, start + 0.2));
  });
  for (let i = 1; i < ch.length; i++) if (ch[i].t0 < ch[i - 1].t1) { const mid = r2((ch[i].t0 + ch[i - 1].t1) / 2); ch[i - 1].t1 = Math.max(ch[i - 1].t0 + 0.15, Math.min(ch[i - 1].t1, firstW(ch[i]).t0)); ch[i].t0 = Math.max(ch[i - 1].t1, Math.min(mid, ch[i].t0)); }
  return ch;
}
/** บทของเรา (มีบรรทัด/คำเด่นอยู่แล้ว) + ตัวอักษรจากเสียง → ช่วงซับของบท พร้อมเวลาจริง · chunks มาจาก parseScript */
export function alignChunks(chunks, hypChars) {
  const ref = chunks.map((c) => c.text).join('\u0001'); const { chars, score } = alignText(ref.replace(/\u0001/g, ' '), hypChars);
  let pos = 0; const out = chunks.map((c) => {
    const words = c.words.map((w) => { const n = [...w.w].length; const span = chars.slice(pos, pos + n).filter((x) => !skip(x.c)); pos += n; return span.length ? { ...w, t0: r2(span[0].t0), t1: r2(Math.max(span[span.length - 1].t1, span[0].t0 + 0.02)) } : { ...w }; });
    pos += 1; // ตัวคั่นช่วง
    const tw = words.filter((w) => w.t0 != null); return { ...c, words, t0: tw.length ? tw[0].t0 : null, t1: tw.length ? tw[tw.length - 1].t1 : null };
  });
  // ช่วงที่ไม่มีเวลา (ไม่น่าเกิด) ใช้เวลาของช่วงก่อนหน้า
  out.forEach((c, i) => { if (c.t0 == null) { const p = out[i - 1]; c.t0 = p ? p.t1 : 0; c.t1 = c.t0 + 0.6; } });
  return { chunks: timeChunks(out), score };
}
export const graphemes = (s) => (GSEG ? [...GSEG.segment(s)].map((g) => g.segment) : [...s]);
