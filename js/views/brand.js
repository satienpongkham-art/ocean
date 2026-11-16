// ─── แบรนด์ของฉัน: ตั้งจุดยืน → ไบโอ 4 ช่องทาง · ภารกิจ 30 วัน · หลักจากหนังสือ ───
import { h, icon, choices, toast, copyText, todayISO, daysBetween, more } from '../ui.js';
import * as store from '../store.js';
import { BOOKS, AUDIENCES, PROBLEMS, EDGES, TONES, MISSION } from '../../data/brand.js';
import { profile, rerender } from '../app.js';

const B = () => ({ audience: [], problem: [], edge: [], tone: 'friendly', series: 'ออมรู้ 1 นาที', outcome: 'วางแผนการเงินได้มั่นใจ', ...(store.getSettings().brand || {}) });
const join = (a) => a.length > 1 ? a.slice(0, -1).join(', ') + ' และ' + a[a.length - 1] : (a[0] || '');

/** ประโยคจุดยืน (โครงแบบ StoryBrand: ลูกค้าคือพระเอก เราคือผู้ช่วย) + ไบโอแต่ละช่องทาง */
export function brandCopy(b, p = profile()) {
  const who = join(b.audience) || 'คนทำงาน'; const prob = b.problem[0] || 'ไม่รู้จะเริ่มวางแผนการเงินยังไง'; const edge = b.edge[0] || 'อธิบายภาษาง่าย';
  const nick = (p.nick || '').replace(/^คุณ/, '') || (p.name || '').split(' ')[0];
  const hi = { friendly: 'ช่วย', pro: 'ให้คำปรึกษา', fun: 'พา' }[b.tone] || 'ช่วย';
  const statement = `ผม${hi}${who}ที่${prob} ให้${b.outcome} ด้วยการ${edge}`;
  return {
    statement,
    ig: `${nick} · ที่ปรึกษาการเงิน 💼\n${hi}${who}${b.outcome}\n📌 ${b.series} ทุกสัปดาห์\n👇 ทักมาเช็กความคุ้มครองได้`,
    fb: `สวัสดีครับ ผม${p.name}${p.nick ? ' (' + p.nick + ')' : ''} ${p.title}\n${statement}\nโพสต์ "${b.series}" ความรู้การเงินฉบับเข้าใจง่าย · ใบอนุญาตเลขที่ ${p.licenseLife || '—'}${p.line ? '\nLINE: ' + p.line : ''}`,
    tiktok: `${b.series} 💡 การเงินเข้าใจง่ายใน 1 นาที · ${who}`,
    line: `${nick} ที่ปรึกษาการเงิน · ${b.outcome}`,
  };
}

