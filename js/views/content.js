// ─── ปฏิทินคอนเทนต์รายเดือน + ภาพทิปการเงิน (แบรนด์ส่วนตัว) ───
import { h, icon, choices, toast, copyText, more, todayISO, isoDate, dateTH } from '../ui.js';
import * as store from '../store.js';
import { PILLARS, FORMATS, IDEAS, SEASONS, TIPS } from '../../data/content.js';
import { PLAN } from '../../data/plans.js';
import { profile, rerender } from '../app.js';

const PIL = Object.fromEntries(PILLARS.map((p) => [p.id, p]));
const TAGS = { protect: '#ประกันสุขภาพ #วางแผนความคุ้มครอง', money: '#วางแผนการเงิน #ออมเงิน', biz: '#ผู้ประกอบการ #ฟรีแลนซ์', tech: '#AIช่วยงาน #เทคโนโลยีการเงิน', story: '#ที่ปรึกษาการเงิน #เรื่องจริง' };
const ROT = ['protect', 'money', 'tech', 'protect', 'biz', 'money', 'story']; // ให้ความรู้ ~80% · เรื่องจริง/ชวนคุย ~20%
const DAYS = { 3: [1, 3, 5], 5: [1, 2, 3, 4, 5], 7: [0, 1, 2, 3, 4, 5, 6] };

/** สร้างแผนคอนเทนต์ของเดือน (ผลเหมือนเดิมทุกครั้งสำหรับเดือนเดียวกัน) */
export function monthPlan(y, m, perWeek = 3) {
  const days = DAYS[perWeek] || DAYS[3]; const out = []; const last = new Date(y, m + 1, 0).getDate();
  const [theme, themePil] = SEASONS[m + 1] || ['', 'money'];
  let k = 0; const used = {};
  for (let d = 1; d <= last; d++) {
    const dt = new Date(y, m, d); if (!days.includes(dt.getDay())) continue;
    const week = Math.floor((d - 1) / 7);
    let pil = ROT[(k + m) % ROT.length];
    const firstOfWeek = !out.some((x) => x.week === week);
    if (firstOfWeek && week < 4) pil = themePil;
    const list = IDEAS[pil]; used[pil] = (used[pil] ?? (y * 7 + m * 3) % list.length);
    let idea = list[used[pil] % list.length]; used[pil]++;
    if (week === 3 && dt.getDay() === 5) idea = IDEAS.story.find((x) => x.format === 'live') || idea, pil = 'story';
    out.push({ date: isoDate(dt), week, pil, theme: firstOfWeek ? theme : '', ...idea });
    k++;
  }
  return out;
}
export function todayContent() {
  const t = new Date(); const per = store.getSettings().contentPerWeek || 3;
  return monthPlan(t.getFullYear(), t.getMonth(), per).find((x) => x.date === todayISO()) || null;
}
export function caption(it) {
  const p = profile();
  return [it.hook, '', ...it.points.map((x) => '✅ ' + x), '', '👉 ' + it.cta, '', TAGS[it.pil] || '',
    `—\n${p.name}${p.nick ? ' (' + p.nick + ')' : ''} · ${p.title}${p.licenseLife ? ' · ใบอนุญาตเลขที่ ' + p.licenseLife : ''}${p.line ? ' · LINE ' + p.line : ''}`].join('\n');
}

