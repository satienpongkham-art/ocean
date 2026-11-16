// Service worker: ใช้งานออฟไลน์ (เก็บไฟล์แอปไว้ในเครื่อง)
// เปลี่ยนเลข VERSION ทุกครั้งที่แก้ไฟล์ข้อมูล/โค้ด เพื่อให้เครื่องโหลดของใหม่
const VERSION = 'advdesk-2026-11-18-6';
const CORE = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css', 'css/ui2.css', 'css/ui3.css', 'css/ui4.css', 'css/ui5.css', 'css/ui6.css', 'css/ui7.css', 'css/ui8.css', 'css/ui9.css', 'css/ui10.css', 'css/ui11.css', 'css/ui12.css', 'css/ui13.css', 'css/ui14.css', 'js/art.js', 'js/carousel-clip.js', 'js/qr.js', 'js/vendor/qrcode.js', 'js/views/video.js', 'js/video/engine.js', 'js/video/sfx.js', 'js/video/convert.js', 'js/video/music.js', 'js/video/audio.js', 'js/video/asr.js', 'js/video/segment.js', 'js/video/smart.js', 'js/video/recorder.js', 'js/poster.js', 'js/views/poster.js', 'js/suggest.js', 'js/gestures.js', 'assets/emoji/1f4cc.webp', 'js/video/autoedit.js', 'js/vendor/ffmpeg/index.js', 'js/vendor/ffmpeg/classes.js', 'js/vendor/ffmpeg/const.js', 'js/vendor/ffmpeg/errors.js', 'js/vendor/ffmpeg/types.js', 'js/vendor/ffmpeg/utils.js', 'js/vendor/ffmpeg/worker.js', 'data/emoji.js', 'js/coach.js', 'data/libextra.js', 'data/facts.js', 'js/views/facts.js', 'js/views/stages.js', 'js/library.js', 'js/views/studio2.js', 'data/studio.js', 'data/lib/money.js', 'data/lib/protect.js', 'data/lib/invest.js', 'data/lib/ai.js', 'data/lib/plan.js', 'data/lib/story.js', 'data/lib/check.js', 'js/features.js', 'js/lock.js', 'js/morning.js', 'js/views/menu.js', 'js/views/report.js', 'js/views/public.js', 'js/basket.js', 'js/anim.js', 'js/theme.js', 'js/island.js', 'js/tilt.js', 'js/views/timemachine.js', 'data/holidays.js', 'js/carousel.js', 'js/fx.js', 'js/engine/calc.js', 'data/brand.js', 'js/views/studio.js', 'js/views/brand.js', 'js/avatars.js', 'js/card.js', 'data/content.js', 'js/views/planviz.js', 'js/views/content.js', 'js/illus.js', 'js/views/planpage.js', 'js/views/story.js', 'js/views/finder.js', 'js/views/proposal.js', 'js/undo.js', 'js/changelog.js', 'js/views/lists.js', 'js/views/simulate.js', 'js/views/plantools.js', 'js/views/share.js', 'js/glossary.js', 'js/engine/premium.js', 'data/rules.js', 'js/views/calendar.js', 'js/views/train.js', 'js/pwa.js', 'js/views/sales.js', 'js/views/compare.js', 'js/views/present.js', 'js/views/search.js', 'assets/icon-192.png', 'assets/favicon-64.png', 
  'js/app.js', 'js/ui.js', 'js/store.js', 'js/charts.js',
  'js/engine/tax.js', 'js/engine/needs.js', 'js/engine/recommend.js', 'js/engine/work.js',
  'js/views/today.js', 'js/views/plans.js', 'js/views/packages.js', 'js/views/advisor.js', 'js/views/clients.js', 'js/views/common.js',
  'js/views/fhc.js', 'js/views/mandala.js', 'js/views/work.js', 'js/views/tools.js', 'js/views/tax.js', 'js/views/captions.js',
  'data/plans.js', 'data/plans-life.js', 'data/plans-ci.js', 'data/plans-health.js', 'data/plans-accident.js', 'data/plans-saving.js',
  'data/packages.js', 'data/cases.js', 'data/objections.js', 'data/captions.js', 'data/profile.js', 'apps-script/Code.gs',
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.hostname.endsWith('script.google.com') || url.hostname.endsWith('googleusercontent.com')) return; // ซิงก์: ไม่แคช
  if (url.origin === location.origin) {
    // network-first สำหรับไฟล์ของแอป (ได้ข้อมูลแผนล่าสุดเมื่อออนไลน์) และ fallback แคชเมื่อออฟไลน์
    e.respondWith(fetch(e.request, { cache: 'no-cache' }).then((r) => { const cp = r.clone(); caches.open(VERSION).then((c) => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request).then((r) => r || caches.match('index.html'))));
  } else if (url.hostname.includes('fonts.g')) {
    e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request).then((res) => { const cp = res.clone(); caches.open(VERSION).then((c) => c.put(e.request, cp)); return res; })));
  }
});
