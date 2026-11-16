// ─── คลังคอนเทนต์ 365 เรื่อง: โหลดตามหมวด · แปลงเป็นชุดสไลด์ · เรื่องของวัน ───
import { CATS } from '../data/studio.js';
import { compoundCompare, fvMonthly, retirement } from './engine/calc.js';
import { taxOnNet, marginalRate } from './engine/tax.js';

const FILES = { money: 'money', protect: 'protect', invest: 'invest', ai: 'ai', plan: 'plan', story: 'story', check: 'check' };
const cache = {};
export async function loadCat(c) { if (!cache[c]) cache[c] = (await import(`../data/lib/${FILES[c]}.js`)).default.map((it, i) => ({ ...it, c, id: c + String(i + 1).padStart(2, '0') })); return cache[c]; }
export async function loadAll() { const all = await Promise.all(Object.keys(FILES).map(loadCat)); return all.flat(); }

const fm = (n) => Math.round(n).toLocaleString('th-TH');
const short = (v) => (Math.abs(v) >= 1e6 ? (v / 1e6).toLocaleString('th-TH', { maximumFractionDigits: 2 }) + ' ล้าน' : fm(v));
/** กราฟที่คำนวณจริงจากสูตร (ไม่พิมพ์ตัวเลขเอง) */
function calcSlides(g) {
  if (g.k === 'cmp') { const { m = 3000, r = 4, a = 25, b = 35, e = 60 } = g; const R = compoundCompare({ monthly: m, rate: r, startA: a, startB: b, end: e });
    const xs = []; const pa = [], pb = []; for (let age = a; age <= e; age += Math.max(1, Math.round((e - a) / 7))) { xs.push('อายุ ' + age); pa.push(Math.round(fvMonthly(m, r, Math.max(0, age - a)))); pb.push(Math.round(fvMonthly(m, r, Math.max(0, age - b)))); }
    if (xs.at(-1) !== 'อายุ ' + e) { xs.push('อายุ ' + e); pa.push(Math.round(R.a)); pb.push(Math.round(R.b)); }
    return [{ kind: 'line', title: `ออมเดือนละ ${fm(m)} เริ่มอายุ ${a} กับ ${b}`, xl: xs, series: [{ name: 'เริ่มอายุ ' + a, pts: pa }, { name: 'เริ่มอายุ ' + b, pts: pb }], unit: 'บาท', note: `สมมติผลตอบแทน ${r}% ต่อปี · ตัวอย่างเพื่ออธิบาย ไม่ใช่การรับประกันผลตอบแทน` },
      { kind: 'stat', kicker: 'ต่างกันตอนอายุ ' + e, value: fm(R.diff), title: 'บาท', body: `ทั้งที่ออมต่างกันแค่ ${fm(R.paidA - R.paidB)} บาท` }]; }
  if (g.k === 'grow') { const { m = 2000, r = 4, ys = [5, 10, 20, 30] } = g;
    return [{ kind: 'bar', title: `ออมเดือนละ ${fm(m)} ผ่านไปแต่ละช่วง`, bars: ys.map((y) => ({ l: `${y} ปี (เงินต้น ${fm(m * 12 * y)})`, v: Math.round(fvMonthly(m, r, y)) })), unit: 'บาท', note: `สมมติผลตอบแทน ${r}% ต่อปี · ไม่ใช่การรับประกันผลตอบแทน` }]; }
  if (g.k === 'infl') { const { amt = 10000, r = 3, ys = [0, 10, 20, 30] } = g;
    return [{ kind: 'bar', title: `เงิน ${fm(amt)} บาท ซื้อของได้เท่าไรในอนาคต`, bars: ys.map((y) => ({ l: y ? `อีก ${y} ปี` : 'วันนี้', v: Math.round(amt / Math.pow(1 + r / 100, y)) })), hi: 0, unit: 'บาท', note: `สมมติเงินเฟ้อ ${r}% ต่อปี` }]; }
  if (g.k === 'split') { const { sal = 25000, p = [50, 30, 20], l = ['จำเป็น', 'ใช้ตามใจ', 'ออมและลงทุน'] } = g;
    return [{ kind: 'donut', title: `เงินเดือน ${fm(sal)} แบ่งยังไง`, parts: p.map((v, i) => ({ l: `${l[i]} ${fm(sal * v / 100)} บาท`, v })), center: fm(sal) }]; }
  if (g.k === 'debt') { const { bal = 50000, r = 16, pays = [2500, 5000] } = g; const months = (pay) => { let b = bal, n = 0, int = 0; while (b > 0 && n < 600) { const i = b * r / 100 / 12; int += i; b = b + i - pay; n++; if (pay <= i) return [Infinity, Infinity]; } return [n, int]; };
    return [{ kind: 'table', title: `หนี้ ${fm(bal)} บาท ดอกเบี้ย ${r}% ต่อปี`, cols: ['จ่ายต่อเดือน', 'กี่เดือนหมด', 'ดอกเบี้ยรวม'], rows: pays.map((pay) => { const [n, int] = months(pay); return [fm(pay), isFinite(n) ? n + ' เดือน' : 'ไม่หมด', isFinite(int) ? fm(int) : '—']; }), hi: 2, note: 'คำนวณแบบลดต้นลดดอก จ่ายเท่ากันทุกเดือน' }]; }
  if (g.k === 'ret') { const { age = 35, ra = 60, to = 85, m = 20000, inf = 3 } = g; const R = retirement({ age, retireAge: ra, lifeTo: to, monthlyNow: m, inflation: inf, returnPre: 4, returnPost: 3 });
    return [{ kind: 'stat', kicker: `ใช้เดือนละ ${fm(m)} วันนี้ ตอนอายุ ${ra} ต้องใช้เดือนละ`, value: fm(R.monthlyAtRetire), title: 'บาท เพราะของแพงขึ้นทุกปี', body: `สมมติเงินเฟ้อ ${inf}% ต่อปี` },
      { kind: 'stat', kicker: `เงินก้อนที่ควรมีตอนอายุ ${ra}`, value: short(R.need), title: `บาท ใช้ถึงอายุ ${to}`, body: `ถ้าเริ่มวันนี้ ออมเดือนละประมาณ ${fm(R.save)} บาท (สมมติผลตอบแทน 4% ต่อปี ไม่ใช่การรับประกัน)` }]; }
  if (g.k === 'retage') { const { ra = 60, to = 85, m = 20000, inf = 3, ages = [25, 35, 45] } = g;
    return [{ kind: 'bar', title: `อยากเกษียณอายุ ${ra} ต้องออมเดือนละเท่าไร`, bars: ages.map((a) => ({ l: `เริ่มตอนอายุ ${a}`, v: Math.round(retirement({ age: a, retireAge: ra, lifeTo: to, monthlyNow: m, inflation: inf, returnPre: 4, returnPost: 3 }).save) })), unit: 'บาท/เดือน', hi: ages.length - 1, note: `เป้า: ใช้เดือนละ ${fm(m)} (ค่าเงินวันนี้) ถึงอายุ ${to} · สมมติเงินเฟ้อ ${inf}% ผลตอบแทน 4% ต่อปี` }]; }
  if (g.k === 'taxsave') { const { ded = 100000, nets = [300000, 500000, 1000000, 2000000] } = g;
    return [{ kind: 'bar', title: `ลดหย่อนเพิ่ม ${fm(ded)} บาท ประหยัดภาษีได้เท่าไร`, bars: nets.map((n) => ({ l: `เงินได้สุทธิ ${fm(n)}`, v: Math.round(taxOnNet(n).tax - taxOnNet(Math.max(0, n - ded)).tax) })), unit: 'บาท', note: 'คิดจากอัตราภาษีเงินได้บุคคลธรรมดาแบบขั้นบันได · เงินได้สุทธิคือหลังหักค่าใช้จ่ายและลดหย่อนอื่นแล้ว' }]; }
  if (g.k === 'taxof') { const { nets = [150000, 300000, 500000, 750000, 1000000] } = g;
    return [{ kind: 'table', title: 'เงินได้สุทธิเท่านี้ เสียภาษีเท่าไร', cols: ['เงินได้สุทธิ/ปี', 'ภาษี', 'อัตราขั้นสูงสุด'], rows: nets.map((n) => [fm(n), fm(taxOnNet(n).tax), Math.round(marginalRate(n) * 100) + '%']), hi: 1, note: 'อัตราภาษีแบบขั้นบันได 0–35% · เงินได้สุทธิคือหลังหักค่าใช้จ่ายและค่าลดหย่อน' }]; }
  if (g.k === 'rates') { const { m = 3000, y = 20, rs = [1, 3, 5, 7] } = g;
    return [{ kind: 'bar', title: `ออมเดือนละ ${fm(m)} นาน ${y} ปี ที่ผลตอบแทนต่างกัน`, bars: rs.map((r) => ({ l: `เฉลี่ย ${r}% ต่อปี`, v: Math.round(fvMonthly(m, r, y)) })), unit: 'บาท', note: `เงินต้นรวม ${fm(m * 12 * y)} บาท · ตัวอย่างสมมติ ผลตอบแทนจริงไม่แน่นอนและอาจขาดทุนได้` }]; }
  if (g.k === 'fee') { const { m = 5000, y = 25, r = 6, fees = [0.5, 1.5, 2.5] } = g;
    return [{ kind: 'bar', title: `ค่าธรรมเนียมต่างกันนิดเดียว ผ่านไป ${y} ปี`, bars: fees.map((f) => ({ l: `ค่าธรรมเนียม ${f}% ต่อปี`, v: Math.round(fvMonthly(m, r - f, y)) })), hi: 0, unit: 'บาท', note: `ลงทุนเดือนละ ${fm(m)} สมมติผลตอบแทนก่อนหักค่าธรรมเนียม ${r}% ต่อปี · ไม่ใช่การรับประกันผลตอบแทน` }]; }
  return [];
}
/** แปลงสไลด์แบบย่อในคลัง → สไลด์เต็ม */
function S(t) {
  const [k, a, b, c, d, e] = t;
  switch (k) {
    case 'p': return [{ kind: 'point', title: a, body: b || '', hl: c }];
    case 'l': return [{ kind: 'list', title: a, items: b }];
    case 'c': return [{ kind: 'check', title: a, items: b, body: c || 'ติ๊กได้กี่ข้อ? คอมเมนต์บอกหน่อย' }];
    case 'm': return [{ kind: 'myth', myth: a, fact: b }];
    case 'b': return [{ kind: 'bar', title: a, bars: b.map(([l, v, tx]) => ({ l, v, ...(tx ? { t: tx } : {}) })), unit: c || '', note: d || '', ...(e != null ? { hi: e } : {}) }];
    case 'd': return [{ kind: 'donut', title: a, parts: b.map(([l, v]) => ({ l, v })), center: c || '', note: d || '' }];
    case 't': return [{ kind: 'table', title: a, cols: b, rows: c, ...(d != null ? { hi: d } : {}), note: e || '' }];
    case 'tl': return [{ kind: 'timeline', title: a, steps: b.map(([age, tt, dd]) => ({ a: age, t: tt, d: dd || '' })) }];
    case 'v': return [{ kind: 'versus', title: a, a: { h: b[0], items: b.slice(1) }, b: { h: c[0], items: c.slice(1) } }];
    case 'q': return [{ kind: 'qa', q: a, a: b, ...(c ? { who: c } : {}) }];
    case 's': return [{ kind: 'quote', title: a, body: b || '', hl: c }];
    case 'n': return [{ kind: 'stat', kicker: a, value: b, title: c, body: d || '', ...(e ? { src: e } : {}) }];
    case 'g': return calcSlides(a);
    default: return [];
  }
}
/** เรื่องในคลัง → ชุดสไลด์พร้อมแก้ */
export function buildDeck(it, { theme } = {}) {
  const C = CATS[it.c] || CATS.money; let n = 0;
  const mid = (it.s || []).flatMap(S).map((sl) => (sl.kind === 'point' ? { ...sl, num: ++n } : sl));
  const story = it.c === 'story';
  if (mid.length === 1 && !it.x) mid.push(mid[0].kind === 'check' ? { kind: 'point', num: '', title: 'ยังไม่ครบไม่เป็นไร', body: 'เลือก 1 ข้อที่ทำได้ภายในสัปดาห์นี้ แล้วเริ่มจากตรงนั้น' } : { kind: 'quote', title: 'รู้แล้ว ลองทำดู 1 อย่างในสัปดาห์นี้', body: 'ก้าวเล็กที่ทำจริง ดีกว่าแผนใหญ่ที่ยังไม่เริ่ม' });
  return { theme: theme || 'aom', tag: C.short, art: it.art || C.art, lib: it.id, cat: it.c, topic: it.t || '', hookStyle: it.hs || '', slides: [
    { kind: 'cover', kicker: it.k || C.name, title: it.h, hl: it.hl || '', body: it.sub || (mid.length ? 'ปัดอ่านต่อ ใช้เวลาไม่ถึง 1 นาที' : ''), ...(it.st ? { sticker: it.st } : {}) },
    ...mid,
    ...(it.x ? [{ kind: 'quote', title: it.x, body: story ? 'เรื่องเล่าตัวอย่างจากสถานการณ์ที่พบได้บ่อย' : 'สรุปสั้น ๆ' }] : []),
    { kind: 'cta', title: it.cta || C.cta, body: story ? 'บันทึกไว้ แล้วส่งให้คนที่คุณเป็นห่วง' : 'บันทึกโพสต์นี้ไว้ แล้วส่งให้คนที่ควรรู้' }] };
}
/** เรื่องของวัน: จันทร์ ออมเงิน · อังคาร ประกัน · พุธ ลงทุน · พฤหัส AI · ศุกร์ ภาษี/เกษียณ · เสาร์ เรื่องเล่า · อาทิตย์ เช็กลิสต์ */
export async function itemOfDay(d = new Date()) {
  const dow = d.getDay(); const c = Object.keys(CATS).find((k) => CATS[k].day === dow);
  const start = new Date(d.getFullYear(), 0, 1); const week = Math.floor((d - start) / 864e5 / 7);
  const list = await loadCat(c); return list[week % list.length];
}
export const catOfDay = (d = new Date()) => Object.keys(CATS).find((k) => CATS[k].day === d.getDay());