const cal = {};
export function renderContent() {
  const t = new Date(); if (cal.y == null) { cal.y = t.getFullYear(); cal.m = t.getMonth(); }
  const s = store.getSettings(); const per = s.contentPerWeek || 3; const done = s.contentDone || {};
  const plan = monthPlan(cal.y, cal.m, per);
  const nDone = plan.filter((x) => done[x.date]).length;
  const go = (dm) => { const d = new Date(cal.y, cal.m + dm, 1); cal.y = d.getFullYear(); cal.m = d.getMonth(); rerender(); };
  const cnt = Object.fromEntries(PILLARS.map((p) => [p.id, plan.filter((x) => x.pil === p.id).length]));
  const card = (it) => h('div.cc-item', { class: done[it.date] ? 'done' : '', style: { '--pc': PIL[it.pil].color } },
    h('div.cc-top', h('b', dateTH(it.date, true)), h('span.cc-pil', icon(PIL[it.pil].icon), PIL[it.pil].name), h('span.tag', FORMATS[it.format] || it.format)),
    it.theme ? h('div.cc-theme', '📅 ธีมเดือนนี้: ' + it.theme) : null,
    h('div.cc-hook', it.hook),
    h('ul', it.points.map((x) => h('li', x))),
    h('div.small', h('b', 'ปิดท้าย: '), it.cta, it.plan && PLAN[it.plan] ? [' · ', h('a', { href: '#/plan/' + it.plan }, 'แผนที่เกี่ยวข้อง: ' + PLAN[it.plan].short)] : null),
    h('div.cc-acts',
      h('button.btn.sm.primary', { onclick: () => import('./studio.js').then((m) => { const x = m.createItem(m.GEN.idea(it, it.pil), { pillar: it.pil, title: it.hook }); store.put('content', { ...x, date: it.date }); location.hash = '#/studio/' + x.id; }) }, icon('pen'), 'ทำในสตูดิโอ'),
      h('button.btn.sm', { onclick: () => copyText(caption(it)) }, icon('copy'), 'คัดลอกแคปชั่น'),
      ['tip', 'carousel'].includes(it.format) ? h('a.btn.sm', { href: '#/tools/tipcard?t=' + encodeURIComponent(it.hook) + '&b=' + encodeURIComponent(it.points.join(' · ')) }, icon('pen'), 'ทำภาพ') : null,
      h('button.btn.sm' + (done[it.date] ? '.primary' : ''), { 'aria-pressed': String(!!done[it.date]), onclick: () => store.saveSettings({ contentDone: { ...done, [it.date]: !done[it.date] } }) }, icon('check'), done[it.date] ? 'โพสต์แล้ว' : 'ทำเครื่องหมายว่าโพสต์แล้ว')));
  const weeks = [...new Set(plan.map((x) => x.week))];
  return h('div', { 'data-title': 'ปฏิทินคอนเทนต์' },
    h('div.back-row', h('a.icon-btn', { href: '#/tools', 'aria-label': 'กลับ' }, icon('back')), h('div', { style: { flex: 1 } }, h('h1.serif', { style: { fontSize: '22px' } }, 'ปฏิทินคอนเทนต์'), h('div.small.muted', 'วางแผนโพสต์ทั้งเดือน ตามหัวข้อที่คุณถนัด')), h('a.btn.sm', { href: '#/tools/tipcard' }, icon('pen'), 'ภาพทิป')),
    h('div.card.cc-head',
      h('div.row.between', h('button.icon-btn', { onclick: () => go(-1), 'aria-label': 'เดือนก่อน' }, icon('back')), h('div', { style: { textAlign: 'center' } }, h('b.serif', { style: { fontSize: '19px' } }, new Date(cal.y, cal.m, 1).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })), h('div.small.muted', `ธีม: ${SEASONS[cal.m + 1]?.[0] || '—'} · โพสต์แล้ว ${nDone}/${plan.length}`)), h('button.icon-btn', { onclick: () => go(1), 'aria-label': 'เดือนถัดไป' }, icon('next'))),
      h('div.q', { style: { marginTop: '8px' } }, h('span.ql', 'โพสต์ต่อสัปดาห์'), choices('pw', String(per), [['3', '3 ครั้ง (แนะนำเริ่ม)'], ['5', '5 ครั้ง'], ['7', 'ทุกวัน']], { onChange: (v) => store.saveSettings({ contentPerWeek: +v }) })),
      h('div.cc-bar', { 'aria-label': 'สัดส่วนหัวข้อ' }, PILLARS.map((p) => cnt[p.id] ? h('i', { style: { flex: cnt[p.id], background: p.color }, title: `${p.name} ${cnt[p.id]}` }) : null)),
      h('div.cc-legend', PILLARS.map((p) => h('span', h('i', { style: { background: p.color } }), `${p.name} ${cnt[p.id]}`))),
      more('หลักที่ใช้วางแผน (ทำไมแบบนี้ได้ผล)', h('ul.whatsnew',
        h('li', h('b', 'หัวข้อหลัก 5 เรื่องที่คุณรู้จริง: '), 'ประกัน · การเงิน · ผู้ประกอบการ · IT/AI · เรื่องจริง คนติดตามเพราะรู้ว่าจะได้อะไรจากเรา'),
        h('li', h('b', 'ให้ความรู้ 80% ชวนคุย/ขาย 20%: '), 'ความน่าเชื่อถือมาก่อนการขาย'),
        h('li', h('b', 'ฮุก → คุณค่า → ปิดท้าย: '), '3 วินาทีแรกต้องหยุดนิ้ว เนื้อหาเดียวต่อโพสต์ แล้วบอกให้คนทำอะไรต่อ'),
        h('li', h('b', 'สม่ำเสมอสำคัญกว่าความถี่: '), 'เริ่ม 3 โพสต์/สัปดาห์ให้ได้ทั้งเดือน แล้วค่อยเพิ่ม'),
        h('li', h('b', 'ธีมตามช่วงเวลา: '), 'ต้นสัปดาห์ใช้เรื่องที่คนกำลังสนใจในเดือนนั้น (ภาษี หน้าฝน เปิดเทอม ฯลฯ)'),
        h('li', h('b', 'ตามกฎ คปภ.: '), 'แคปชั่นใส่ชื่อและเลขใบอนุญาตให้อัตโนมัติ · ไม่การันตีผลตอบแทน ไม่ใช้คำว่าดีที่สุด/ฟรี/แน่นอน')))),
    ...weeks.map((w) => h('div.section', h('h2', `สัปดาห์ที่ ${w + 1}`), h('div.cc-list', plan.filter((x) => x.week === w).map(card)))));
}

