// ─── ภาพประกอบลายเส้นตามหมวดแผน (SVG ในตัว ไม่ต้องโหลด) ───
// สีใช้ currentColor = สีหมวด (--cc) · พื้นหลังเป็นวงกลมจาง ๆ
const A = {
  life: '<path d="M30 70h60"/><path d="M60 26c-14 0-25 10-25 24h50c0-14-11-24-25-24z"/><path d="M60 50v20"/><circle cx="44" cy="62" r="5"/><circle cx="76" cy="62" r="5"/><path d="M40 70v-3M80 70v-3"/>',
  health: '<rect x="34" y="28" width="52" height="42" rx="10"/><path d="M60 38v22M49 49h22"/><path d="M26 74h68"/>',
  ci: '<path d="M60 72s-24-14-24-32a12 12 0 0 1 24-6 12 12 0 0 1 24 6c0 18-24 32-24 32z"/><path d="M38 50h10l4-7 6 14 4-7h20"/>',
  hb: '<path d="M26 70V36M26 58h68v12M94 58v-6a8 8 0 0 0-8-8H58v14"/><circle cx="40" cy="50" r="6"/><path d="M70 30l4-6 4 6M74 24v10"/>',
  accident: '<rect x="30" y="40" width="60" height="22" rx="11" transform="rotate(-25 60 51)"/><path d="M52 46h.01M60 52h.01M68 46h.01M60 40h.01"/><path d="M26 74h68"/>',
  saving: '<ellipse cx="60" cy="34" rx="22" ry="8"/><path d="M38 34v12c0 4 10 8 22 8s22-4 22-8V34"/><path d="M38 46v12c0 4 10 8 22 8s22-4 22-8V46"/><path d="M92 28l6-6M98 22v6h-6"/>',
  annuity: '<path d="M28 70h64"/><path d="M40 70a20 20 0 0 1 40 0"/><path d="M60 28v8M41 36l5 5M79 36l-5 5M32 52h6M82 52h6"/>',
  senior: '<circle cx="54" cy="30" r="6"/><path d="M54 38v16l-6 16M54 54l8 16M54 44l12 6"/><path d="M72 50v22"/><path d="M26 74h68"/>',
  empty: '<rect x="36" y="26" width="48" height="44" rx="8"/><path d="M46 40h28M46 50h20M46 60h12"/><circle cx="84" cy="66" r="10"/><path d="M91 73l6 6"/>',
  finder: '<circle cx="54" cy="46" r="18"/><path d="M67 59l14 14"/><path d="M48 46l4 4 8-9"/>',
  tools: '<rect x="30" y="44" width="60" height="28" rx="6"/><path d="M48 44v-8a4 4 0 0 1 4-4h16a4 4 0 0 1 4 4v8M30 56h60"/><path d="M56 56v6h8v-6"/>',
  clients: '<circle cx="48" cy="40" r="10"/><path d="M30 72c0-11 8-18 18-18s18 7 18 18"/><circle cx="76" cy="44" r="8"/><path d="M68 58c2-1 5-2 8-2 8 0 14 6 14 16"/>',
  calendar: '<rect x="32" y="30" width="56" height="44" rx="8"/><path d="M32 44h56M46 24v12M74 24v12"/><path d="M44 56h6M57 56h6M70 56h6M44 65h6M57 65h6"/>',
  money: '<path d="M28 72h64"/><rect x="34" y="52" width="10" height="20" rx="2"/><rect x="52" y="42" width="10" height="30" rx="2"/><rect x="70" y="30" width="10" height="42" rx="2"/><path d="M34 40l18-12 12 6 20-12"/><path d="M78 22h6v6"/>',
  time: '<circle cx="60" cy="50" r="22"/><path d="M60 38v12l8 6"/><path d="M34 34l-4 10 10-1"/><path d="M33 44a28 28 0 0 1 4-12"/>',
  brand: '<path d="M34 56V44l40-14v40L34 56z"/><path d="M34 44h-6v12h6M44 58l4 14h8l-3-11"/><path d="M84 40l6-4M84 50h8M84 60l6 4"/>',
  story: '<rect x="42" y="20" width="36" height="56" rx="8"/><path d="M48 28h24M48 70h24"/><path d="M54 44l12 6-12 6z"/>',
};
export function illus(name, { size = 120, label } = {}) {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 120 96'); s.setAttribute('width', size); s.setAttribute('height', Math.round(size * 0.8));
  s.setAttribute('class', 'illus'); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor');
  s.setAttribute('stroke-width', '2.4'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round');
  if (label) { s.setAttribute('role', 'img'); s.setAttribute('aria-label', label); } else s.setAttribute('aria-hidden', 'true');
  s.innerHTML = `<circle cx="60" cy="50" r="40" fill="currentColor" opacity=".12" stroke="none"/><circle cx="92" cy="22" r="6" fill="currentColor" opacity=".18" stroke="none"/>${A[name] || A.empty}`;
  return s;
}
