// ─── คำศัพท์มีคำอธิบาย: ครอบคำในข้อความด้วยปุ่ม แตะแล้วมีกล่องอธิบายภาษาง่ายเด้งขึ้น ───
import { h } from './ui.js';
import { GLOSSARY } from '../data/rules.js';

const TERMS = [...GLOSSARY].sort((a, b) => b[0].length - a[0].length); // คำยาวก่อน กันจับคำสั้นซ้อน
const DEF = Object.fromEntries(GLOSSARY);
const RE = new RegExp('(' + TERMS.map(([t]) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')', 'i');

let pop = null;
function closePop() { if (!pop) return; pop.el.remove(); pop.btn.setAttribute('aria-expanded', 'false'); document.removeEventListener('keydown', pop.onKey, true); document.removeEventListener('pointerdown', pop.onOut, true); pop = null; }

export function openTerm(btn, word) {
  if (pop && pop.btn === btn) { closePop(); return; }
  closePop();
  const key = Object.keys(DEF).find((k) => k.toLowerCase() === word.toLowerCase()) || word;
  const el = h('div.term-pop', { role: 'dialog', 'aria-label': 'ความหมายของ ' + key, tabindex: '-1' },
    h('b', key), h('p', DEF[key] || ''), h('a', { href: '#/tools/glossary?q=' + encodeURIComponent(key) }, 'ดูคำศัพท์ทั้งหมด'));
  document.body.append(el);
  const r = btn.getBoundingClientRect(); const w = Math.min(320, window.innerWidth - 24);
  el.style.width = w + 'px';
  el.style.left = Math.max(12, Math.min(window.innerWidth - w - 12, r.left + r.width / 2 - w / 2)) + 'px';
  const below = r.bottom + 8 + el.offsetHeight < window.innerHeight;
  el.style.top = (below ? r.bottom + 8 : Math.max(8, r.top - el.offsetHeight - 8)) + 'px';
  btn.setAttribute('aria-expanded', 'true');
  const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); closePop(); btn.focus(); } };
  const onOut = (e) => { if (!el.contains(e.target) && e.target !== btn) closePop(); };
  document.addEventListener('keydown', onKey, true);
  setTimeout(() => document.addEventListener('pointerdown', onOut, true), 0);
  pop = { el, btn, onKey, onOut };
  el.focus({ preventScroll: true });
}
window.addEventListener('hashchange', closePop);
window.addEventListener('scroll', closePop, { passive: true, capture: true });

export function termButton(word, label = word) {
  return h('button.term', { type: 'button', 'aria-expanded': 'false', 'aria-label': `${label} (แตะดูความหมาย)`, onclick: (e) => { e.stopPropagation(); openTerm(e.currentTarget, word); } }, label);
}

/** ข้อความ → [text, ปุ่มคำศัพท์, text, …] ครอบแค่ครั้งแรกของแต่ละคำ */
export function glossify(text) {
  if (typeof text !== 'string' || !text) return text;
  const out = []; const used = new Set(); let rest = text; let guard = 0;
  while (rest && guard++ < 12) {
    const m = rest.match(RE);
    if (!m) break;
    const word = m[1]; const k = word.toLowerCase();
    if (used.has(k)) { out.push(rest.slice(0, m.index + word.length)); rest = rest.slice(m.index + word.length); continue; }
    used.add(k);
    out.push(rest.slice(0, m.index), termButton(word));
    rest = rest.slice(m.index + word.length);
  }
  out.push(rest);
  return out.filter((x) => x !== '');
}
