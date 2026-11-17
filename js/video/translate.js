// ─── ซับภาษาอังกฤษ: แปลทีละประโยค (บรรทัดซับ) ทำในเครื่อง ───
// ลำดับ: ตัวแปลในตัวของ Chrome (ถ้ามี เร็ว ไม่ต้องโหลดเยอะ) → โมเดล NLLB-200 (ประมาณ 900MB แนะนำบนคอม)
// ก่อนแปล: แปลงศัพท์ประกันเป็นคำอังกฤษมาตรฐาน + แปลงตัวเลขคำไทยเป็นตัวเลข (ทดสอบแล้ว: ไม่ทำ "หนึ่งแสน" จะกลายเป็น "one thousand")
const TF = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.6';
const NLLB = 'Xenova/nllb-200-distilled-600M';

/** คีย์ของประโยค: ตัดช่องว่างและ * ออก */
export const keyOf = (s) => (s || '').replace(/[\s*]/g, '');
const vl = (s) => s.replace(/[ัิ-ฺ็-๎\s]/g, '').length;
const ENDS = /(ครับ|ค่ะ|คะ|นะ|เลย|ไหม|มั้ย|หรอ|เหรอ|จ้า|ด้วย|[?!])$/;
const STARTERS = /^(แต่|และ|เพราะ|ถ้า|หาก|ดังนั้น|ทีนี้|สรุป|ส่วน|ซึ่ง|เช่น|อย่าง|คุณ|เรา|ผม|หนู|พี่|ลอง|ทัก|รู้ไหม|ถึง)/;
const CONT_END = /(ที่|อยาก|จะ|ของ|กับ|ให้|ว่า|เพื่อ|และ|หรือ|แต่|เพราะ|คือ|ใน|การ|ความ|ไม่|ได้แก่)$/;
const CONT_START = /^(จะ|ที่|ของ|ใน|กับ|ให้|เพื่อ|สำหรับ|ไป|มา|ได้|แล้ว|อยู่|ด้วย|นะ|ครับ|ค่ะ|มาก|เลย|กัน|บาท|ปี|เดือน)/;
/**
 * ประโยคสำหรับแปล = รวมช่วงซับที่ต่อเนื่องกัน (ซับไทยแบ่งตามจังหวะหายใจ มักขาดกลางประโยค)
 * ตัดก่อนคำขึ้นต้นประโยค (แต่ และ เพราะ ถ้า คุณ…) · ไม่ตัดหลัง "ที่/อยาก/จะ…" หรือก่อน "จะ/ที่/ใน/สำหรับ…"
 * ตัดแน่นอนเมื่อ: ลงท้ายคำปิดประโยค · เว้นเงียบ ≥ 0.6 วิ · ยาวเกิน ~70 ตัวอักษร
 * → [{a, b, th, key, t0, t1}] (a..b = ช่วงดัชนี chunk)
 */
export function sentencesOf(chunks, { byLine = false } = {}) {
  const T = chunks.map((c) => c.text.replace(/\*/g, '').replace(/\s+/g, ' ').trim()); const out = []; let cur = null;
  chunks.forEach((c, i) => {
    if (!T[i]) return;
    if (cur) {
      const prev = T[cur.b], len = vl(cur.th), gap = c.t0 != null && chunks[cur.b].t1 != null ? c.t0 - chunks[cur.b].t1 : 0;
      const must = c.brk || (byLine && c.line !== chunks[cur.b].line) || ENDS.test(prev) || gap >= 0.6 || len + vl(T[i]) > 70;
      const keep = CONT_END.test(prev) || CONT_START.test(T[i]);
      const brk = must || (!keep && ((STARTERS.test(T[i]) && len >= 12) || len + vl(T[i]) > 56));
      if (!brk) { cur.b = i; cur.th += (/^[A-Za-z0-9]/.test(T[i]) || /[A-Za-z0-9]$/.test(cur.th) || c.line !== chunks[i - 1]?.line ? ' ' : '') + T[i]; return; }
    }
    cur = { a: i, b: i, th: T[i] }; out.push(cur);
  });
  out.forEach((x) => { x.th = x.th.replace(/\s+/g, ' ').trim(); x.key = keyOf(x.th); x.t0 = chunks[x.a].t0; x.t1 = chunks[x.b].t1; });
  return out;
}
export const linesOf = sentencesOf;
const sentOf = (P) => sentencesOf(P.chunks, { byLine: !P.words?.length }).filter((x) => x.key && x.t0 != null);
/**
 * คำแปลเก็บเป็นช่วงเวลา P.enSegs = [{t0, t1, th, key, en}] (ผูกกับเวลาเสียง ไม่ใช่ตัวหนังสือ
 * → แบ่งซับใหม่ แก้คำไทย หรือเปลี่ยนความยาวซับ คำแปลไม่หาย · ตัดคลิปแล้วเวลาย้ายตาม)
 */
