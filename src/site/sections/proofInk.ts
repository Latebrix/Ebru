import { HEX, MEMBER_INK, tints } from '../../brand/palette.ts';
import { inkState, type InkState, type View } from '../../ink/Marble.ts';
import { rng } from '../../ink/random.ts';
import { leaveSheet, roomFor, takeSheet } from '../../ink/sheet.ts';

/** A long bath of one person's ink, combed across, wide enough for the longest bar. */
export function barInk(member: string, seed: number): InkState {
  const r = rng(40 + seed);
  const drops = Array.from({ length: 60 }, (_, i) => ({
    x: (r() - 0.5) * 11,
    y: (r() - 0.5) * 1.1,
    r: 0.1 + r() * 0.22,
    c: 1 + (i % 6),
  }));
  return inkState({
    palette: tints(HEX[MEMBER_INK[member]]),
    drops,
    comb: [0.5, 0.7, 1.571, r()],
    warp: [0.2, 0.8, r(), r()],
    vein: [0.016, 0.6, 1.5],
    veinOpacity: 0.75,
    pool: 0.09,
    grain: 0.02,
  });
}

export interface BarTarget {
  member: string;
  canvas: HTMLCanvasElement;
  /** Filled part of the canvas width, 0..1. */
  fill: number;
  state: InkState;
}

export interface LensTarget {
  canvas: HTMLCanvasElement;
  /** Index into the bars. */
  bar: number;
  /** Position along the bar, in bar heights from its centre. */
  x: number;
  y: number;
}

/**
 * Draws every bar (and the lens) with one WebGL context: a sheet of views that is copied
 * into small 2D canvases, where each gets its rounded end and its liquid front.
 */
export class ProofInk {
  private marble = takeSheet();
  private ctx = new Map<HTMLCanvasElement, CanvasRenderingContext2D>();

  private context(canvas: HTMLCanvasElement) {
    let c = this.ctx.get(canvas);
    if (!c) {
      c = canvas.getContext('2d')!;
      this.ctx.set(canvas, c);
    }
    return c;
  }

  draw(bars: BarTarget[], lens: LensTarget | null, ratio: number, time: number, motion: number[]) {
    const boxes = bars.map((b) => ({ w: Math.round(b.canvas.clientWidth * ratio), h: Math.round(b.canvas.clientHeight * ratio) }));
    const lensSize = lens ? Math.round(lens.canvas.clientWidth * ratio) : 0;
    const sheetW = Math.max(1, ...boxes.map((b) => b.w), lensSize);
    const sheetH = boxes.reduce((sum, b) => sum + b.h, 0) + lensSize;
    const tall = roomFor(this.marble, sheetW, sheetH);

    const views: View[] = [];
    let y = 0;
    bars.forEach((b, i) => {
      const { w, h } = boxes[i];
      b.state.comb[3] = 0.2 + time * 0.012 + i * 0.37;
      b.state.warp[2] = Math.sin(time * 0.1 + i) * 0.16;
      b.state.warp[3] = Math.cos(time * 0.08 + i * 2) * 0.16;
      const filled = Math.ceil(Math.min(1, b.fill + 0.03) * w);
      // Same centre whatever the fill, so the pattern never slides while the bar grows.
      b.state.shift = [(filled - w) / 2 / h, 0];
      b.state.scale = 1;
      views.push({ x: 0, y, w: filled, h, state: b.state });
      y += h;
    });
    if (lens) {
      const source = bars[lens.bar].state;
      views.push({ x: 0, y, w: lensSize, h: lensSize, state: { ...source, shift: [lens.x, lens.y], scale: 0.62, vein: [0.016, 1, 2.6] } });
    }
    if (!this.marble.drawViews(views, time)) return;

    let top = tall;
    bars.forEach((b, i) => {
      const { w, h } = boxes[i];
      top -= h;
      const c = this.context(b.canvas);
      if (b.canvas.width !== w || b.canvas.height !== h) {
        b.canvas.width = w;
        b.canvas.height = h;
      }
      c.clearRect(0, 0, w, h);
      const edge = b.fill * w;
      if (edge < 2) return;
      const r = Math.min(h * 0.3, 22 * ratio);
      c.save();
      c.beginPath();
      c.moveTo(r, 0);
      // The front: a still meniscus at rest, a wave while ink is moving.
      const swing = motion[i] * h * 0.34;
      const bulge = Math.min(h * 0.12, edge * 0.2) + swing * 0.4;
      const x = Math.max(r + 2, edge - bulge);
      c.lineTo(x, 0);
      c.bezierCurveTo(x + bulge * 1.1 + swing * Math.sin(time * 9 + i), h * 0.16, x + bulge * 1.15 - swing * Math.cos(time * 7.4 + i), h * 0.36, x + bulge, h * 0.5);
      c.bezierCurveTo(x + bulge * 0.86 + swing * Math.cos(time * 8.2 + i), h * 0.66, x + bulge * 1.1 - swing * Math.sin(time * 6.6 + i), h * 0.86, x, h);
      c.lineTo(r, h);
      c.arcTo(0, h, 0, h - r, r);
      c.lineTo(0, r);
      c.arcTo(0, 0, r, 0, r);
      c.closePath();
      c.clip();
      // WebGL rows start at the bottom of the sheet.
      c.drawImage(this.marble.canvas, 0, top, w, h, 0, 0, w, h);
      c.restore();
    });
    if (lens) {
      const c = this.context(lens.canvas);
      if (lens.canvas.width !== lensSize || lens.canvas.height !== lensSize) {
        lens.canvas.width = lensSize;
        lens.canvas.height = lensSize;
      }
      c.drawImage(this.marble.canvas, 0, tall - sheetH, lensSize, lensSize, 0, 0, lensSize, lensSize);
    }
  }

  dispose() {
    leaveSheet();
  }
}
