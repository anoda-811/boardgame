export type TileSound = "discard" | "call" | "riichi" | "win" | "draw";

// Resonances of a small, dense tile: bright and short.
const TILE_MODES: [number, number, number][] = [
  [2350, 16, 1.0],
  [3480, 18, 0.7],
  [5100, 20, 0.45],
  [7200, 22, 0.25],
];

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let reverb: ConvolverNode | null = null;

function roomImpulse(ac: BaseAudioContext) {
  const length = Math.floor(ac.sampleRate * 0.35);
  const buffer = ac.createBuffer(2, length, ac.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < length; i++) {
      lp += ((Math.random() * 2 - 1) - lp) * 0.25;
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
    master.gain.value = 0.8;
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

export function primeTileAudio() {
  audio();
}

function impulse(ac: BaseAudioContext) {
  const sr = ac.sampleRate;
  const length = Math.floor(sr * 0.015);
  const buffer = ac.createBuffer(1, length, sr);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sr * 0.0005));
  }
  return buffer;
}

/** One tile meeting the felt-covered table. */
function clack(ac: AudioContext, when: number, level = 1, pitch = 1) {
  const bus = ac.createGain();
  bus.gain.value = level;
  bus.connect(master!);
  bus.connect(reverb!);

  const src = ac.createBufferSource();
  src.buffer = impulse(ac);
  const detune = pitch * (1 + (Math.random() - 0.5) * 0.1);
  for (const [freq, q, g] of TILE_MODES) {
    const band = ac.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = freq * detune;
    band.Q.value = q;
    const amp = ac.createGain();
    amp.gain.value = g * 7;
    src.connect(band).connect(amp).connect(bus);
  }
  // Felt thump underneath.
  const thump = ac.createBiquadFilter();
  thump.type = "lowpass";
  thump.frequency.value = 420;
  const thumpGain = ac.createGain();
  thumpGain.gain.value = 2.2;
  src.connect(thump).connect(thumpGain).connect(bus);

  src.start(when);
  window.setTimeout(() => bus.disconnect(), (when - ac.currentTime + 1) * 1000);
}

export function playTileSound(kind: TileSound, delayMs = 0) {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + delayMs / 1000 + 0.01;
  switch (kind) {
    case "draw":
      clack(ac, t, 0.25, 1.1);
      break;
    case "discard":
      clack(ac, t, 1);
      break;
    case "riichi":
      clack(ac, t, 1.1, 0.95);
      clack(ac, t + 0.22, 0.6, 1.25);
      break;
    case "call":
      clack(ac, t, 0.9);
      clack(ac, t + 0.07, 0.7, 1.05);
      clack(ac, t + 0.13, 0.8, 0.97);
      break;
    case "win":
      // The hand being laid down tile by tile.
      for (let i = 0; i < 12; i++) clack(ac, t + i * 0.028 + Math.random() * 0.01, 0.55, 0.9 + Math.random() * 0.2);
      break;
  }
}