// ── ภาพทิปการเงิน 1080×1350 ──
const STYLES = { aom: { bg: ['#a6192e', '#7d1022'], ink: '#fff8f4', accent: '#ffd9a8', name: 'แดง-ขาว' }, white: { bg: ['#ffffff', '#f8eeee'], ink: '#1b1717', accent: '#a6192e', name: 'ขาว-แดง' }, navy: { bg: ['#13284a', '#0b1730'], ink: '#f3efe6', accent: '#c9a45c', name: 'กรมท่า-ทอง' }, cream: { bg: ['#f6f1e7', '#ece4d4'], ink: '#13284a', accent: '#b08a3e', name: 'ครีม-กรมท่า' }, green: { bg: ['#1f4e46', '#12302b'], ink: '#f5f2ec', accent: '#e2c27a', name: 'เขียวหมึก' } };
const seg = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter('th', { granularity: 'word' }) : null;
function wrap(ctx, text, maxW) {
  const words = seg ? [...seg.segment(text)].map((x) => x.segment) : String(text).split(/(\s+)/);
  const lines = []; let line = '';
  for (const w of words) { if (ctx.measureText(line + w).width > maxW && line) { lines.push(line.trim()); line = w.trimStart(); } else line += w; }
  if (line.trim()) lines.push(line.trim()); return lines;
}
export async function drawTip({ title, body, no, style }) {
  await document.fonts.ready;
  const S = STYLES[style] || STYLES.aom; const W = 1080, H = 1350, M = 96; const p = profile();
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, S.bg[0]); g.addColorStop(1, S.bg[1]); x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.strokeStyle = S.accent; x.lineWidth = 3; x.globalAlpha = .5; x.beginPath(); x.arc(W + 40, H + 40, 420, Math.PI, Math.PI * 1.5); x.stroke(); x.beginPath(); x.arc(W + 40, H + 40, 470, Math.PI, Math.PI * 1.5); x.stroke(); x.globalAlpha = 1;
  const F = (w, s, serif) => `${w} ${s}px ${serif ? '"Kanit"' : '"Sarabun"'}, sans-serif`;
  x.fillStyle = S.accent; x.font = F(600, 38); x.fillText('ทิปการเงิน' + (no ? ` #${no}` : ''), M, 190);
  x.fillRect(M, 214, 90, 5);
  x.fillStyle = S.ink; x.font = F(500, 88, true); let y = 340;
  for (const ln of wrap(x, title, W - M * 2).slice(0, 4)) { x.fillText(ln, M, y); y += 108; }
  y += 30; x.font = F(400, 50); x.globalAlpha = .92;
  for (const part of String(body).split(' · ')) { for (const ln of wrap(x, part, W - M * 2 - 40)) { x.fillText(ln, M + (String(body).includes(' · ') ? 40 : 0), y); y += 72; } y += 18; if (y > H - 360) break; }
  if (String(body).includes(' · ')) { x.globalAlpha = 1; }
  x.globalAlpha = 1;
  x.fillStyle = S.accent; x.fillRect(M, H - 250, W - M * 2, 2);
  x.fillStyle = S.ink; x.font = F(600, 42); x.fillText(p.name + (p.nick ? ` (${p.nick})` : ''), M, H - 180);
  x.globalAlpha = .8; x.font = F(400, 32); x.fillText([p.title, p.line ? 'LINE ' + p.line : null].filter(Boolean).join(' · '), M, H - 132);
  x.font = F(400, 26); x.fillText([p.tagline, p.licenseLife ? 'ใบอนุญาตเลขที่ ' + p.licenseLife : null].filter(Boolean).join(' · '), M, H - 88); x.globalAlpha = 1;
  return c;
}
const tc = { i: 0, style: 'aom', title: '', body: '' };
export function renderTipCard(qs = {}) {
  if (qs.t) { tc.title = qs.t; tc.body = qs.b || ''; }
  else if (!tc.title) { [tc.title, tc.body] = TIPS[0]; }
  const img = h('img.tip-prev', { alt: 'ตัวอย่างภาพทิป: ' + tc.title });
  const paint = async () => { const c = await drawTip({ ...tc, no: tc.i + 1 }); img.src = c.toDataURL('image/jpeg', 0.85); };
  const save = async () => { const c = await drawTip({ ...tc, no: tc.i + 1 }); const blob = await new Promise((r) => c.toBlob(r, 'image/png')); const file = new File([blob], `ทิป-${tc.i + 1}.png`, { type: 'image/png' });
    try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text: tc.title + '\n' + tc.body }); return; } } catch (e) { if (e?.name === 'AbortError') return; }
    const a = h('a', { href: URL.createObjectURL(blob), download: file.name }); document.body.append(a); a.click(); a.remove(); toast('บันทึกภาพแล้ว'); };
  setTimeout(paint, 0);
  const ti = h('input.input', { value: tc.title, 'aria-label': 'หัวข้อ', oninput: (e) => { tc.title = e.target.value; paint(); } });
  const bi = h('textarea.input', { rows: 3, 'aria-label': 'เนื้อหา', oninput: (e) => { tc.body = e.target.value; paint(); } }, tc.body);
  return h('div', { 'data-title': 'ภาพทิปการเงิน' },
    h('div.back-row', h('a.icon-btn', { href: '#/tools/content', 'aria-label': 'กลับ' }, icon('back')), h('div', h('h1.serif', { style: { fontSize: '22px' } }, 'ภาพทิปการเงิน'), h('div.small.muted', 'ภาพ 1080×1350 พร้อมโพสต์ ใส่ชื่อและเลขใบอนุญาตให้อัตโนมัติ'))),
    h('div.tip-grid',
      h('div', img),
      h('div',
        h('div.q', h('span.ql', 'สไตล์'), choices('st', tc.style, Object.entries(STYLES).map(([k, v]) => [k, v.name]), { onChange: (v) => { tc.style = v; paint(); } })),
        h('label.f', h('span', 'หัวข้อ'), ti), h('label.f', h('span', 'เนื้อหา (คั่นข้อด้วย ·)'), bi),
        h('button.btn.primary.block', { style: { marginTop: '10px' }, onclick: save }, icon('download'), 'บันทึก / แชร์ภาพ'),
        h('div.section', h('h2', `คลังทิป ${TIPS.length} ข้อ`), h('div.tip-lib', TIPS.map(([t, b], i) => h('button.chip', { class: tc.title === t ? 'on' : '', onclick: () => { tc.i = i; tc.title = t; tc.body = b; ti.value = t; bi.value = b; paint(); } }, t)))),
        h('p.source', 'ทิปเป็นข้อเท็จจริงทั่วไปหรือแนวทางที่นิยมใช้ ตรวจทานก่อนโพสต์ทุกครั้ง'))));
}
