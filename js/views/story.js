// ─── สตอรี่แผนประกัน: ปัดดูเต็มจอแบบ Instagram Story + บันทึกเป็นภาพ 1080×1920 ไว้โพสต์ (สร้างแบรนด์ส่วนตัว) ───
import { h, icon, toast } from '../ui.js';
import { CAT, quickFacts } from '../../data/plans.js';
import { profile } from '../app.js';
import { illus } from '../illus.js';
import { headline } from './planpage.js';
import { haptic } from '../pwa.js';

const HOOK = {
  health: 'ถ้าต้องนอนโรงพยาบาลพรุ่งนี้ ค่ารักษาใครจ่าย?', ci: 'ถ้าตรวจเจอโรคร้าย รายได้ช่วงรักษาจะมาจากไหน?', hb: 'นอนโรงพยาบาล 1 วัน = ขาดรายได้ 1 วัน',
  accident: 'อุบัติเหตุไม่เคยนัดล่วงหน้า', life: 'ถ้าวันหนึ่งเราไม่อยู่ ใครดูแลคนที่เรารัก?', saving: 'อยากมีเงินก้อนแบบการันตี ไม่ต้องลุ้น?',
  annuity: 'เกษียณแล้ว อยากมีเงินเดือนใช้ทุกปี?', senior: 'อายุ 50+ ยังทำประกันได้ไหม?',
};
const HEX = { life: '#3b5b7a', ci: '#7a3b5b', health: '#2f6b4f', hb: '#9a6b1f', accident: '#a44a2a', saving: '#2a6f73', annuity: '#4a4a8a', senior: '#6b5847' };
const DISC = 'ข้อมูลเบื้องต้น ความคุ้มครองเป็นไปตามกรมธรรม์ · ผู้ซื้อควรทำความเข้าใจรายละเอียดก่อนตัดสินใจ';

export function slides(p) {
  const q = quickFacts(p); const me = profile();
  return [
    { kind: 'hook', kicker: CAT[p.cat].name, title: HOOK[p.cat] || p.tagline },
    { kind: 'intro', kicker: 'รู้จักแผนนี้', title: p.short, body: p.tagline },
    { kind: 'list', kicker: 'จุดเด่น', title: 'ทำไมคนเลือกแผนนี้', items: (p.highlights || []).slice(0, 3).map((x) => headline(x, 60)) },
    { kind: 'facts', kicker: 'เงื่อนไขสั้น ๆ', title: 'สมัครยังไง', items: [q.age && 'รับอายุ ' + q.age, q.pay, q.cover, p.kind === 'rider' ? 'แนบกับสัญญาหลัก' : null].filter(Boolean), body: p.example ? headline(p.example.text, 90) : '' },
    { kind: 'list', kicker: 'เหมาะกับใคร', title: 'ถ้าคุณคือคนนี้', items: (p.bestFor || []).slice(0, 3).map((x) => headline(x, 60)) },
    { kind: 'cta', kicker: 'อยากรู้ว่าเหมาะกับคุณไหม?', title: 'ทักมาคุยได้ ไม่มีค่าใช้จ่าย', body: `${me.name}\n${me.title} · ${me.company || ''}${me.line ? '\nLINE: ' + me.line : ''}${me.phone ? '\nโทร ' + me.phone : ''}` },
  ];
}

let ov = null;
export function openStory(p) {
  closeStory();
  const ss = slides(p); let i = 0;
  const color = HEX[p.cat] || '#1f4e46';
  const bars = h('div.st-bars', ss.map(() => h('i')));
  const stage = h('div.st-stage', { 'aria-live': 'polite' });
  const draw = () => {
    [...bars.children].forEach((b, k) => b.classList.toggle('on', k <= i));
    const s = ss[i];
    stage.replaceChildren(h('div.st-slide', { class: 'k-' + s.kind },
      s.kind === 'hook' || s.kind === 'cta' ? illus(s.kind === 'cta' ? 'story' : p.cat, { size: 170 }) : null,
      h('div.st-kicker', s.kicker), h('h2', s.title),
      s.body ? h('p', s.body) : null,
      s.items ? h('ul', s.items.map((x) => h('li', icon('check'), h('span', x)))) : null,
      h('div.st-foot', `${i + 1}/${ss.length} · ${profile().name}`)));
  };
  const nav = (d) => { const n = i + d; if (n < 0) return; if (n >= ss.length) { closeStory(); return; } i = n; haptic(8); draw(); };
  let x0 = null;
  ov = h('div.story', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'สตอรี่ ' + p.short, tabindex: '-1', style: { '--sc': color },
    ontouchstart: (e) => { x0 = e.touches[0].clientX; }, ontouchend: (e) => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) nav(dx < 0 ? 1 : -1); x0 = null; } },
    bars,
    h('div.st-top', h('b', p.short), h('div.row', { style: { gap: '6px' } },
      h('button.st-btn', { onclick: () => saveSlide(p, ss, i), 'aria-label': 'บันทึกสไลด์นี้เป็นภาพ' }, icon('download')),
      h('button.st-btn', { onclick: () => saveAll(p, ss), 'aria-label': 'บันทึกทุกสไลด์' }, icon('layers')),
      h('button.st-btn', { onclick: closeStory, 'aria-label': 'ปิด' }, icon('close')))),
    stage,
    h('button.st-zone.l', { onclick: () => nav(-1), 'aria-label': 'สไลด์ก่อนหน้า' }), h('button.st-zone.r', { onclick: () => nav(1), 'aria-label': 'สไลด์ถัดไป' }));
  ov.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') nav(1); if (e.key === 'ArrowLeft') nav(-1); if (e.key === 'Escape') closeStory(); });
  document.body.append(ov); document.body.style.overflow = 'hidden';
  draw(); ov.focus();
}
export function closeStory() { if (!ov) return; ov.remove(); ov = null; document.body.style.overflow = ''; }
window.addEventListener('hashchange', closeStory);