export function renderBrand() {
  const b = B(); const s = store.getSettings(); const m = s.brandMission || {};
  const save = (patch) => store.saveSettings({ brand: { ...b, ...patch } });
  const copy = brandCopy(b);
  const multi = (k, opts) => choices(k, b[k], opts.map((x) => [x, x]), { multi: true, onChange: (v) => save({ [k]: v.slice(-2) }) });
  // ภารกิจ 30 วัน
  const start = m.start || null; const done = m.done || {};
  const day = start ? Math.min(30, daysBetween(start, todayISO()) + 1) : 0;
  const nDone = Object.values(done).filter(Boolean).length;
  let streak = 0; for (let d = day; d >= 1 && done[d]; d--) streak++;
  const tick = (d) => { const nd = { ...done, [d]: !done[d] }; store.saveSettings({ brandMission: { start, done: nd } }); if (!done[d]) import('../fx.js').then((f) => f.celebrate({ count: 50 })); };
  const box = (k, label, txt, limit) => h('div.bio', h('div.row.between', h('b', label), h('small.muted', limit ? `${txt.length}/${limit} ตัวอักษร` : '')), h('pre', txt), h('button.btn.sm', { onclick: () => copyText(txt) }, icon('copy'), 'คัดลอก'));
  return h('div', { 'data-title': 'แบรนด์ของฉัน' },
    h('div.topbar', h('div', h('h1', 'แบรนด์ของฉัน'), h('div.sub', 'ตั้งจุดยืน → ไบโอ → ทำตามภารกิจ 30 วัน · อ้างอิงหลักจากหนังสือที่คนสร้างแบรนด์นิยมใช้'))),
    h('div.brand-hero.tilt.gyro', h('small', 'ประโยคจุดยืนของคุณ'), h('p', copy.statement), h('button.btn.sm', { onclick: () => copyText(copy.statement) }, icon('copy'), 'คัดลอก')),
    h('div.section', h('h2', '1 · ตั้งจุดยืน (5 คำถาม)'), h('div.card',
      h('div.q', h('span.ql', 'คุณอยากช่วยใครมากที่สุด (เลือกได้ 2)'), multi('audience', AUDIENCES)),
      h('div.q', h('span.ql', 'ปัญหาที่เขาเจอ'), multi('problem', PROBLEMS)),
      h('div.q', h('span.ql', 'อยากให้เขาได้อะไร'), h('input.input', { value: b.outcome, onchange: (e) => save({ outcome: e.target.value }) })),
      h('div.q', h('span.ql', 'คุณต่างจากตัวแทนคนอื่นตรงไหน'), multi('edge', EDGES)),
      h('div.q', h('span.ql', 'สไตล์การพูด'), choices('tone', b.tone, TONES, { onChange: (v) => save({ tone: v }) })),
      h('div.q', h('span.ql', 'คำลงท้ายในแคปชั่น'), choices('particle', b.particle || '', [['', 'ไม่ใส่'], ['ครับ', 'ครับ'], ['ค่ะ', 'ค่ะ']], { onChange: (v) => save({ particle: v }) })),
      h('div.row.wrap', { style: { gap: '8px', marginTop: '6px' } }, h('a.btn.sm', { href: '#/studio/sign' }, icon('pen'), 'ลายเซ็นท้ายภาพ'), h('a.btn.sm', { href: '#/studio/playbook' }, icon('bulb'), 'หลักที่ใช้ทำคอนเทนต์')),
      h('div.q', h('span.ql', 'ชื่อซีรีส์ประจำ'), h('input.input', { value: b.series, onchange: (e) => save({ series: e.target.value }) }), h('span.qh', 'ใช้เป็นป้ายบนปกภาพหลายหน้าในสตูดิโอ')))),
    h('div.section', h('h2', '2 · ไบโอพร้อมใช้'), h('div.bios', box('ig', 'Instagram', copy.ig, 150), box('fb', 'Facebook (แนะนำตัว)', copy.fb), box('tt', 'TikTok', copy.tiktok, 80), box('line', 'LINE สถานะ', copy.line, 50))),
    h('div.section', h('h2', '3 · ภารกิจ 30 วัน'), h('div.card',
      !start ? h('div', h('p', 'ทำวันละ 1 งานเล็ก ๆ ครบ 30 วันคุณจะมีโปรไฟล์ที่ชัด ซีรีส์ 4 ตอน และรู้ว่าคอนเทนต์แบบไหนได้ผล'), h('button.btn.primary', { style: { marginTop: '10px' }, onclick: () => store.saveSettings({ brandMission: { start: todayISO(), done: {} } }) }, icon('flame'), 'เริ่มวันนี้'))
        : h('div', h('div.mission-stat', h('div', h('b', `วันที่ ${day}`), h('small', '/30')), h('div', h('b', nDone), h('small', 'ทำแล้ว')), h('div', h('b', streak), h('small', 'วันต่อเนื่อง'))),
          h('div.mission-bar', h('i', { style: { width: nDone / 30 * 100 + '%' } })),
          h('ol.mission', MISSION.map(([t, d, bk], i) => { const n = i + 1; const today = n === day;
            return h('li', { class: [done[n] ? 'done' : '', today ? 'today' : '', n > day ? 'later' : ''].join(' ') },
              h('label', h('input', { type: 'checkbox', checked: !!done[n], disabled: n > day, onchange: () => tick(n), 'aria-label': `วันที่ ${n}: ${t}` }), h('span', h('b', `${n}. ${t}`), h('small', d), h('em', `ตามแนวคิด ${BOOKS[bk].title}`)))); })),
          more('เริ่มใหม่', h('button.btn.sm.ghost', { onclick: () => { if (confirm('เริ่มภารกิจ 30 วันใหม่?')) store.saveSettings({ brandMission: { start: todayISO(), done: {} } }); } }, 'เริ่มนับวันใหม่'))))),
    h('div.section', h('h2', 'หลักที่ใช้ (สรุปจากหนังสือ)'), h('div.books', Object.values(BOOKS).map((bk) => h('div.book', h('b', bk.title), h('small', bk.author), h('p', bk.idea))))),
    h('p.source', 'สรุปแนวคิดหลักของหนังสือเพื่อใช้ลงมือทำ ไม่ใช่เนื้อหาจากหนังสือโดยตรง · ควรอ่านเล่มเต็มเพื่อเข้าใจลึกขึ้น'));
}
