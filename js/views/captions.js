// ─── ตัวสร้างแคปชั่น Facebook / Instagram / TikTok ───
import { h, icon, field, selectEl, inputEl, copyText, seg } from '../ui.js';
import { PLANS, PLAN, CAT, closingInfo } from '../../data/plans.js';
import { PLATFORMS, HOOKS, FORMULAS, TIKTOK_SCRIPT, PAINS, MYTHS, STORIES, CTAS, BASE_TAGS, CAT_TAGS, COMPLIANCE, DISCLAIMER } from '../../data/captions.js';
import { profile } from '../app.js';

const pick = (arr, i) => arr[((i % arr.length) + arr.length) % arr.length];

export function renderCaptions(q = {}) {
  const st = { platform: 'facebook', plan: q.plan && PLAN[q.plan] ? q.plan : (PLANS.find((p) => p.id === 'health-happy') ? 'health-happy' : PLANS[0].id), formula: 'pas', hook: 'question', who: '', cta: 0, seed: 0, sign: true };
  const p0 = PLAN[st.plan]; if (closingInfo(p0)?.days != null) { st.formula = 'urgency'; st.hook = 'urgency'; }
  const out = h('div.stack');

  const build = () => {
    const p = PLAN[st.plan];
    const pr = profile();
    const ci = closingInfo(p);
    const H = p.highlights || [];
    const vars = {
      plan: p.short, tagline: p.tagline, what: p.what, h1: H[0] || '', h2: H[1] || '', h3: H[2] || (p.pros || [])[0] || '',
      who: st.who || (p.bestFor || [])[0] || 'ทุกคนที่อยากวางแผนความคุ้มครอง',
      pain: PAINS[p.cat] || PAINS.health, story: STORIES[p.cat] || STORIES.health,
      myth: (MYTHS[p.cat] || MYTHS.health)[0], truth: (MYTHS[p.cat] || MYTHS.health)[1],
      cta: pick(CTAS, st.cta), days: ci?.days ?? '',
    };
    let hookList = HOOKS[st.hook] || HOOKS.question;
    if (st.hook === 'urgency' && ci?.days == null) hookList = [HOOKS.urgency[1]];
    vars.hook = pick(hookList, st.seed).replace('{days}', vars.days).replace('{plan}', p.short);
    const fill = (t) => t.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
    const formula = FORMULAS.find((f) => f.id === st.formula) || FORMULAS[0];
    const tags = [...new Set([...(CAT_TAGS[p.cat] || []), ...BASE_TAGS])].slice(0, PLATFORMS[st.platform].hashtags);
    const sign = st.sign ? `\n\n—\n${pr.name} · ${pr.title} ${pr.company}\nรหัสตัวแทน ${pr.agentCode}${pr.licenseLife ? ' · ใบอนุญาตเลขที่ ' + pr.licenseLife : ' · ใบอนุญาตเลขที่ (กรอกในโปรไฟล์)'}${pr.line ? '\nLINE: ' + pr.line : ''}${pr.phone ? ' · โทร ' + pr.phone : ''}\n${DISCLAIMER}` : '';
    let caption;
    if (st.platform === 'tiktok') caption = `${vars.hook}\n${p.short} — ${p.tagline}\n${tags.join(' ')}${st.sign ? `\n${pr.name} ตัวแทน AIA ${pr.licenseLife ? 'ใบอนุญาต ' + pr.licenseLife : ''}` : ''}`;
    else caption = fill(formula.tpl) + sign + '\n\n' + tags.join(' ');
    const script = st.platform === 'tiktok' ? fill(TIKTOK_SCRIPT.replace('{hookShort}', vars.hook.length > 40 ? vars.hook.slice(0, 40) + '…' : vars.hook)) : null;
    const carousel = st.platform === 'instagram' ? [vars.hook, vars.pain, `1) ${vars.h1}`, `2) ${vars.h2}`, `3) ${vars.h3}`, `${p.short}: ${p.tagline}`, vars.cta] : null;

    out.replaceChildren(
      h('div.card',
        h('div.card-h', h('h3', 'แคปชั่น ' + PLATFORMS[st.platform].name), h('div.row', { style: { gap: '6px' } },
          h('button.btn.sm', { onclick: () => { st.seed++; st.cta++; build(); } }, icon('sync'), 'สุ่มใหม่'),
          h('button.btn.sm.primary', { onclick: () => copyText(caption) }, icon('copy'), 'คัดลอก'))),
        h('div.caption-out', caption)),
      script ? h('div.card', h('div.card-h', h('h3', 'สคริปต์คลิป 30–60 วินาที'), h('button.btn.sm', { onclick: () => copyText(script) }, icon('copy'), 'คัดลอก')), h('div.caption-out', script)) : null,
      carousel ? h('div.card', h('div.card-h', h('h3', 'ข้อความคาร์รูเซล 7 หน้า')), h('ol.small', { style: { paddingLeft: '18px', margin: 0 } }, carousel.map((x) => h('li', { style: { margin: '6px 0' } }, x)))) : null,
      h('div.card', h('div.card-h', h('h3', 'กติกา ' + PLATFORMS[st.platform].name)), h('ul.ticks.small', PLATFORMS[st.platform].rules.map((r) => h('li', r)))),
      h('div.card', h('div.card-h', h('h3', 'เช็กก่อนโพสต์ (กฎ คปภ.)')), h('div', COMPLIANCE.map((c) => h('label.row.small', { style: { alignItems: 'flex-start', margin: '6px 0' } }, h('input', { type: 'checkbox', style: { marginTop: '4px' } }), c))),
        !pr.licenseLife ? h('div.callout.warn.small', { style: { marginTop: '8px' } }, 'ยังไม่ได้กรอกเลขใบอนุญาต — ', h('a', { href: '#/tools/profile' }, 'กรอกในโปรไฟล์')) : null,
        h('p.source', 'ข้อมูลแผนดึงจากคลังแผนในแอป ตรวจตัวเลขกับเอกสารบริษัทก่อนโพสต์ทุกครั้ง · ภาพประกอบใช้สื่อที่บริษัทอนุมัติ')));
  };

  const opts = h('div.card.stack',
    h('div'), // ที่วางปุ่มเลือกแพลตฟอร์ม (ใส่ด้านล่าง)
    field('แผนที่จะโพสต์', h('select.input', { onchange: (e) => { st.plan = e.target.value; build(); } }, Object.values(CAT).map((c) => h('optgroup', { label: c.name }, PLANS.filter((p) => p.cat === c.id).map((p) => h('option', { value: p.id, selected: p.id === st.plan }, p.short + (closingInfo(p)?.days != null ? ' (ใกล้ปิดรับ)' : ''))))))),
    field('สูตรโพสต์', h('select.input', { onchange: (e) => { st.formula = e.target.value; build(); } }, FORMULAS.map((f) => h('option', { value: f.id, selected: f.id === st.formula }, `${f.name} — ${f.best}`)))),
    field('ประเภทฮุก (ประโยคเปิด)', h('select.input', { onchange: (e) => { st.hook = e.target.value; st.seed = 0; build(); } }, [['question', 'คำถามชวนคิด'], ['myth', 'ความเชื่อผิด ๆ'], ['story', 'เล่าเรื่อง'], ['checklist', 'เช็กลิสต์'], ['urgency', 'นับถอยหลัง / จังหวะเวลา']].map(([v, l]) => h('option', { value: v, selected: v === st.hook }, l)))),
    field('กลุ่มเป้าหมาย', inputEl('who', '', { placeholder: 'เว้นว่าง = ใช้ "เหมาะกับใคร" ของแผน', oninput: (e) => { st.who = e.target.value; build(); } })),
    h('label.row.small', h('input', { type: 'checkbox', checked: true, onchange: (e) => { st.sign = e.target.checked; build(); } }), 'ใส่ชื่อ รหัสตัวแทน ใบอนุญาต และข้อความเตือนท้ายโพสต์'));
  const segWrap = opts.firstChild;
  const onPlat = (v) => { st.platform = v; const n = seg(Object.entries(PLATFORMS).map(([k, x]) => [k, x.name]), v, onPlat); opts.replaceChild(n, opts.firstChild); build(); };
  opts.replaceChild(seg(Object.entries(PLATFORMS).map(([k, x]) => [k, x.name]), st.platform, onPlat), segWrap);

  build();
  return h('div', { 'data-title': 'แคปชั่นโพสต์' },
    h('div.topbar', h('div', h('a.crumb', { href: '#/tools' }, icon('back'), 'เครื่องมือ'), h('h1', 'แคปชั่นโพสต์'), h('div.sub', 'สูตรที่นักการตลาดใช้จริง: ฮุก 2 บรรทัดแรก → ปัญหา → ทางออก → ชวนติดต่อ'))),
    h('div.grid.g2', { style: { alignItems: 'start' } }, opts, out));
}