export function enAt(P, t) {
  const S = P.enSegs; if (!S?.length) return null;
  for (let i = S.length - 1; i >= 0; i--) { const s = S[i]; if (s.t0 <= t + 0.02) return t < s.t1 + 0.05 && s.en ? s : null; }
  return null;
}
const overlap = (a, b) => Math.max(0, Math.min(a.t1, b.t1) - Math.max(a.t0, b.t0)) / Math.max(0.01, Math.min(a.t1 - a.t0, b.t1 - b.t0));
/** ประโยคที่ยังไม่มีคำแปล (ไม่มีช่วงคำแปลทับเกินครึ่ง) */
function uncovered(P) { const S = P.enSegs || []; return sentOf(P).filter((x) => !S.some((s) => overlap(s, x) > 0.5)); }
export const missing = (P) => uncovered(P).length;

// ── ศัพท์ประกัน/การเงิน (ยาวก่อนสั้น) ──
export const GLOSS = [
  ['ประกันโรคร้ายแรง', 'critical illness insurance'], ['โรคร้ายแรง', 'critical illness'], ['ประกันสุขภาพ', 'health insurance'], ['ประกันชีวิต', 'life insurance'], ['ประกันอุบัติเหตุ', 'accident insurance'], ['ประกันกลุ่ม', 'group insurance'], ['ประกันบำนาญ', 'annuity insurance'], ['ประกันออมทรัพย์', 'savings insurance'], ['ยูนิตลิงค์', 'unit-linked insurance'], ['ยูนิตลิงก์', 'unit-linked insurance'],
  ['ค่ารักษาพยาบาล', 'medical expenses'], ['ค่ารักษา', 'medical expenses'], ['ค่าห้อง', 'room and board'], ['ผู้ป่วยใน', 'inpatient'], ['ผู้ป่วยนอก', 'outpatient'], ['ระยะเวลารอคอย', 'waiting period'], ['โรคที่เป็นมาก่อน', 'pre-existing conditions'], ['โรคประจำตัว', 'pre-existing conditions'],
  ['เบี้ยประกัน', 'insurance premium'], ['ทุนประกัน', 'sum insured'], ['สัญญาเพิ่มเติม', 'rider'], ['กรมธรรม์', 'policy'], ['ผู้รับผลประโยชน์', 'beneficiary'], ['เคลม', 'claim'], ['ส่วนร่วมจ่าย', 'copayment'], ['ค่าใช้จ่ายส่วนแรก', 'deductible'],
  ['จ่ายก้อนเดียว', 'pays a lump sum'], ['เงินก้อน', 'lump sum'], ['ตรวจเจอ', 'diagnosed'], ['ลดหย่อนภาษี', 'tax deduction'], ['เงินคืน', 'cash back'], ['ครบสัญญา', 'at maturity'], ['วางแผนการเงิน', 'financial planning'], ['เงินเฟ้อ', 'inflation'], ['เงินสำรองฉุกเฉิน', 'emergency fund'], ['เกษียณ', 'retirement'],
  ['ทักมาคุย', 'message me to chat'], ['ทักมา', 'message me'], ['ทักแชท', 'send me a message'], ['บัดเจ็ต', 'budget'], ['คอนเทนต์', 'content'],
];
const FILLER = /(^|\s)(เอ่อ+|อ่า+|อืม+|แบบว่า)(?=\s|$)/g;
const PARTICLE = /(นะครับ|นะคะ|ครับผม|ครับ|ค่ะ|คะ|จ้า|จ้ะ)(?=\s|$|[?!])/g;

