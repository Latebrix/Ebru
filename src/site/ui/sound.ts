/** Tiny synthesised water sounds. No files, no network; created on the first user gesture. */
let ctx: AudioContext | null = null;
let out: GainNode | null = null;
const KEY = 'ebru.sound';

function read(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
}

let enabled = typeof window !== 'undefined' ? read() : true;
const listeners = new Set<(on: boolean) => void>();

export const soundOn = () => enabled;

/** Inside a slide the presentation decides, and nothing is remembered. */
export function setSound(on: boolean, remember = true) {
  enabled = on;
  if (remember) {
    try {
      localStorage.setItem(KEY, on ? 'on' : 'off');
    } catch {
      // Private mode: the choice simply lasts for this visit.
    }
  }
  listeners.forEach((fn) => fn(on));
}

export function onSound(fn: (on: boolean) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function ready(): boolean {
  if (!enabled) return false;
  if (!ctx) {
    ctx = new AudioContext();
    out = ctx.createGain();
    out.gain.value = 0.5;
    out.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx.state !== 'closed';
}

const bank: (Promise<AudioBuffer> | undefined)[] = [];
let last = 0;

function drop(i: number): Promise<AudioBuffer> {
  bank[i] ??= fetch(`./audio/sfx/drop-${i + 1}.mp3`)
    .then((r) => r.arrayBuffer())
    .then((b) => ctx!.decodeAudioData(b));
  return bank[i]!;
}

/** A drop landing on water. `size` 0..1 lowers the pitch, `gain` scales loudness. */
export function plop(size = 0.5, gain = 1) {
  if (!ready() || !ctx || !out) return;
  // Many drops at once are one sound.
  if (ctx.currentTime - last < 0.08) return;
  last = ctx.currentTime;
  const i = Math.max(0, Math.min(5, Math.round(size * 5)));
  drop(i)
    .then((buffer) => {
      if (!ctx || !out || !enabled) return;
      const src = ctx.createBufferSource();
      const g = ctx.createGain();
      src.buffer = buffer;
      src.playbackRate.value = 0.96 + Math.random() * 0.08;
      g.gain.value = 0.34 * gain;
      src.connect(g).connect(out);
      src.start();
    })
    .catch(() => {
      bank[i] = undefined;
    });
}

/** Ink settling: three drops, one after another. */
export function settle() {
  [0.8, 0.5, 0.25].forEach((s, i) => window.setTimeout(() => plop(s, 0.6), i * 150));
}
