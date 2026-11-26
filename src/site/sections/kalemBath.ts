import { C, ON_WATER } from '../../brand/palette.ts';
import { inkState, type InkState } from '../../ink/Marble.ts';
import { rng } from '../../ink/random.ts';
import { reducedMotion } from '../../ink/quality.ts';
import type { InkFrame, InkScene } from '../../ink/useInk.ts';

/** The bath Kalem lives in. It swells while Kalem speaks. */
export class BathScene implements InkScene {
  /** 0..1 */
  voice = 0;
  private still = reducedMotion();
  private swell = 0;
  private state: InkState;
  private hills: { x: number; y: number; r: number; c: number }[] = [];

  constructor() {
    const r = rng(52);
    const inks = [C.blue, C.verm, C.teal, C.saff, C.pink];
    const order = [...inks, C.bone];
    for (let i = 0; i < 18; i += 1) this.hills.push({ x: -3.9 + i * 0.46 + (r() - 0.5) * 0.2, y: -0.95 - r() * 0.1, r: 0.46 + r() * 0.15, c: inks[(i * 2 + 1) % 5] });
    for (let i = 0; i < 8; i += 1) {
      const x = -3.4 + i * 0.96 + (r() - 0.5) * 0.3;
      let q = 0.26 + r() * 0.1;
      for (const c of [order[(i + 3) % 6], C.bone, order[(i + 5) % 6], order[(i + 1) % 6]]) {
        this.hills.push({ x, y: -0.52 + (r() - 0.5) * 0.1, r: q, c });
        q *= 0.7;
      }
    }
    for (let i = 0; i < 26; i += 1) this.hills.push({ x: -3.8 + r() * 7.6, y: -0.5 + r() * 0.3, r: 0.02 + r() * r() * 0.08, c: 1 + Math.floor(r() * 6) });
    this.state = inkState({ palette: ON_WATER, water: 0, warp: [0.3, 1.2, 0, 0], vein: [0.016, 0.9, 2], grain: 0.022 });
  }

  frame({ t, dt }: InkFrame): InkState {
    const s = this.state;
    const time = this.still ? 3 : t;
    this.swell += (this.voice - this.swell) * (1 - Math.exp(-dt * 5));
    s.drops = this.hills.map((d, i) => ({
      ...d,
      y: d.y + Math.sin(time * 0.5 + i * 1.3) * 0.018 + this.swell * 0.05 * Math.sin(i * 0.9 + time * 3),
      r: d.r * (1 + 0.02 * Math.sin(time * 0.7 + i * 2.1) + this.swell * 0.04),
    }));
    s.warp = [0.3, 1.2, Math.sin(time * 0.06) * 0.9, Math.cos(time * 0.05) * 0.3];
    s.vortices = [
      { x: -1.6, y: -0.3, r: 0.4, a: 1.5 + 0.3 * Math.sin(time * 0.3) },
      { x: -0.1, y: -0.36, r: 0.36, a: -1.6 + 0.3 * Math.sin(time * 0.26 + 1) },
      { x: 1.5, y: -0.3, r: 0.42, a: 1.8 + 0.3 * Math.sin(time * 0.22 + 2) },
    ];
    return s;
  }
}
