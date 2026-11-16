// ─── แปลงไฟล์ที่เบราว์เซอร์เปิดไม่ได้ (.avi, .mkv, HEVC บางแบบ) เป็น MP4 ในเครื่อง ด้วย ffmpeg.wasm ───
// ตัวหลักขนาด ~32MB โหลดครั้งแรกที่ต้องใช้เท่านั้น (เบราว์เซอร์เก็บแคชไว้ให้)
const CORE = () => window.__FFCORE || 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm/';
let ff = null;

/** ลองเปิดไฟล์ในเบราว์เซอร์: เล่นได้ไหม (มีภาพ/เสียง และรู้ความยาว) */
export function probe(file, kind = 'video') {
  return new Promise((res) => {
    const url = URL.createObjectURL(file); const el = document.createElement(kind); el.preload = 'metadata'; el.muted = true;
    const done = (ok) => { clearTimeout(t); el.removeAttribute('src'); el.load?.(); URL.revokeObjectURL(url); res(ok); };
    const t = setTimeout(() => done(false), 8000);
    el.onloadeddata = () => done(isFinite(el.duration) && el.duration > 0 && (kind === 'audio' || el.videoWidth > 0));
    el.onerror = () => done(false);
    el.src = url;
  });
}

/** แปลงเป็น MP4 (H.264 + AAC) · onStage(text) · onProgress(0..1) */
export async function toMp4(file, { kind = 'video', onStage, onProgress } = {}) {
  if (!ff) {
    onStage?.('กำลังโหลดตัวแปลงไฟล์ (ครั้งแรกประมาณ 32MB)…');
    const { FFmpeg } = await import('../vendor/ffmpeg/index.js');
    const bases = window.__FFCORE ? [window.__FFCORE] : [CORE(), 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm/'];
    let lastErr;
    for (const base of bases) {
      try { ff = new FFmpeg(); await ff.load({ coreURL: base + 'ffmpeg-core.js', wasmURL: base + 'ffmpeg-core.wasm' }); lastErr = null; break; }
      catch (e) { lastErr = e; try { ff.terminate(); } catch {} ff = null; }
    }
    if (lastErr || !ff) throw new Error('โหลดตัวแปลงไฟล์ไม่ได้ (ต้องต่ออินเทอร์เน็ตครั้งแรก)');
  }
  const ext = (file.name.match(/\.(\w+)$/)?.[1] || 'bin').toLowerCase();
  const inName = 'in.' + ext, out = kind === 'audio' ? 'out.m4a' : 'out.mp4';
  const prog = ({ progress }) => onProgress?.(Math.max(0, Math.min(1, progress || 0)));
  ff.on('progress', prog);
  try {
    onStage?.('กำลังแปลงไฟล์ในเครื่อง…');
    await ff.writeFile(inName, new Uint8Array(await file.arrayBuffer()));
    const args = kind === 'audio'
      ? ['-i', inName, '-vn', '-c:a', 'aac', '-b:a', '160k', out]
      : ['-i', inName, '-vf', "scale=w='if(gt(iw,ih),-2,min(iw,1080))':h='if(gt(iw,ih),min(ih,1080),-2)'", '-r', '30', '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-ac', '2', '-movflags', '+faststart', out];
    const code = await ff.exec(args);
    if (code !== 0) throw new Error('แปลงไฟล์ไม่สำเร็จ (ไฟล์อาจเสีย หรือเป็นรูปแบบที่ไม่รองรับ)');
    const data = await ff.readFile(out);
    const name = file.name.replace(/\.\w+$/, '') + (kind === 'audio' ? '.m4a' : '.mp4');
    return new File([data.buffer], name, { type: kind === 'audio' ? 'audio/mp4' : 'video/mp4' });
  } finally {
    ff.off('progress', prog);
    for (const f of [inName, out]) await ff.deleteFile(f).catch(() => {});
  }
}
