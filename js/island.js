// ─── ไดนามิกไอส์แลนด์: แถบสดด้านบน ระหว่างโทรรวด หรือใกล้/กำลังมีนัด ───
import { h, icon, todayISO } from './ui.js';
import * as store from './store.js';

let el = null, timer = null;
const mmss = (s) => { const a = Math.abs(s); return String(Math.floor(a / 60)).padStart(2, '0') + ':' + String(a % 60).padStart(2, '0'); };
function powerHour() { try { const p = JSON.parse(sessionStorage.getItem('advdesk.v1.powerhour') || 'null'); return p?.running && p.start ? p : null; } catch { return null; } }
function state() {
  const path = location.hash.slice(1).split('?')[0];
  const ph = powerHour();
  if (ph && path !== '/work/call') {
    const left = Math.round((ph.start + ph.minutes * 60000 - (ph.pausedAt || Date.now())) / 1000);
    const appts = (ph.results || []).filter((x) => x.r === 'appt').length;
    return { k: 'ph', fast: !ph.pausedAt, href: '#/work/call', ic: 'phone', t: ph.pausedAt ? 'โทรรวด · พักอยู่' : 'โทรรวด', v: left >= 0 ? mmss(left) : 'หมดเวลา', s: `ได้นัด ${appts}`, label: `โหมดโทรรวด เหลือ ${mmss(left)} นาที ได้นัด ${appts}` };
  }
  const today = todayISO(); const now = new Date(); const mins = now.getHours() * 60 + now.getMinutes();
  const cs = Object.fromEntries(store.all('clients').map((c) => [c.id, c]));
  const list = store.all('appts').filter((a) => a.date === today && a.time && a.status === 'planned').map((a) => { const [hh, mm] = a.time.split(':').map(Number); return { a, d: hh * 60 + mm - mins }; }).filter((x) => x.d <= 30 && x.d >= -60).sort((x, y) => Math.abs(x.d) - Math.abs(y.d));
  if (list.length) {
    const { a, d } = list[0]; const c = cs[a.clientId]; const who = c ? 'คุณ' + (c.nick || c.name) : (a.title || 'นัด');
    return d > 0 ? { k: 'soon', href: c ? '#/client/' + c.id : '#/work/calendar', ic: 'cal', t: who, v: `อีก ${d} นาที`, s: a.place || a.time, label: `นัด ${who} อีก ${d} นาที` }
      : { k: 'now', href: c ? '#/client/' + c.id : '#/work/calendar', ic: 'chat', t: 'กำลังนัด ' + who, v: `${-d} นาที`, s: 'แตะเพื่อบันทึกผล', label: `กำลังนัด ${who}` };
  }
  return null;
}
function paint() {
  const b = document.body;
  const off = b.classList.contains('public') || b.classList.contains('presenting') || b.classList.contains('client-mode');
  const s = off ? null : state();
  if (!el) { el = h('a.island', { hidden: true }); document.body.append(el); }
  document.body.classList.toggle('has-island', !!s);
  if (!s) { el.hidden = true; schedule(30000); return; }
  const was = el.hidden; el.hidden = false; el.href = s.href; el.dataset.k = s.k; el.setAttribute('aria-label', s.label);
  el.replaceChildren(h('span.is-dot'), h('span.is-ic', icon(s.ic)), h('span.is-t', h('b', s.t), h('small', s.s)), h('span.is-v', s.v));
  if (was) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
  schedule(s.fast ? 1000 : 20000);
}
function schedule(ms) { clearTimeout(timer); timer = setTimeout(paint, ms); }
export function initIsland() {
  paint();
  window.addEventListener('hashchange', () => setTimeout(paint, 50));
  store.onChange(() => setTimeout(paint, 50));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) paint(); });
}
