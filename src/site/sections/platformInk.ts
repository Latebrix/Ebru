import { C, ON_WATER } from '../../brand/palette.ts';
import { inkState, type InkState, type View } from '../../ink/Marble.ts';
import { rng } from '../../ink/random.ts';
import { leaveSheet, roomFor, takeSheet } from '../../ink/sheet.ts';

export interface WindowBox {
  /** Screen position and size in CSS pixels. */
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * One large picture behind the whole section. It is never shown directly: every device is a
 * window that copies the part it happens to be in front of, so moving a device moves the view.
 */
export class SharedWater {
  private marble = takeSheet();
  private state: InkState;

  constructor() {
    const r = rng(64);
    const drops = [];
    const order = [C.pink, C.verm, C.bone, C.saff, C.blue, C.teal];
    for (let i = 0; i < 24; i += 1) drops.push({ x: (r() - 0.5) * 2.2, y: (r() - 0.5) * 1.2, r: 0.16 + r() * 0.18, c: order[i % 6] });
    for (let k = 0; k < 7; k += 1) {
      const x = (r() - 0.5) * 1.8;
      const y = (r() - 0.5) * 0.9;
      let q = 0.16 + r() * 0.08;
      for (let j = 0; j < 5; j += 1) {
        drops.push({ x, y, r: q, c: order[(k + j * 2) % 6] });
        q *= 0.76;
      }
    }
    for (let i = 0; i < 30; i += 1) drops.push({ x: (r() - 0.5) * 2, y: (r() - 0.5) * 1.1, r: 0.012 + r() * r() * 0.06, c: 1 + (i % 6) });
    this.state = inkState({
      palette: [ON_WATER[C.saff], ...ON_WATER.slice(1)],
      drops,
      warp: [0.4, 1.15, 0, 0],
      vein: [0.018, 0.9, 2.1],
      grain: 0.022,
    });
  }

  /**
   * Draws the part of the picture behind each window, stacked into one sheet.
   * Returns where each part starts, measured from the top of the sheet, or null while there is no ink yet.
   */
  draw(windows: WindowBox[], screen: { w: number; h: number }, ratio: number, time: number): number[] | null {
    const s = this.state;
    s.warp[2] = Math.sin(time * 0.1) * 0.3;
    s.warp[3] = Math.cos(time * 0.08) * 0.3;
    s.vortices = [
      { x: -0.5, y: 0.1, r: 0.34, a: 2.2 + 0.3 * Math.sin(time * 0.27) },
      { x: 0.42, y: -0.12, r: 0.36, a: -2.4 - 0.3 * Math.sin(time * 0.21) },
    ];
    const boxes = windows.map((b) => ({ w: Math.round(b.w * ratio), h: Math.round(b.h * ratio) }));
    const height = boxes.reduce((sum, b) => sum + b.h, 0);
    const tall = roomFor(this.marble, Math.max(1, ...boxes.map((b) => b.w)), height);
    const tops: number[] = [];
    let top = tall - height;
    const views: View[] = windows.map((b, i) => {
      tops.push(top);
      top += boxes[i].h;
      return {
        x: 0,
        y: tall - top,
        w: boxes[i].w,
        h: boxes[i].h,
        state: { ...s, scale: b.h / screen.h, shift: [(b.x + b.w / 2 - screen.w / 2) / screen.h, (screen.h / 2 - b.y - b.h / 2) / screen.h] },
      };
    });
    return this.marble.drawViews(views, time) ? tops : null;
  }

  get canvas() {
    return this.marble.canvas;
  }

  dispose() {
    leaveSheet();
  }
}
