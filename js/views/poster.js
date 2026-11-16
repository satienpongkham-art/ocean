// ─── หน้าโปสเตอร์แผน: เลือกแผน → ได้โปสเตอร์ทันที หลายเลย์เอาต์ หลายขนาด ───
import { h, icon, toast, copyText, sheet, closeSheet } from '../ui.js';
import { PLANS, PLAN, CATEGORIES } from '../../data/plans.js';
import * as store from '../store.js';
import { posterData, drawPoster, preparePoster, posterCaption, POSTER_LAYOUTS, POSTER_SIZES } from '../poster.js';

const ST = { cat: 'all', q: '', opt: { layout: 'cards', size: 'feed', theme: 'cat', example: false, closeDate: '', head: '' } };

export function renderPosters(q = {}) {
  if (q.plan && PLAN[q.plan]) return renderPosterEditor(q.plan, q);
  const list = h('div.ps-list');
  const paint = () => {
    const items = PLANS.filter((p) => !p.closed && (ST.cat === 'all' || p.cat === ST.cat) && (!ST.q || (p.name + p.short + p.tagline).toLowerCase().includes(ST.q.toLowerCase()))).sort((a, b) => (b.star ? 1 : 0) - (a.star ? 1 : 0));
    list.replaceChildren(...items.map((p) => h('a.ps-item', { href: '#/studio/poster?plan=' + p.id }, h('div', h('b', p.short || p.name), h('small', p.tagline)), p.star ? h('span.ps-star', 'ขายดี') : null, p.closing ? h('span.ps-close', 'ปิดขาย') : null, icon('next'))));
  };
  paint();
  return h('div', { 'data-title': 'โปสเตอร์แผน' },
    h('div.topbar', h('div', h('h1', 'โปสเตอร์แผน'), h('div.sub', 'เลือกแผน ได้โปสเตอร์สรุปเข้าใจง่ายทันที — ไม่ต้องแปะตารางเบี้ย'))),
    h('input.input.ps-search', { type: 'search', placeholder: 'ค้นหาแผน เช่น Health Happy, CI, บำนาญ', 'aria-label': 'ค้นหาแผน', oninput: (e) => { ST.q = e.target.value; paint(); } }),
    h('div.chips', { style: { margin: '10px 0' } }, [['all', 'ทั้งหมด'], ...CATEGORIES.map((c) => [c.id, c.name])].map(([k, l]) => h('button.chip', { class: ST.cat === k ? 'on' : '', onclick: (e) => { ST.cat = k; [...e.currentTarget.parentNode.children].forEach((c) => c.classList.toggle('on', c === e.currentTarget)); paint(); } }, l))),
    list);
}

