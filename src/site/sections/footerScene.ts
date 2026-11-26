import { C, ON_WATER } from '../../brand/palette.ts';
import { inkState, type Drop, type InkState } from '../../ink/Marble.ts';
import { clamp, easeOut, rng } from '../../ink/random.ts';
import { reducedMotion } from '../../ink/quality.ts';
import { Stir } from '../../ink/stir.ts';
import type { InkFrame, InkScene } from '../../ink/useInk.ts';

/** The last bath, seen through the wordmark: stir it, or let more ink fall. */
export class FooterScene implements InkScene {
  onDrop: () => void = () => {};
  private still = reducedMotion();
  private state: InkState;
  private base: Drop[];
  private extra: { x: number; y: number; size: number; c: number; at: number }[] = [];
  private stir = new Stir(0.22, 0.95, 3.4);
  private pointer = { x: 0, y: 0, inside: false, moved: false };
  private pending = false;
  private clicks = 0;

  constructor() {
    const r = rng(77);
    this.base = [];
    const order = [C.blue, C.verm, C.saff, C.pink, C.teal, C.bone];
    for (let i = 0; i < 26; i += 1) this.base.push({ x: (r() - 0.5) * 3.6, y: (r() - 0.5) * 1.1, r: 0.22 + r() * 0.2, c: order[i % 6] });
    for (let k = 0; k < 7; k += 1) {
      const x = -1.5 + k * 0.5 + (r() - 0.5) * 0.2;
      const y = (r() - 0.5) * 0.6;
      let q = 0.2 + r() * 0.1;
      for (let j = 0; j < 4; j += 1) {
        this.base.push({ x, y, r: q, c: order[(k * 2 + j) % 6] });
        q *= 0.72;
      }
    }
    for (let i = 0; i < 16; i += 1) this.base.push({ x: (r() - 0.5) * 3.2, y: (r() - 0.5), r: 0.02 + r() * r() * 0.09, c: order[i % 6] });
    this.state = inkState({
      palette: [ON_WATER[C.verm], ...ON_WATER.slice(1)],
      warp: [0.5, 0.95, 0, 0],
      vein: [0.016, 1, 2.4],
      grain: 0.022,
      strokeRadius: 0.22,
    });
  }

  start(el: HTMLCanvasElement) {
    const host = el.parentElement ?? el;
    const place = (event: PointerEvent) => {
      const box = el.getBoundingClientRect();
      this.pointer.x = (event.clientX - box.left) * (el.clientWidth / box.width);
      this.pointer.y = (event.clientY - box.top) * (el.clientHeight / box.height);
    };
    const move = (event: PointerEvent) => {
      place(event);
      this.pointer.inside = true;
      this.pointer.moved = true;
    };
    const leave = () => {
      this.pointer.inside = false;
      this.stir.leave();
    };
    const down = (event: PointerEvent) => {
      place(event);
      this.pending = true;
    };
    host.addEventListener('pointermove', move);
    host.addEventListener('pointerleave', leave);
    host.addEventListener('pointerdown', down);
    return () => {
      host.removeEventListener('pointermove', move);
      host.removeEventListener('pointerleave', leave);
      host.removeEventListener('pointerdown', down);
    };
  }

  frame({ t, dt, w, h, ratio, marble }: InkFrame): InkState {
    const s = this.state;
    const time = this.still ? 5 : t;
    s.drops = [
      ...this.base,
      ...this.extra.map((d) => ({ x: d.x, y: d.y, r: d.size * easeOut(clamp((t - d.at) / 0.9), 4), c: d.c })),
    ];
    s.warp = [0.5, 0.95, Math.sin(time * 0.08) * 0.5, Math.cos(time * 0.06) * 0.5];
    s.vortices = [
      { x: -0.95, y: 0.05, r: 0.42, a: 2.4 + 0.5 * Math.sin(time * 0.25) },
      { x: 0.1, y: -0.05, r: 0.4, a: -2.2 - 0.5 * Math.sin(time * 0.2 + 1) },
      { x: 1.05, y: 0.06, r: 0.42, a: 2.6 + 0.5 * Math.sin(time * 0.22 + 2) },
    ];
    if (this.pointer.inside && this.pointer.moved) {
      this.stir.move((this.pointer.x * ratio - w / 2) / h, -(this.pointer.y * ratio - h / 2) / h);
      this.pointer.moved = false;
    }
    this.stir.step(dt);
    s.strokes = this.stir.strokes;

    const hit = this.pending ? marble.pick(s, this.pointer.x * ratio, h - this.pointer.y * ratio) : null;
    if (hit) {
      const order = [C.bone, C.pink, C.saff, C.teal, C.blue, C.verm];
      this.extra.push({ x: hit.x, y: hit.y, size: 0.09 + Math.random() * 0.08, c: order[this.clicks % 6], at: t });
      this.clicks += 1;
      if (this.extra.length > 22) this.extra.shift();
      this.pending = false;
      this.onDrop();
    }
    return s;
  }
}
