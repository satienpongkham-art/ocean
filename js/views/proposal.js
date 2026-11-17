// ─── ใบเสนอ 3 ทางเลือก: พื้นฐาน / ปานกลาง / เต็ม ให้ลูกค้าเลือก ───
import { h, icon, fmt, toast, todayISO, sheet, copyText } from '../ui.js';
import * as store from '../store.js';
import { PLAN, CAT } from '../../data/plans.js';
import { TIER_LABEL, resolveTier } from '../../data/packages.js';
import { recommend } from '../engine/recommend.js';
import { lookup } from '../engine/premium.js';
import { isClosed } from './packages.js';
import { clientAge } from './clients.js';

export function renderProposal(id) {
  const c = store.get('clients', id);
  if (!c) { location.hash = '#/clients'; return null; }
  const p = { ...c, age: clientAge(c) };
  const r = recommend(p);
  const col = (tk) => {
    const t = resolveTier(r.pkg, tk, isClosed);
    const items = t.items.filter((it) => PLAN[it.plan]);
    const prem = items.map((it) => lookup(store.get('premiums', it.plan), p.age, c.gender));
    const known = prem.filter(Boolean); const total = known.reduce((s, x) => s + x[0].value, 0);
    const chosen = c.proposal?.tier === tk;
    return h('div.prop-col', { class: [tk === r.tier ? 'rec' : '', chosen ? 'chosen' : ''].join(' ') },
      tk === r.tier ? h('span.prop-badge', 'แนะนำ') : null,
      h('h3', TIER_LABEL[tk]),
      h('div.prop-total', known.length ? h('b', fmt(total)) : h('b', '—'), h('small', known.length ? (known.length < items.length ? ` บาท/ปี (คิดได้ ${known.length}/${items.length} แผน)` : ' บาท/ปี') : ' ยังไม่มีตารางเบี้ย')),
      h('ul', items.map((it, i) => h('li.cat-' + PLAN[it.plan].cat, h('i', { 'aria-hidden': 'true' }), h('span', h('b', PLAN[it.plan].short), h('small', `${it.sa}${prem[i] ? ' · ' + fmt(prem[i][0].value) : ''}`))))),
      h('div.prop-acts',
        h('button.btn' + (chosen ? '.primary' : ''), { 'aria-pressed': String(chosen), onclick: () => { store.put('clients', { ...c, proposal: { tier: tk, date: todayISO(), items: items.map((it) => it.plan) } }); store.put('logs', { clientId: c.id, date: todayISO(), type: 'note', text: `ลูกค้าเลือกแผน${TIER_LABEL[tk]}: ${items.map((it) => PLAN[it.plan].short).join(', ')}` }); toast(`บันทึกว่าเลือก "${TIER_LABEL[tk]}" แล้ว`); } }, icon('check'), chosen ? 'ลูกค้าเลือกแบบนี้' : 'เลือกแบบนี้'),
        h('a.btn.ghost.sm', { href: `#/sheet/${items.map((it) => it.plan).join(',')}?c=${c.id}` }, icon('doc'), 'สรุปหน้าเดียว'),
        h('button.btn.ghost.sm', { onclick: () => lineSheet(c, TIER_LABEL[tk], r, items, prem, total, known.length) }, icon('share'), 'ส่ง LINE')));
  };
  return h('div', { 'data-title': 'ใบเสนอ 3 ทางเลือก' },
    h('div.back-row', h('a.icon-btn', { href: '#/client/' + id, 'aria-label': 'กลับ' }, icon('back')), h('div', h('h1.serif', { style: { fontSize: '22px' } }, 'ใบเสนอ 3 ทางเลือก'), h('div.small.muted', `คุณ${c.nick} · ${r.pkg.name}`))),
    h('p.lead', { style: { margin: '6px 0 12px' } }, r.pkg.goal),
    h('div.prop-grid', ['basic', 'mid', 'max'].map(col)),
    h('div.card', { style: { marginTop: '12px' } }, h('b', 'ทำไมแนะนำชุดนี้'), h('ul.ticks', { style: { marginTop: '6px' } }, r.reasons.slice(0, 3).map((x) => h('li', x)))),
    h('p.source', { style: { marginTop: '10px' } }, 'เบี้ยคิดจากตารางที่นำเข้า (ถ้ามี) · เบี้ยจริงตามใบเสนอจากระบบ AIA'));
}

/** ใบเสนอเป็นภาพ + ข้อความ ส่งทาง LINE */
async function lineSheet(c, tier, r, items, prem, total, known) {
  const { drawProposal, preparePoster } = await import('../poster.js');
  const q = { client: c.nick || c.name, tier: 'ชุด' + tier, pkg: r.pkg.name, items: items.map((it, i) => ({ name: PLAN[it.plan].short || PLAN[it.plan].name, cat: PLAN[it.plan].cat, sa: it.sa, prem: prem[i]?.[0]?.value || null })), total, known, n: items.length, reasons: r.reasons.slice(0, 3) };
  const msg = `สวัสดีคุณ${q.client} ตามที่คุยกันไว้ ขอสรุปแผนที่แนะนำ (${q.tier}) ดังนี้\n\n${q.items.map((it) => `• ${it.name}${it.sa ? ' — ' + it.sa : ''}${it.prem ? ` — ${fmt(it.prem)} บาท/ปี` : ''}`).join('\n')}\n\n${known ? `รวมประมาณ ${fmt(total)} บาท/ปี (≈ ${fmt(Math.round(total / 12))} บาท/เดือน)\n` : ''}เบี้ยจริงตามใบเสนอจากระบบ AIA · เงื่อนไขความคุ้มครองเป็นไปตามกรมธรรม์\n\nสงสัยตรงไหน หรือสะดวกคุยรายละเอียดเมื่อไหร่ ทักมาได้เลย`;
  const cv = h('canvas.ps-cv'); const share = async () => {
    const b = await new Promise((res) => cv.toBlob(res, 'image/jpeg', 0.92)); const f = new File([b], `ข้อเสนอ-${q.client}.jpg`, { type: 'image/jpeg' });
    copyText(msg); store.put('logs', { clientId: c.id, date: todayISO(), type: 'note', text: `ส่งใบเสนอ${q.tier} ทาง LINE` });
    if (navigator.canShare?.({ files: [f] })) navigator.share({ files: [f], text: msg }).catch(() => {}); else { const a = h('a', { href: URL.createObjectURL(b), download: f.name }); document.body.append(a); a.click(); a.remove(); toast('บันทึกภาพแล้ว · คัดลอกข้อความให้แล้ว'); }
  };
  sheet({ title: 'ส่งใบเสนอทาง LINE', sub: `คุณ${q.client} · ${q.tier}`, body: h('div', h('div.ps-frame.sm', cv), h('pre.ps-cap', msg), h('div.row.wrap', { style: { gap: '8px', marginTop: '10px' } }, h('button.btn.primary', { onclick: share }, icon('share'), 'ส่งภาพ + ข้อความ'), h('button.btn', { onclick: () => copyText(msg) }, icon('copy'), 'คัดลอกข้อความ')), h('p.xs.muted', 'กดส่งแล้วเลือก LINE · ข้อความถูกคัดลอกไว้ วางต่อท้ายได้เลย · เบี้ยมาจากตารางเบี้ยที่บันทึกไว้ในแอป')) });
  await preparePoster(); drawProposal(cv, q);
}
