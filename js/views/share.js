// ─── รับข้อความที่แชร์มาจากแอปอื่น (เช่น LINE) → รายชื่อใหม่ / จดในบันทึกลูกค้า ───
import { h, icon, toast, todayISO, copyText, empty } from '../ui.js';
import * as store from '../store.js';

export function extract(text) {
  const t = String(text || '');
  const phone = (t.match(/(?:\+66|0)[\s-]?\d{1,2}[\s-]?\d{3}[\s-]?\d{3,4}/) || [''])[0].replace(/[\s-]/g, '').replace(/^\+66/, '0');
  const line = (t.match(/(?:line\s*(?:id)?\s*[:：]?\s*@?)([\w.\-]{3,})/i) || [])[1] || '';
  const first = t.split(/\r?\n/).map((x) => x.trim()).find((x) => x && !/\d{6,}/.test(x) && x.length <= 30) || '';
  const nick = first.replace(/^(ชื่อ|name)\s*[:：]?\s*/i, '').split(/\s+/).slice(0, 2).join(' ');
  return { phone, line, nick };
}

export function renderShare() {
  let data = {}; try { data = JSON.parse(sessionStorage.getItem('shared') || '{}'); } catch {}
  const text = [data.title, data.text, data.url].filter(Boolean).join('\n').trim();
  const ex = extract(text);
  const clients = store.all('clients').sort((a, b) => (a.nick || '').localeCompare(b.nick || '', 'th'));
  const sel = h('select.input', { 'aria-label': 'เลือกลูกค้า' }, h('option', { value: '' }, '— เลือกลูกค้า —'), clients.map((c) => h('option', { value: c.id }, c.nick)));
  const done = () => sessionStorage.removeItem('shared');
  return h('div', { 'data-title': 'ข้อความที่แชร์มา' },
    h('div.topbar', h('div', h('h1', 'ข้อความที่แชร์มา'), h('div.sub', 'เลือกว่าจะเก็บข้อความนี้ไว้ที่ไหน'))),
    !text ? h('div.card', empty('ยังไม่มีข้อความ', 'share', h('a.btn.primary', { href: '#/' }, 'กลับหน้าวันนี้'), 'ในแชต LINE ให้กดค้างที่ข้อความ → แชร์ → เลือก Advisor Desk (ต้องติดตั้งแอปบน Android ก่อน)'))
      : h('div',
        h('div.card', h('pre.share-text', text), h('div.row.wrap', { style: { gap: '6px', marginTop: '8px' } },
          ex.nick ? h('span.tag', 'ชื่อ: ' + ex.nick) : null, ex.phone ? h('span.tag', 'เบอร์: ' + ex.phone) : null, ex.line ? h('span.tag', 'LINE: ' + ex.line) : null)),
        h('div.section', h('h2', 'ทำอะไรต่อ'), h('div.quick-grid',
          h('button', { onclick: () => { sessionStorage.setItem('prefill', JSON.stringify({ nick: ex.nick, phone: ex.phone, line: ex.line, notes: text, source: 'social' })); done(); location.hash = '#/client/new'; } }, h('span.qi', icon('plus')), h('b', 'เป็นรายชื่อใหม่'), h('span', 'เติมชื่อ เบอร์ LINE ให้')),
          h('button', { onclick: () => copyText(text) }, h('span.qi', icon('copy')), h('b', 'คัดลอก'), h('span', 'ไปวางที่อื่น')))),
        h('div.section', h('h2', 'จดในบันทึกของลูกค้า'), h('div.card', sel,
          h('button.btn.primary.block', { style: { marginTop: '10px' }, onclick: () => { if (!sel.value) { sel.focus(); toast('เลือกลูกค้าก่อน'); return; } store.put('logs', { clientId: sel.value, date: todayISO(), type: 'note', text }); done(); toast('จดแล้ว'); location.hash = '#/client/' + sel.value; } }, icon('note'), 'บันทึก')))));
}
