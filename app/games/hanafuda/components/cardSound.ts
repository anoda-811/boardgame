export type CardSound = "slap" | "place" | "flip";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let reverb: ConvolverNode | null = null;

function roomImpulse(ac: BaseAudioContext) {
  const length = Math.floor(ac.sampleRate * 0.28);
  const buffer = ac.createBuffer(2, length, ac.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < length; i++) {
      lp += ((Math.random() * 2 - 1) - lp) * 0.2;
      data[i] = lp * Math.pow(1 - i / length, 4);
    }
  }
  return buffer;
}

function audio() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
    reverb = ctx.createConvolver();
    reverb.buffer = roomImpulse(ctx);
    const wet = ctx.createGain();
    wet.gain.value = 0.12;
    reverb.connect(wet).connect(master);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** Unlocks audio on browsers that require a user gesture before playback. */
export function primeCardAudio() {
  audio();
}

function noise(ac: BaseAudioContext, seconds: number, decay: number) {
  const sr = ac.sampleRate;
  const length = Math.floor(sr * seconds);
  const buffer = ac.createBuffer(1, length, sr);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sr * decay));
  }
  return buffer;
}

function band(
  ac: BaseAudioContext,
  input: AudioNode,
  output: AudioNode,
  type: BiquadFilterType,
  freq: number,
  q: number,
  gain: number,
) {
  const f = ac.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ac.createGain();
  g.gain.value = gain;
  input.connect(f).connect(g).connect(output);
}

/** A stiff hanafuda card striking a wooden table. */
function slap(ac: AudioContext, when: number, strength: number) {
  const out = ac.createGain();
  out.gain.value = strength;
  out.connect(master!);
  out.connect(reverb!);

  const vary = 1 + (Math.random() - 0.5) * 0.1;
  const src = ac.createBufferSource();
  src.buffer = noise(ac, 0.05, 0.0011);

  // Paper crack.
  band(ac, src, out, "bandpass", 3600 * vary, 0.9, 1.3);
  band(ac, src, out, "highpass", 6000, 0.7, 0.35);
  // Card body snap.
  band(ac, src, out, "bandpass", 1350 * vary, 5, 2.6);
  band(ac, src, out, "bandpass", 820 * vary, 7, 2.2);
  // Table knock.
  band(ac, src, out, "bandpass", 190, 9, 6 * strength);
  band(ac, src, out, "bandpass", 330, 10, 4 * strength);

  src.start(when);
  window.setTimeout(() => out.disconnect(), (when - ac.currentTime + 1) * 1000);
}

/** The soft slide of a card drawn from the pile. */
function swish(ac: AudioContext, when: number) {
  const out = ac.createGain();
  out.gain.setValueAtTime(0, when);
  out.gain.linearRampToValueAtTime(0.5, when + 0.05);
  out.gain.exponentialRampToValueAtTime(0.001, when + 0.16);
  out.connect(master!);

  const src = ac.createBufferSource();
  src.buffer = noise(ac, 0.2, 1);
  const f = ac.createBiquadFilter();
  f.type = "bandpass";
  f.Q.value = 1.2;
  f.frequency.setValueAtTime(1800, when);
  f.frequency.exponentialRampToValueAtTime(4200, when + 0.15);
  src.connect(f).connect(out);
  src.start(when);
  src.stop(when + 0.2);
  window.setTimeout(() => out.disconnect(), (when - ac.currentTime + 0.6) * 1000);
}

export function playCardSound(kind: CardSound, delayMs = 0) {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + delayMs / 1000 + 0.01;
  if (kind === "flip") swish(ac, t);
  else slap(ac, t, kind === "slap" ? 1.15 : 0.75);
}
