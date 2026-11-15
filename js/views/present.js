// ─── โหมดนำเสนอลูกค้า + ภาพสรุปแผนส่ง LINE ───
import { h, icon, toast, ageFrom, choices, fmt } from '../ui.js';
import * as store from '../store.js';
import { PLAN, CAT } from '../../data/plans.js';
import { TIER_LABEL, resolveTier } from '../../data/packages.js';
import { recommend } from '../engine/recommend.js';
import { healthCheck } from '../engine/needs.js';
import { isClosed } from './packages.js';
import { mandalaGrid } from './fhc.js';
import { profile } from '../app.js';
import { DISCLAIMER } from '../../data/captions.js';

export function renderPresent(id, qs = {}) {
  const c = store.get('clients', id);
  if (!c) { location.hash = '#/clients'; return null; }
  const p = { ...c, age: ageFrom(c.birthday) ?? c.age };
  const r = recommend(p);
  let tier = qs.tier || r.tier;
  const pr = profile();
  const listWrap = h('div');
  const paint = () => {
    const t = resolveTier(r.pkg, tier, isClosed);
    listWrap.replaceChildren(...t.items.map((it) => { const pl = PLAN[it.plan]; return pl ? h('div.pitem.cat-' + pl.cat, h('span.pi', icon('cat-' + pl.cat)), h('div', h('b', pl.short), h('span', it.sa + ' · ' + pl.tagline))) : null; }));
  };
  paint();
  return h('div.present', { 'data-title': 'นำเสนอ ' + c.nick },
    h('div.ptop', h('a.btn.ghost', { href: '#/client/' + id }, icon('close'), 'ออก'), h('button.btn.primary', { onclick: () => shareImage(p, r, tier) }, icon('upload'), 'ส่งเป็นภาพ')),
    h('div.small.muted', 'แผนความคุ้มครองที่ออกแบบสำหรับ'),
    h('h1', 'คุณ' + c.nick),
    h('p.lead', { style: { marginTop: '6px' } }, r.pkg.goal),
    h('div.pcard', h('div.row.between.wrap', { style: { gap: '8px', marginBottom: '6px' } }, h('b', { style: { fontSize: '18px' } }, r.pkg.name),
      choices('tier', tier, ['basic', 'mid', 'max'].map((k) => [k, TIER_LABEL[k]]), { onChange: (v) => { tier = v; paint(); } })), listWrap),
    h('div.pcard', h('b', { style: { fontSize: '18px' } }, 'ทำไมถึงเหมาะกับคุณ'), h('ul.ticks', { style: { marginTop: '8px', fontSize: '16px' } }, r.reasons.slice(0, 3).map((x) => h('li', x)))),
    h('div.pcard', h('b', { style: { fontSize: '18px' } }, 'ภาพรวมความคุ้มครอง 8 ด้าน'), h('div', { style: { marginTop: '10px' } }, mandalaGrid(c.nick, healthCheck(p), { onCell: () => {} }))),
    h('div.sign', `${pr.name} · ${pr.title} ${pr.company} · รหัสตัวแทน ${pr.agentCode}${pr.licenseLife ? ' · ใบอนุญาต ' + pr.licenseLife : ''}`, h('br'), 'เบี้ยประกันจริงตามใบเสนอจากระบบ AIA · ' + DISCLAIMER));
}

