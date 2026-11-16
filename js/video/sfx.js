// ─── เสียงประกอบคลิป: สังเคราะห์ในเครื่องด้วย WebAudio (ไม่ใช้ไฟล์เสียงของใคร ไม่ติดลิขสิทธิ์) ───
let noiseBuf = null;
function noise(ctx) {
  if (noiseBuf && noiseBuf.sampleRate === ctx.sampleRate) return noiseBuf;
  const len = ctx.sampleRate * 1.2; noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return noiseBuf;
}
function env(ctx, g, t, a, peak, dcy) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dcy); }

export const SFX = {
  /** ฟิ้ว: ลมพัดผ่าน ใช้ตอนเปลี่ยนช็อต/ซูม */
  whoosh(ctx, out, t, v = 1) {
    const src = ctx.createBufferSource(); src.buffer = noise(ctx);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.4;
    bp.frequency.setValueAtTime(380, t); bp.frequency.exponentialRampToValueAtTime(3200, t + 0.18); bp.frequency.exponentialRampToValueAtTime(900, t + 0.34);
    const g = ctx.createGain(); env(ctx, g, t, 0.12, 0.5 * v, 0.24);
    src.connect(bp).connect(g).connect(out); src.start(t); src.stop(t + 0.4);
  },
  /** ป๊อป: สติกเกอร์เด้งขึ้น */
  pop(ctx, out, t, v = 1) {
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(820, t); o.frequency.exponentialRampToValueAtTime(190, t + 0.09);
    const g = ctx.createGain(); env(ctx, g, t, 0.004, 0.55 * v, 0.1);
    o.connect(g).connect(out); o.start(t); o.stop(t + 0.14);
  },
  /** ติ๊ง: คำสำคัญ */
  ding(ctx, out, t, v = 1) {
    for (const [f, a] of [[1318.5, 0.22], [1975.5, 0.12], [2637, 0.05]]) {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      const g = ctx.createGain(); env(ctx, g, t, 0.004, a * v, 0.7);
      o.connect(g).connect(out); o.start(t); o.stop(t + 0.75);
    }
  },
  /** ติ๊ก: ตัวหนังสือขึ้น (เบามาก) */
  tick(ctx, out, t, v = 1) {
    const src = ctx.createBufferSource(); src.buffer = noise(ctx);
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3500;
    const g = ctx.createGain(); env(ctx, g, t, 0.002, 0.16 * v, 0.03);
    src.connect(hp).connect(g).connect(out); src.start(t); src.stop(t + 0.05);
  },
  /** ตุ้บ: เข้าฉากใหม่ เบสต่ำ */
  boom(ctx, out, t, v = 1) {
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.35);
    const g = ctx.createGain(); env(ctx, g, t, 0.006, 0.7 * v, 0.42);
    o.connect(g).connect(out); o.start(t); o.stop(t + 0.5);
  },
};
export const SFX_NAMES = { whoosh: 'ฟิ้ว', pop: 'ป๊อป', ding: 'ติ๊ง', tick: 'ติ๊ก', boom: 'ตุ้บ' };
