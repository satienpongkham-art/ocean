// ─── ข้อมูลจริง: ตัวเลขสำคัญพร้อมแหล่งที่มา · ค่าลดหย่อนภาษี · ปฏิทินการเงินทั้งปี ───
import { h, icon } from '../ui.js';
import { FACTS, FACTS_ASOF, TAXD, TAX_YEAR, FINCAL } from '../../data/facts.js';
import { CATS } from '../../data/studio.js';

const MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const post = (deck, title, pillar) => import('./studio.js').then((m) => { const x = m.createItem(deck, { title, pillar }); location.hash = '#/studio/' + x.id; });
export function renderFacts() {
  const now = new Date().getMonth() + 1;
  const factPost = (f) => post({ cat: f.cat, tag: 'ตัวเลขน่ารู้', topic: f.k, slides: [{ kind: 'cover', kicker: 'ตัวเลขน่ารู้', title: `${f.k} ตอนนี้อยู่ที่เท่าไร?`, body: 'ปัดดูตัวเลขและความหมายกับเรา' }, { kind: 'stat', kicker: f.k, value: f.v, title: f.u, body: f.d, src: f.src }, { kind: 'point', num: '', title: 'เกี่ยวกับเรายังไง', body: '[อธิบายผลกับคนทั่วไปแบบเข้าใจง่าย 1–2 ประโยค]' }, { kind: 'cta', title: 'อยากให้ช่วยดูแผนของคุณ?', body: 'บันทึกโพสต์นี้ไว้ แล้วส่งให้คนที่ควรรู้' }] }, f.k, f.cat === 'ai' ? 'tech' : 'money');
  const taxPost = () => post({ cat: 'plan', tag: 'ลดหย่อนภาษี', topic: 'ค่าลดหย่อนภาษี', slides: [{ kind: 'cover', kicker: 'ลดหย่อนภาษี', title: 'ค่าลดหย่อนที่ใช้บ่อย ได้เท่าไรบ้าง', hl: 'ได้เท่าไร', body: TAX_YEAR, art: 'clock' }, { kind: 'table', title: 'กลุ่มประกัน', cols: ['รายการ', 'สูงสุด', 'เงื่อนไข'], rows: TAXD.slice(1, 5), hi: 1, note: TAX_YEAR + ' · ตรวจเงื่อนไขล่าสุดกับกรมสรรพากร' }, { kind: 'table', title: 'กลุ่มกองทุนและเกษียณ', cols: ['รายการ', 'สูงสุด', 'เงื่อนไข'], rows: TAXD.slice(5, 8), hi: 1, note: 'ตรวจเงื่อนไขล่าสุดกับกรมสรรพากร' }, { kind: 'cta', title: 'อยากรู้ว่าของคุณลดได้อีกเท่าไร?', body: 'ทักมาคุยได้ ไม่มีค่าใช้จ่ายในการปรึกษา' }] }, 'ค่าลดหย่อนภาษีที่ใช้บ่อย', 'money');
  return h('div', { 'data-title': 'ข้อมูลจริง' },
    h('div.back-row', h('a.icon-btn', { href: '#/menu', 'aria-label': 'กลับ' }, icon('back')), h('h1.serif', { style: { fontSize: '22px' } }, 'ข้อมูลจริง & ปฏิทินการเงิน')),
    h('p.muted', { style: { margin: '0 0 12px' } }, `ตัวเลขทุกตัวมีแหล่งที่มา ใช้ในโพสต์และตอนคุยกับลูกค้าได้ · ตรวจล่าสุด ${FACTS_ASOF}`),
    h('div.fx-grid', FACTS.map((f) => h('div.card.fx-i', h('small', f.k), h('b', f.v), h('span', f.u), h('p', f.d), h('em', 'ที่มา: ' + f.src), h('button.btn.sm', { onclick: () => factPost(f) }, icon('pen'), 'ทำเป็นโพสต์')))),
    h('div.section', h('h2', 'ค่าลดหย่อนภาษีที่ใช้บ่อย'), h('div.card', h('p.small.muted', { style: { marginTop: 0 } }, TAX_YEAR),
      h('table.rp-tbl', h('thead', h('tr', h('th', 'รายการ'), h('th.r', 'สูงสุด (บาท)'), h('th', 'เงื่อนไขหลัก'))), h('tbody', TAXD.map(([a, b, c]) => h('tr', h('td', h('b', a)), h('td.r', b), h('td.small', c))))),
      h('div.row.wrap', { style: { gap: '8px', marginTop: '12px' } }, h('a.btn.sm.primary', { href: '#/tools/tax' }, icon('tax'), 'คำนวณภาษีของลูกค้า'), h('button.btn.sm', { onclick: taxPost }, icon('pen'), 'ทำเป็นโพสต์')),
      h('p.source', 'สรุปจากข้อมูลที่เผยแพร่ เงื่อนไขมีรายละเอียดเพิ่มเติม ตรวจกับกรมสรรพากรก่อนใช้จริง'))),
    h('div.section', h('h2', 'ปฏิทินการเงินทั้งปี'), h('div.fc-list', FINCAL.map(([m, t, d, c]) => h('div.fc-i', { class: m === now ? 'now' : '' }, h('span.fc-m', MONTHS[m - 1]), h('div', h('b', t), h('small', d)), h('a.chip', { href: '#/studio/library', style: { '--pc': CATS[c].color } }, CATS[c].short)))),
      h('p.source', 'ช่วงเวลาโดยทั่วไป วันที่แน่นอนของแต่ละปีตรวจจากประกาศของหน่วยงาน')));
}