// ── วาดภาพสรุปแผน (1080×1350) ─────────────────────────────
const seg = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter('th', { granularity: 'word' }) : null;
function wrap(ctx, text, maxW) {
  const words = seg ? [...seg.segment(text)].map((s) => s.segment) : text.split(/(\s+)/);
  const lines = []; let line = '';
  for (const w of words) {
    if (ctx.measureText(line + w).width > maxW && line) { lines.push(line.trim()); line = w.trimStart(); } else line += w;
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}
const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim() || '#333';

export async function shareImage(p, r, tier) {
  await document.fonts.ready;
  const W = 1080, M = 72;
  const F = (w, s, serif) => `${serif ? Math.min(+w, 600) : w} ${s}px ${serif ? '"Kanit"' : '"Sarabun"'}, sans-serif`;
  const pr = profile();
  // วัดความสูงก่อน เพื่อให้ภาพยาวพอดีเนื้อหา (อย่างน้อย 1350)
  const mctx = document.createElement('canvas').getContext('2d'); mctx.font = F(400, 31);
  const nItems = resolveTier(r.pkg, tier, isClosed).items.filter((it) => PLAN[it.plan]).length;
  const reasonLines = r.reasons.slice(0, 2).map((x) => wrap(mctx, x, W - M * 2 - 44).slice(0, 3).length);
  const H = Math.max(1350, 400 + nItems * 136 + 112 + reasonLines.reduce((t, n) => t + n * 44 + 18, 0) + 250);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  // พื้นหลัง
  ctx.fillStyle = '#f5f2ec'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#1f4e46'; ctx.fillRect(0, 0, W, 330);
  ctx.fillStyle = '#c8102e'; ctx.beginPath(); ctx.arc(W - 110, 110, 26, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(245,242,236,.75)'; ctx.font = F(500, 34); ctx.fillText('แผนความคุ้มครองที่ออกแบบสำหรับ', M, 120);
  ctx.fillStyle = '#f5f2ec'; ctx.font = F(700, 76, true); ctx.fillText('คุณ' + (p.nick || ''), M, 215);
  ctx.font = F(500, 36); ctx.fillStyle = 'rgba(245,242,236,.85)'; ctx.fillText(`${r.pkg.name} · ระดับ${TIER_LABEL[tier]}`, M, 285);
  // รายการแผน
  let y = 400;
  const t = resolveTier(r.pkg, tier, isClosed);
  const catColor = { life: '#3b5b7a', ci: '#7a3b5b', health: '#2f6b4f', hb: '#9a6b1f', accident: '#a44a2a', saving: '#2a6f73', annuity: '#4a4a8a', senior: '#6b5847' };
  for (const it of t.items) {
    const pl = PLAN[it.plan]; if (!pl) continue;
    ctx.fillStyle = '#fffdf9'; roundRect(ctx, M, y, W - M * 2, 118, 26); ctx.fill();
    ctx.fillStyle = catColor[pl.cat] || '#1d2422'; roundRect(ctx, M + 26, y + 30, 10, 58, 5); ctx.fill();
    ctx.fillStyle = '#1d2422'; ctx.font = F(600, 40); ctx.fillText(pl.short, M + 62, y + 58);
    ctx.fillStyle = '#4a524f'; ctx.font = F(400, 30); ctx.fillText(it.sa + ' · ' + CAT[pl.cat].name, M + 62, y + 98);
    y += 136;
  }
  // เหตุผล
  y += 56;
  ctx.fillStyle = '#1d2422'; ctx.font = F(700, 38, true); ctx.fillText('ทำไมถึงเหมาะกับคุณ', M, y); y += 56;
  ctx.font = F(400, 31);
  for (const reason of r.reasons.slice(0, 2)) {
    const lines = wrap(ctx, reason, W - M * 2 - 44).slice(0, 3);
    ctx.fillStyle = '#2f6b4f'; ctx.fillText('✓', M, y);
    ctx.fillStyle = '#1d2422'; lines.forEach((ln, i) => ctx.fillText(ln, M + 44, y + i * 44));
    y += lines.length * 44 + 18;
  }
  // ท้ายภาพ
  ctx.fillStyle = '#e9e3d8'; ctx.fillRect(M, H - 210, W - M * 2, 2);
  ctx.fillStyle = '#1d2422'; ctx.font = F(600, 32); ctx.fillText(`${pr.name} · ${pr.title}`, M, H - 158);
  ctx.fillStyle = '#4a524f'; ctx.font = F(400, 27);
  ctx.fillText(`${pr.company} · รหัสตัวแทน ${pr.agentCode}${pr.licenseLife ? ' · ใบอนุญาต ' + pr.licenseLife : ''}${pr.phone ? ' · โทร ' + pr.phone : ''}`, M, H - 116);
  ctx.font = F(400, 22); ctx.fillStyle = '#7b827e';
  wrap(ctx, 'เบี้ยจริงตามใบเสนอจากระบบ AIA · ' + DISCLAIMER, W - M * 2).slice(0, 2).forEach((ln, i) => ctx.fillText(ln, M, H - 74 + i * 30));

  const blob = await new Promise((res) => cv.toBlob(res, 'image/png'));
  const file = new File([blob], `แผน-${p.nick || 'ลูกค้า'}.png`, { type: 'image/png' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'แผนความคุ้มครอง' }); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  const a = h('a', { href: URL.createObjectURL(blob), download: file.name }); document.body.append(a); a.click(); a.remove();
  toast('บันทึกภาพแล้ว — ส่งต่อทาง LINE ได้เลย');
}
function roundRect(ctx, x, y, w, hgt, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + hgt, r); ctx.arcTo(x + w, y + hgt, x, y + hgt, r); ctx.arcTo(x, y + hgt, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