// ── ตัวเลขคำไทย → ตัวเลข ──
const DIG = { ศูนย์: 0, หนึ่ง: 1, เอ็ด: 1, สอง: 2, ยี่: 2, สาม: 3, สี่: 4, ห้า: 5, หก: 6, เจ็ด: 7, แปด: 8, เก้า: 9 };
const MUL = { สิบ: 10, ร้อย: 100, พัน: 1000, หมื่น: 1e4, แสน: 1e5 };
const NUMRE = new RegExp(`(?:(?:${Object.keys(DIG).join('|')})?(?:${Object.keys(MUL).join('|')})|(?:${Object.keys(DIG).join('|')}))+(?:ล้าน(?:(?:${Object.keys(DIG).join('|')})?(?:${Object.keys(MUL).join('|')})|(?:${Object.keys(DIG).join('|')}))*)*`, 'g');
function wordsToNum(s) {
  const re = new RegExp(`${Object.keys(DIG).join('|')}|${Object.keys(MUL).join('|')}`, 'g');
  return s.split('ล้าน').reduce((total, part, k, arr) => {
    let n = 0, d = null, m; while ((m = re.exec(part))) { const w = m[0]; if (w in DIG) d = DIG[w]; else { n += (d == null ? 1 : d) * MUL[w]; d = null; } }
    if (d != null) n += d; if (!n && k < arr.length - 1) n = 1;
    return total * 1e6 + n;
  }, 0);
}
const fmtN = (n) => (n >= 1e6 && n % 1e5 === 0 ? `${+(n / 1e6).toFixed(2)} million` : n.toLocaleString('en-US'));
export function thaiNumbers(s) {
  // ตัวเลข + หน่วยไทย: "1 แสน" "2.5 ล้าน" "3 หมื่น"
  s = s.replace(/(\d+(?:\.\d+)?)\s*(ล้าน|แสน|หมื่น|พัน)/g, (_, n, u) => ' ' + fmtN(+n * (u === 'ล้าน' ? 1e6 : MUL[u])) + ' ');
  // คำไทยล้วน ที่มีหน่วยนับ (สิบ ร้อย พัน หมื่น แสน ล้าน) หรือขึ้นต้นด้วยตัวเลขชัดเจน
  return s.replace(NUMRE, (m) => (/สิบ|ร้อย|พัน|หมื่น|แสน|ล้าน/.test(m) && new RegExp(Object.keys(DIG).join('|')).test(m) ? ' ' + fmtN(wordsToNum(m)) + ' ' : m));
}
export function prep(th, { gloss = true } = {}) {
  let s = th.replace(FILLER, ' ').replace(PARTICLE, '').replace(/[ๆ]/g, '');
  s = thaiNumbers(s);
  if (gloss) for (const [t, e] of GLOSS) s = s.split(t).join(' ' + e + ' ');
  return s.replace(/\s+/g, ' ').trim();
}
const looped = (s) => /\b(\w+)\b(?:[\s,]+\1\b){2,}/i.test(s) || /(.{6,}?)\1{2,}/.test(s);
export function post(en) {
  let s = (en || '').replace(/\s+/g, ' ').trim().replace(/\s+([,.!?])/g, '$1');
  s = s.replace(/\.$/, ''); // ซับโซเชียล: ไม่ใส่จุดท้ายประโยค
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

// ── แคชคำแปล (รวมที่ผู้ใช้แก้เอง) ──
const CK = 'advdesk.v1.trcache';
const readCache = () => { try { return JSON.parse(localStorage.getItem(CK) || '{}'); } catch { return {}; } };
const writeCache = (c) => { try { const e = Object.entries(c); localStorage.setItem(CK, JSON.stringify(Object.fromEntries(e.slice(-600)))); } catch {} };
export function remember(key, en, { user = false } = {}) { const c = readCache(); delete c[key]; c[key] = { en, user }; writeCache(c); }
export const cached = (key) => readCache()[key] || null;

// ── ตัวแปล ──
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
export async function chromeTranslator() {
  try { if (!('Translator' in self)) return null; const a = await withTimeout(self.Translator.availability({ sourceLanguage: 'th', targetLanguage: 'en' }), 2500); return !a || a === 'unavailable' ? null : a; } catch { return null; }
}
export const engines = async () => ({ chrome: await chromeTranslator(), nllb: true });
let nllb = null;
async function nllbPipe(onStatus, onProgress) {
  if (nllb) return nllb;
  onStatus?.('กำลังโหลดตัวแปลภาษา (ประมาณ 900MB ครั้งแรกเท่านั้น)…');
  const T = await import(/* @vite-ignore */ TF); T.env.allowLocalModels = false; const files = {};
  nllb = await T.pipeline('translation', NLLB, { dtype: 'q8', device: 'wasm', progress_callback: (p) => { if (p.status === 'progress' && p.total) { files[p.file] = [p.loaded, p.total]; const v = Object.values(files); onProgress?.(v.reduce((a, x) => a + x[0], 0) / v.reduce((a, x) => a + x[1], 0)); } } });
  return nllb;
}
async function makeEngine(kind, onStatus, onProgress) {
  if (window.__TRANSLATE) return { one: async (s) => (await window.__TRANSLATE([s]))[0] };
  if (kind === 'chrome') {
    onStatus?.('กำลังเตรียมตัวแปลของ Chrome…');
    const tr = await withTimeout(self.Translator.create({ sourceLanguage: 'th', targetLanguage: 'en', monitor: (m) => m.addEventListener('downloadprogress', (e) => onProgress?.(e.loaded)) }), 90000);
    return { one: (s) => withTimeout(tr.translate(s), 15000) };
  }
  const p = await nllbPipe(onStatus, onProgress);
  return { one: async (s) => { const n = s.split(/\s+/).length; const o = await p(s, { src_lang: 'tha_Thai', tgt_lang: 'eng_Latn', num_beams: 3, no_repeat_ngram_size: 3, repetition_penalty: 1.15, max_new_tokens: Math.min(120, 16 + n * 6) }); return o[0].translation_text; } };
}
/** แปลข้อความไทย 1 ประโยค (กันวนคำ: ถ้าวน แปลใหม่แบบไม่แทนศัพท์) */
async function translateOne(eng, th) {
  let en = await eng.one(prep(th));
  if (looped(en) || !en.trim()) { const b = await eng.one(prep(th, { gloss: false })); if (!looped(b)) en = b; else en = en.replace(/\b(\w+)\b(?:[\s,]+\1\b)+/gi, '$1'); }
  return post(en);
}

/**
 * แปลทุกประโยค → P.enSegs (ใช้คำแปลที่เคยแก้/เคยแปลไว้ก่อน) · force = แปลใหม่ทั้งหมด (ยกเว้นที่ผู้ใช้แก้เอง)
 * คืนจำนวนประโยคที่แปลใหม่
 */
export async function translateProject(P, { engine = 'auto', force = false, onStatus, onProgress } = {}) {
  const sents = force ? sentOf(P) : uncovered(P); const keep = force ? [] : (P.enSegs || []); const todo = []; const add = [];
  for (const x of sents) { const c = cached(x.key); const seg = { t0: x.t0, t1: x.t1, th: x.th, key: x.key, en: '' }; if (c && (!force || c.user)) seg.en = c.en; else todo.push(seg); add.push(seg); }
  const commit = () => { P.enSegs = [...keep, ...add].filter((s) => s.en).sort((a, b) => a.t0 - b.t0); };
  if (!todo.length) { commit(); return 0; }
  const kind = engine === 'auto' ? ((await chromeTranslator()) ? 'chrome' : 'nllb') : engine;
  let eng; try { eng = await makeEngine(kind, onStatus, onProgress); } catch (e) { if (kind !== 'chrome') throw e; eng = await makeEngine('nllb', onStatus, onProgress); }
  const fallback = async () => { if (kind === 'chrome' && !window.__TRANSLATE) eng = await makeEngine('nllb', onStatus, onProgress); else throw new Error('แปลไม่สำเร็จ'); };
  for (let k = 0; k < todo.length; k++) {
    onStatus?.(`กำลังแปลเป็นภาษาอังกฤษ… ${k + 1}/${todo.length}`); onProgress?.(k / todo.length);
    let en; try { en = await translateOne(eng, todo[k].th); } catch (e) { await fallback(); en = await translateOne(eng, todo[k].th); }
    todo[k].en = en; remember(todo[k].key, en);
  }
  commit(); onProgress?.(1); return todo.length;
}
/** เติมคำแปลจากแคชให้ประโยคที่ยังไม่มี → จำนวนที่ยังขาด */
export function fillFromCache(P) {
  const add = []; let miss = 0;
  for (const x of uncovered(P)) { const c = cached(x.key); if (c) add.push({ t0: x.t0, t1: x.t1, th: x.th, key: x.key, en: c.en }); else miss++; }
  if (add.length) P.enSegs = [...(P.enSegs || []), ...add].sort((a, b) => a.t0 - b.t0);
  return miss;
}
