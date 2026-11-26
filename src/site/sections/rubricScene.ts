import { C, HEX, ON_WATER, rgb } from '../../brand/palette.ts';
import { inkState, type InkState } from '../../ink/Marble.ts';
import { rng } from '../../ink/random.ts';
import { reducedMotion } from '../../ink/quality.ts';
import { Stir } from '../../ink/stir.ts';
import type { InkFrame, InkScene } from '../../ink/useInk.ts';

/** The bath under the rubric sheet: a busy, slowly moving picture seen only through the cut-outs. */
export class RubricScene implements InkScene {
  private still = reducedMotion();
  private state: InkState;
  private stir = new Stir(0.3, 0.9, 3);
  private pointer = { x: 0, y: 0, on: false };

  constructor() {
    const r = rng(91);
    const drops = Array.from({ length: 78 }, (_, i) => ({
      x: (r() - 0.5) * 5.4,
      y: (r() - 0.5) * 1.3,
      r: i < 26 ? 0.2 + r() * 0.2 : 0.05 + r() * 0.15,
      c: [C.blue, C.verm, C.saff, C.pink, C.bone, C.verm, C.blue, C.saff][i % 8],
    }));
    this.state = inkState({
      // No bare water here: every gap between the drops is ink too.
      palette: [rgb(HEX.saff), ...ON_WATER.slice(1)],
      drops,
      warp: [0.4, 1.1, 0, 0],
      comb: [0.24, 0.42, 0.5, 0],
      vein: [0.016, 0.8, 2],
      grain: 0.022,
      strokeRadius: 0.3,
    });
  }

  start(el: HTMLCanvasElement) {
    const host = el.closest<HTMLElement>('.rubric-sheet') ?? el;
    const move = (event: PointerEvent) => {
      const box = el.getBoundingClientRect();
      this.pointer = { x: (event.clientX - box.left) / box.width, y: (event.clientY - box.top) / box.height, on: true };
    };
    const leave = () => {
      this.pointer.on = false;
      this.stir.leave();
    };
    host.addEventListener('pointermove', move);
    host.addEventListener('pointerleave', leave);
    return () => {
      host.removeEventListener('pointermove', move);
      host.removeEventListener('pointerleave', leave);
    };
  }

  frame({ t, dt, w, h }: InkFrame): InkState {
    const s = this.state;
    const time = this.still ? 4 : t;
    s.warp = [0.4, 1.1, Math.sin(time * 0.09) * 0.5, Math.cos(time * 0.07) * 0.5];
    s.comb[3] = time * 0.012;
    s.vortices = [
      { x: -1.1, y: 0, r: 0.5, a: 1.6 + 0.4 * Math.sin(time * 0.3) },
      { x: 0.9, y: 0.1, r: 0.55, a: -1.8 - 0.4 * Math.sin(time * 0.24 + 1) },
    ];
    if (this.pointer.on) this.stir.move((this.pointer.x - 0.5) * (w / h), 0.5 - this.pointer.y);
    this.stir.step(dt);
    s.strokes = this.stir.strokes;
    return s;
  }
}
