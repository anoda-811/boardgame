export type MoveSound = "move" | "capture" | "check";

type KnockOptions = { pitch?: number; level?: number; weight?: number };

// [frequency Hz, Q, gain] — resonances of a small, dense boxwood piece.
const PIECE_MODES: [number, number, number][] = [
  [1080, 22, 1.0],
  [1740, 25, 0.75],
  [2630, 28, 0.5],
  [3900, 30, 0.28],
];

// Heavily damped low modes of a thick hardwood board.
const BOARD_MODES: [number, number, number][] = [
  [165, 10, 1.0],
  [290, 11, 0.8],
  [455, 12, 0.55],
  [640, 12, 0.35],
];

const PIECE_GAIN = 9;
const BOARD_GAIN = 11;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let reverb: ConvolverNode | null = null;

function roomImpulse(ac: BaseAudioContext) {
  const length = Math.floor(ac.sampleRate * 0.3);
  const buffer = ac.createBuffer(2, length, ac.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < length; i++) {
      const t = i / length;
      // One-pole low-pass keeps the tail warm like a wood-panelled room.
      lp += ((Math.random() * 2 - 1) - lp) * 0.18;
      data[i] = lp * Math.pow(1 - t, 4);
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
    wet.gain.value = 0.1;
    reverb.connect(wet).connect(master);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** Unlocks audio on browsers that require a user gesture before playback. */
export function primeAudio() {
  audio();
}

/** A sharp impact: the piece's felt-less base meeting the board, with a tiny edge-first bounce. */
function impact(ac: BaseAudioContext) {
  const sr = ac.sampleRate;
  const length = Math.floor(sr * 0.02);
  const buffer = ac.createBuffer(1, length, sr);
  const data = buffer.getChannelData(0);
  const bounce = Math.floor(sr * (0.003 + Math.random() * 0.004));
  for (let i = 0; i < length; i++) {
    const first = Math.exp(-i / (sr * 0.0006));
    const second = i >= bounce ? 0.45 * Math.exp(-(i - bounce) / (sr * 0.0005)) : 0;
    data[i] = (Math.random() * 2 - 1) * (first + second);
  }
  return buffer;
}

function resonatorBank(
  ac: BaseAudioContext,
  input: AudioNode,
  output: AudioNode,
  modes: [number, number, number][],
  scale: number,
  gain: number,
) {
  for (const [freq, q, g] of modes) {
    const band = ac.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = freq * scale;
    band.Q.value = q;
    const amp = ac.createGain();
    amp.gain.value = g * gain;
    input.connect(band).connect(amp).connect(output);
  }
}

/** One strike of a hardwood piece on a wooden board, routed into `dest`. */
export function knock(
  ac: BaseAudioContext,
  dest: AudioNode,
  when: number,
  { pitch = 1, level = 1, weight = 1 }: KnockOptions = {},
) {
  const out = ac.createGain();
  out.gain.value = level;

  const highpass = ac.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = 70;
  const tone = ac.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.value = 6500;
  out.connect(highpass).connect(tone).connect(dest);

  const src = ac.createBufferSource();
  src.buffer = impact(ac);

  const detune = 1 + (Math.random() - 0.5) * 0.08;
  resonatorBank(ac, src, out, PIECE_MODES, pitch * detune, PIECE_GAIN);
  resonatorBank(ac, src, out, BOARD_MODES, 1 + (Math.random() - 0.5) * 0.04, BOARD_GAIN * weight);

  const contact = ac.createBiquadFilter();
  contact.type = "highpass";
  contact.frequency.value = 2500;
  const contactGain = ac.createGain();
  contactGain.gain.value = 0.12;
  src.connect(contact).connect(contactGain).connect(out);

  src.start(when);
  return out;
}

function play(ac: AudioContext, when: number, opts: KnockOptions = {}) {
  const bus = ac.createGain();
  bus.connect(master!);
  bus.connect(reverb!);
  knock(ac, bus, when, opts);
  window.setTimeout(() => bus.disconnect(), (when - ac.currentTime + 1) * 1000);
}

export function playMoveSound(kind: MoveSound, delayMs = 0) {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + delayMs / 1000 + 0.01;

  if (kind === "capture") {
    play(ac, t, { pitch: 0.9, level: 1.1, weight: 1.3 });
    play(ac, t + 0.085, { pitch: 1.15, level: 0.4, weight: 0.45 });
  } else if (kind === "check") {
    play(ac, t, { level: 1 });
    play(ac, t + 0.17, { pitch: 1.08, level: 0.75, weight: 0.8 });
  } else {
    play(ac, t);
  }
}
