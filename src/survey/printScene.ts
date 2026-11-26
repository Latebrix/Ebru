import { C, ON_WATER } from '../brand/palette.ts';
import { inkState, type Drop, type InkState } from '../ink/Marble.ts';
import { clamp, easeOut, rng } from '../ink/random.ts';
import { reducedMotion } from '../ink/quality.ts';
import type { InkFrame, InkScene } from '../ink/useInk.ts';

/** The inks of the answers, in the order the choices are listed. */
export const ANSWER_INKS = [C.verm, C.blue, C.saff, C.pink, C.teal] as const;

/** One answer on the water: its inks from the outside in, and how big it falls. */
export interface Splash {
  key: string;
  inks: number[];
  size: number;
}

interface Landing {
  inks: number[];
  size: number;
  /** When it touched the water, in scene seconds. */
  at: number;
}

/** Seconds a new drop takes to spread. */
const SPREAD = 0.9;

/**
 * The student's own print. Before the first answer the tray shows a finished ebru; after it, every
 * answer lets a drop fall onto clean water, and the drops push each other aside as real ink does.
 */
export class PrintScene implements InkScene {
  private still = reducedMotion();
  private t = 0;
  private welcome: Drop[];
  private splashes: Splash[] = [];
  private landed = new Map<string, Landing>();
  /** Frames still to draw before the picture may rest. */
  private dirty = 2;
  private aspect = 0;
  private state: InkState = inkState({
    palette: ON_WATER,
    vein: [0.018, 0.9, 2.2],
    grain: 0.02,
    scale: 1.05,
  });

  constructor() {
    const r = rng(2611);
    const order = [C.blue, C.verm, C.saff, C.pink, C.teal, C.bone];
    this.welcome = [];
    for (let i = 0; i < 18; i += 1) this.welcome.push({ x: (r() - 0.5) * 3.4, y: (r() - 0.5) * 1.1, r: 0.16 + r() * 0.2, c: order[i % 6] });
    for (let k = 0; k < 6; k += 1) {
      const x = -1.35 + k * 0.54 + (r() - 0.5) * 0.2;
      const y = (r() - 0.5) * 0.5;
      let q = 0.2 + r() * 0.08;
      for (let j = 0; j < 4; j += 1) {
        this.welcome.push({ x, y, r: q, c: order[(k * 2 + j) % 6] });
        q *= 0.7;
      }
    }
    for (let i = 0; i < 12; i += 1) this.welcome.push({ x: (r() - 0.5) * 3, y: (r() - 0.5) * 0.9, r: 0.02 + r() * r() * 0.08, c: order[i % 6] });
  }

  /** Shows these answers, oldest first. A changed answer falls again in its new inks. */
  show(splashes: Splash[]) {
    const keys = new Set(splashes.map((s) => s.key));
    for (const k of [...this.landed.keys()]) if (!keys.has(k)) this.landed.delete(k);
    for (const s of splashes) {
      const old = this.landed.get(s.key);
      if (old && old.inks.join() === s.inks.join() && old.size === s.size) continue;
      this.landed.set(s.key, { inks: s.inks, size: s.size, at: this.still ? -60 : this.t });
    }
    this.splashes = splashes;
    this.dirty = 2;
  }

  frame(f: InkFrame): InkState | null {
    this.t += f.dt;
    const aspect = f.w / Math.max(1, f.h);
    if (Math.abs(aspect - this.aspect) > 0.01) {
      this.aspect = aspect;
      this.dirty = 2;
    }
    const growing = [...this.landed.values()].some((l) => this.t - l.at < SPREAD + 0.2);
    // A finished picture is not drawn again until something changes.
    if (!growing && this.dirty <= 0) return null;
    if (!growing) this.dirty -= 1;

    const drops: Drop[] = [];
    if (!this.splashes.length) {
      const k = clamp(aspect / 3.4, 0.5, 1.4);
      for (const d of this.welcome) drops.push({ ...d, x: d.x * k });
    } else {
      // A sunflower spiral keeps the drops around the middle, none on top of another.
      const wide = clamp(aspect * 0.5, 1, 2.1);
      this.splashes.forEach((s, i) => {
        const l = this.landed.get(s.key);
        if (!l) return;
        const g = easeOut(clamp((this.t - l.at) / SPREAD), 4);
        if (g <= 0) return;
        const a = i * 2.39996;
        const rad = 0.08 + 0.072 * Math.sqrt(i);
        const x = Math.cos(a) * rad * wide;
        const y = Math.sin(a) * rad * 0.92;
        // A drop inside a drop, with a thread of water between the rings.
        l.inks.forEach((c, j) => {
          const r = l.size * g * (1 - (j * 0.62) / Math.max(1, l.inks.length));
          drops.push({ x, y, r, c });
          if (j < l.inks.length - 1) drops.push({ x, y, r: r * 0.8, c: C.water });
        });
      });
    }
    this.state.drops = drops.slice(0, 92);
    return this.state;
  }
}
