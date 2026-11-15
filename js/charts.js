// กราฟ SVG แบบเบา ๆ (ไม่ใช้ไลบรารี)
const NS = 'http://www.w3.org/2000/svg';
function s(tag, attrs = {}, text) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  if (text != null) el.textContent = text;
  return el;
}
const shortNum = (n) => n >= 1e6 ? (n / 1e6).toFixed(n % 1e6 ? 1 : 0) + 'M' : n >= 1e3 ? Math.round(n / 1e3) + 'k' : String(n);

/** แถบเวลา: ช่วงจ่ายเบี้ย vs ช่วงคุ้มครอง (คำนวณจากอายุตัวอย่าง) */
export function timelineChart(tl, { age = 35, color = 'var(--ink)' } = {}) {
  const W = 480, H = 132, L = 6, R = 6;
  const endAge = tl.coverToAge || (tl.coverYears ? age + tl.coverYears : null) || (tl.renewToAge ? tl.renewToAge + 1 : null) || 99;
  const startAge = age;
  const span = Math.max(1, endAge - startAge);
  const x = (a) => L + ((a - startAge) / span) * (W - L - R);
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart', role: 'img', 'aria-label': 'กราฟระยะเวลาจ่ายเบี้ยและความคุ้มครอง' });
  // แถบคุ้มครอง
  svg.append(s('text', { x: L, y: 14 }, 'คุ้มครอง'));
  svg.append(s('rect', { x: x(startAge), y: 20, width: x(endAge) - x(startAge), height: 22, rx: 6, fill: color, opacity: .18 }));
  svg.append(s('text', { x: x(endAge) - 4, y: 36, 'text-anchor': 'end', style: 'fill:var(--ink);font-weight:600' }, `ถึงอายุ ${endAge}`));
  // แถบจ่ายเบี้ย
  const payEnd = tl.payToAge || (tl.payYears ? startAge + tl.payYears : tl.payOptions ? startAge + Math.max(...tl.payOptions) : tl.coverSameAsPay ? endAge : null);
  svg.append(s('text', { x: L, y: 62 }, tl.rider || tl.yearly ? 'ชำระเบี้ย (ปีต่อปี ตามอายุ)' : 'ชำระเบี้ย'));
  if (payEnd) {
    svg.append(s('rect', { x: x(startAge), y: 68, width: Math.max(4, x(Math.min(payEnd, endAge)) - x(startAge)), height: 22, rx: 6, fill: color }));
    if (tl.payOptions && tl.payOptions.length > 1) {
      for (const yv of tl.payOptions) {
        const xx = x(startAge + yv);
        svg.append(s('line', { x1: xx, x2: xx, y1: 66, y2: 92, stroke: 'var(--card)', 'stroke-width': 2 }));
        svg.append(s('text', { x: xx, y: 108, 'text-anchor': 'middle' }, yv + ' ปี'));
      }
    } else svg.append(s('text', { x: x(Math.min(payEnd, endAge)), y: 106, 'text-anchor': 'middle' }, `อายุ ${Math.min(payEnd, endAge)}`));
  } else {
    svg.append(s('rect', { x: x(startAge), y: 68, width: x(endAge) - x(startAge), height: 22, rx: 6, fill: color, opacity: .55 }));
  }
  if (tl.incomeFrom) {
    const xi = x(tl.incomeFrom);
    svg.append(s('rect', { x: xi, y: 20, width: x(endAge) - xi, height: 22, rx: 6, fill: color, opacity: .35 }));
    svg.append(s('text', { x: xi + 4, y: 36, style: 'fill:var(--ink)' }, `รับเงินคืน/บำนาญตั้งแต่ ${tl.incomeFrom}`));
  }
  svg.append(s('text', { x: x(startAge), y: 128 }, `เริ่มที่อายุ ${startAge} (ตัวอย่าง)`));
  return svg;
}

/** กราฟเส้น/แท่งหลายชุด */
export function lineChart({ x, series, unit }, { type = 'line' } = {}) {
  const W = 480, H = 230, L = 46, R = 10, T = 12, B = 30;
  const max = Math.max(1, ...series.flatMap((sr) => sr.data));
  const niceMax = Math.ceil(max / Math.pow(10, Math.floor(Math.log10(max)))) * Math.pow(10, Math.floor(Math.log10(max)));
  const xs = (i) => L + (x.length === 1 ? (W - L - R) / 2 : (i / (x.length - 1)) * (W - L - R));
  const ys = (v) => T + (1 - v / niceMax) * (H - T - B);
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart', role: 'img', 'aria-label': unit || 'กราฟ' });
  for (let k = 0; k <= 4; k++) {
    const v = (niceMax / 4) * k; const yy = ys(v);
    svg.append(s('line', { x1: L, x2: W - R, y1: yy, y2: yy, class: k ? 'grid' : 'axis' }));
    svg.append(s('text', { x: L - 6, y: yy + 4, 'text-anchor': 'end' }, shortNum(v)));
  }
  x.forEach((lab, i) => svg.append(s('text', { x: xs(i), y: H - 10, 'text-anchor': 'middle' }, lab)));
  const colors = ['var(--primary)', 'var(--accent)', 'var(--c-saving)', 'var(--c-annuity)'];
  series.forEach((sr, si) => {
    const c = colors[si % colors.length];
    if (type === 'bar') {
      const bw = Math.max(6, ((W - L - R) / x.length) * 0.6 / series.length);
      sr.data.forEach((v, i) => svg.append(s('rect', { x: xs(i) - (bw * series.length) / 2 + si * bw, y: ys(v), width: bw - 2, height: ys(0) - ys(v), rx: 3, fill: c })));
    } else {
      const d = sr.data.map((v, i) => `${i ? 'L' : 'M'}${xs(i)},${ys(v)}`).join(' ');
      svg.append(s('path', { d, fill: 'none', stroke: c, 'stroke-width': 2.5, 'stroke-linejoin': 'round' }));
      sr.data.forEach((v, i) => svg.append(s('circle', { cx: xs(i), cy: ys(v), r: 3.5, fill: 'var(--card)', stroke: c, 'stroke-width': 2 })));
    }
  });
  return svg;
}
export function legend(series) {
  const colors = ['var(--primary)', 'var(--accent)', 'var(--c-saving)', 'var(--c-annuity)'];
  const d = document.createElement('div'); d.className = 'legend';
  series.forEach((sr, i) => { const sp = document.createElement('span'); sp.innerHTML = `<i style="background:${colors[i % 4]}"></i>`; sp.append(sr.name); d.append(sp); });
  return d;
}