function renderPosterEditor(id, q) {
  const d = posterData(id); const o = ST.opt;
  o.closeDate = q.close || (d.closing && !d.closing.closed && o.layout === 'urgent' ? d.closing.date : o.closeDate && ST.lastId === id ? o.closeDate : '');
  if (q.layout && POSTER_LAYOUTS[q.layout]) o.layout = q.layout;
  if (o.layout === 'urgent' && !o.closeDate && d.closing?.date) o.closeDate = d.closing.date;
  if (ST.lastId !== id) o.head = ''; ST.lastId = id;
  const cv = h('canvas.ps-cv', { 'aria-label': 'โปสเตอร์' });
  const thumbs = h('div.ps-thumbs');
  const draw = () => { drawPoster(cv, d, o); };
  const paintThumbs = () => thumbs.replaceChildren(...Object.entries(POSTER_LAYOUTS).map(([k, l]) => { const c = document.createElement('canvas'); drawPoster(c, d, { ...o, layout: k, closeDate: k === 'urgent' ? (o.closeDate || d.closing?.date || '') : o.closeDate }); return h('button.ps-th', { class: o.layout === k ? 'on' : '', onclick: () => { o.layout = k; if (k === 'urgent' && !o.closeDate && d.closing?.date) { o.closeDate = d.closing.date; closeIn.value = o.closeDate; } draw(); paintThumbs(); } }, h('img', { src: c.toDataURL('image/jpeg', 0.5), alt: '' }), h('small', l)); }));
  const seg = (opts, key, after) => h('div.seg', opts.map(([v, l]) => h('button', { class: o[key] === v ? 'on' : '', onclick: (e) => { o[key] = v; [...e.currentTarget.parentNode.children].forEach((b) => b.classList.toggle('on', b === e.currentTarget)); draw(); after?.(); } }, l)));
  const closeIn = h('input.input', { type: 'date', value: o.closeDate, 'aria-label': 'วันปิดขาย', onchange: (e) => { o.closeDate = e.target.value; draw(); paintThumbs(); } });
  const headIn = h('input.input', { value: o.head, placeholder: d.head, 'aria-label': 'หัวข้อ', oninput: (e) => { o.head = e.target.value.trim(); draw(); } });
  const blob = () => new Promise((r) => cv.toBlob(r, 'image/jpeg', 0.93));
  const save = async () => { const b = await blob(); const a = h('a', { href: URL.createObjectURL(b), download: `poster-${id}.jpg` }); document.body.append(a); a.click(); a.remove(); toast('บันทึกภาพแล้ว'); };
  const share = async () => { const b = await blob(); const f = new File([b], `poster-${id}.jpg`, { type: 'image/jpeg' }); if (navigator.canShare?.({ files: [f] })) { copyText(posterCaption(d, o)); navigator.share({ files: [f], text: posterCaption(d, o) }).catch(() => {}); } else save(); };
  const node = h('div.ps-ed', { 'data-title': 'โปสเตอร์ ' + d.name },
    h('div.topbar', h('div', h('a.crumb', { href: '#/studio/poster' }, '‹ โปสเตอร์แผน'), h('h1', d.name), h('div.sub', d.tagline))),
    h('div.ps-grid',
      h('div.ps-prev', h('div.ps-frame', cv), h('div.row.wrap.ps-acts', h('button.btn.primary', { onclick: share }, icon('share'), 'แชร์ (คัดลอกแคปชั่นให้)'), h('button.btn', { onclick: save }, icon('download'), 'บันทึกภาพ'))),
      h('div.ps-side',
        h('div.card', h('h3.vd-h3', 'แบบ'), thumbs),
        h('div.card', h('h3.vd-h3', 'ขนาด'), seg(Object.entries(POSTER_SIZES).map(([k, v]) => [k, v[2]]), 'size', paintThumbs),
          h('h3.vd-h3', { style: { marginTop: '12px' } }, 'สี'), seg([['cat', 'สีตามหมวดแผน'], ['brand', 'แดงแบรนด์']], 'theme', paintThumbs),
          h('label.vd-field', { style: { marginTop: '12px' } }, h('span', 'หัวข้อ (เว้นว่าง = ใช้ที่แอปเขียนให้)'), headIn),
          h('label.vd-field', h('span', 'วันปิดขาย (ใส่เมื่อแผนจะปิดรับจริง)'), closeIn),
          h('label.vd-tg', h('input', { type: 'checkbox', checked: o.example, onchange: (e) => { o.example = e.target.checked; draw(); } }), h('span', h('b', 'แสดงตัวอย่างจากโบรชัวร์'), h('small', 'ปิดไว้ถ้าไม่อยากโชว์ตัวเลขเบี้ย')))),
        h('div.card', h('h3.vd-h3', 'แคปชั่น'), h('pre.ps-cap', posterCaption(d, o)), h('button.btn', { onclick: () => copyText(posterCaption(d, o)) }, icon('copy'), 'คัดลอก')),
        h('p.xs.muted', 'ใช้ข้อมูลแผนในระบบ (ตรวจกับ aia.co.th) · ไม่มีโลโก้บริษัท · ใส่เลขใบอนุญาต/LINE ได้ที่ ', h('a', { href: '#/tools/profile' }, 'โปรไฟล์')))));
  preparePoster().then(() => { draw(); paintThumbs(); });
  return node;
}

/** แผ่นสรุปส่งลูกค้า (จากหน้าแผน) */
export function clientShareSheet(id) {
  const d = posterData(id); const cv = h('canvas.ps-cv');
  const clients = store.all('clients').sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')).slice(0, 12);
  const nameIn = h('input.input', { placeholder: 'ชื่อลูกค้า เช่น พี่บี', 'aria-label': 'ชื่อลูกค้า', oninput: () => draw() });
  const draw = () => drawPoster(cv, d, { layout: 'client', size: 'feed', client: nameIn.value.trim() });
  const share = async () => { const b = await new Promise((r) => cv.toBlob(r, 'image/jpeg', 0.93)); const f = new File([b], `สรุป-${d.name}.jpg`, { type: 'image/jpeg' }); if (navigator.canShare?.({ files: [f] })) navigator.share({ files: [f] }).catch(() => {}); else { const a = h('a', { href: URL.createObjectURL(b), download: f.name }); document.body.append(a); a.click(); a.remove(); } };
  sheet({ title: 'ส่งสรุปให้ลูกค้า', sub: d.name, body: h('div', h('label.vd-field', h('span', 'ใส่ชื่อลูกค้า (ไม่บังคับ)'), nameIn),
    clients.length ? h('div.chips', { style: { marginBottom: '10px' } }, clients.map((c) => h('button.chip', { onclick: () => { nameIn.value = c.nick || c.name || ''; draw(); } }, c.nick || c.name))) : null,
    h('div.ps-frame.sm', cv), h('div.row.wrap', { style: { gap: '8px', marginTop: '10px' } }, h('button.btn.primary', { onclick: share }, icon('share'), 'ส่งทาง LINE / แอปอื่น')), h('p.xs.muted', 'กดส่งแล้วเลือก LINE ในหน้าแชร์ของมือถือ')) });
  preparePoster().then(draw);
}