// ── วาดภาพ 1080×1920 ──
const seg = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter('th', { granularity: 'word' }) : null;
function wrap(ctx, text, maxW) {
  const words = seg ? [...seg.segment(text)].map((s) => s.segment) : String(text).split(/(\s+)/);
  const lines = []; let line = '';
  for (const w of words) { if (w === '\n') { lines.push(line); line = ''; continue; } if (ctx.measureText(line + w).width > maxW && line) { lines.push(line.trim()); line = w.trimStart(); } else line += w; }
  if (line.trim()) lines.push(line.trim()); return lines;
}
async function render(p, s, idx, total) {
  await document.fonts.ready;
  const W = 1080, H = 1920, M = 96; const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  const col = HEX[p.cat] || '#1f4e46';
  const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, col); g.addColorStop(1, '#14211e'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.fillStyle = 'rgba(255,255,255,.07)'; x.beginPath(); x.arc(W - 120, 260, 300, 0, Math.PI * 2); x.fill();
  const F = (w, sz, serif) => `${w} ${sz}px ${serif ? '"Kanit"' : '"Sarabun"'}, sans-serif`;
  let y = 420;
  x.fillStyle = 'rgba(255,255,255,.7)'; x.font = F(600, 40); x.fillText(s.kicker, M, y); y += 90;
  x.fillStyle = '#fff'; x.font = F(500, s.kind === 'intro' ? 110 : 84, true);
  for (const ln of s.title.split('\n').flatMap((t) => wrap(x, t, W - M * 2))) { x.fillText(ln, M, y); y += s.kind === 'intro' ? 128 : 104; }
  y += 30;
  if (s.body) { x.font = F(400, 46); x.fillStyle = 'rgba(255,255,255,.9)'; for (const ln of s.body.split('\n').flatMap((t) => wrap(x, t, W - M * 2))) { x.fillText(ln, M, y); y += 66; } y += 30; }
  if (s.items) { x.font = F(500, 46); for (const it of s.items) { const ls = wrap(x, it, W - M * 2 - 70); x.fillStyle = '#fff'; x.beginPath(); x.arc(M + 18, y - 14, 16, 0, Math.PI * 2); x.fill(); x.fillStyle = col; x.font = F(700, 26); x.fillText('✓', M + 8, y - 4); x.font = F(500, 46); x.fillStyle = '#fff'; ls.forEach((ln, k) => x.fillText(ln, M + 70, y + k * 64)); y += ls.length * 64 + 40; } }
  const me = profile();
  x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(M, H - 300, W - M * 2, 2);
  x.fillStyle = '#fff'; x.font = F(600, 40); x.fillText(me.name, M, H - 230);
  x.fillStyle = 'rgba(255,255,255,.75)'; x.font = F(400, 32); x.fillText(`${me.title} · ${me.company || ''}${me.line ? ' · LINE ' + me.line : ''}`, M, H - 180);
  x.font = F(400, 24); x.fillStyle = 'rgba(255,255,255,.55)'; wrap(x, DISC, W - M * 2).slice(0, 2).forEach((ln, k) => x.fillText(ln, M, H - 120 + k * 34));
  x.font = F(500, 28); x.fillStyle = 'rgba(255,255,255,.6)'; x.fillText(`${idx + 1}/${total}`, W - M - 60, 200);
  return new Promise((res) => c.toBlob(res, 'image/png'));
}
async function saveSlide(p, ss, i) {
  const blob = await render(p, ss[i], i, ss.length);
  const file = new File([blob], `${p.short}-${i + 1}.png`, { type: 'image/png' });
  try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text: ss[i].title }); return; } } catch (e) { if (e?.name === 'AbortError') return; }
  const a = h('a', { href: URL.createObjectURL(blob), download: file.name }); document.body.append(a); a.click(); a.remove(); toast('บันทึกภาพแล้ว');
}
async function saveAll(p, ss) {
  const files = []; for (let i = 0; i < ss.length; i++) files.push(new File([await render(p, ss[i], i, ss.length)], `${p.short}-${i + 1}.png`, { type: 'image/png' }));
  try { if (navigator.canShare && navigator.canShare({ files })) { await navigator.share({ files, text: `${p.short} — ${p.tagline}` }); return; } } catch (e) { if (e?.name === 'AbortError') return; }
  for (const f of files) { const a = h('a', { href: URL.createObjectURL(f), download: f.name }); document.body.append(a); a.click(); a.remove(); await new Promise((r) => setTimeout(r, 250)); }
  toast(`บันทึก ${files.length} ภาพแล้ว พร้อมโพสต์`);
}
