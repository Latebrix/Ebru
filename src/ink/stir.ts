import { MAX_STROKES } from './shader.ts';
import type { Stroke } from './Marble.ts';

/**
 * Turns pointer movement into strokes: the ink is dragged along, then slowly flows back.
 * A stroke grows while the pointer stays near it and a new one starts once it has moved on.
 */
export class Stir {
  strokes: Stroke[] = [];
  private ages: number[] = [];
  private x = 0;
  private y = 0;
  private inside = false;
  readonly radius: number;
  readonly strength: number;
  readonly memory: number;

  constructor(radius = 0.12, strength = 0.8, memory = 2.4) {
    this.radius = radius;
    this.strength = strength;
    /** Seconds until a stroke has lost two thirds of its pull. */
    this.memory = memory;
  }

  move(x: number, y: number) {
    if (!this.inside) {
      this.inside = true;
      this.x = x;
      this.y = y;
      return;
    }
    const dx = x - this.x;
    const dy = y - this.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-4) return;
    // A fast flick is one long pull, not a tear.
    const k = Math.min(1, (this.radius * 0.7) / len) * this.strength;
    const last = this.strokes[this.strokes.length - 1];
    if (!last || Math.hypot(x - last.x, y - last.y) > this.radius * 0.42) {
      this.strokes.push({ x, y, dx: dx * k, dy: dy * k });
      this.ages.push(0);
      if (this.strokes.length > MAX_STROKES) {
        this.strokes.shift();
        this.ages.shift();
      }
    } else {
      const cap = this.radius * 0.55;
      last.dx += dx * k;
      last.dy += dy * k;
      const m = Math.hypot(last.dx, last.dy);
      if (m > cap) {
        last.dx *= cap / m;
        last.dy *= cap / m;
      }
      this.ages[this.ages.length - 1] = 0;
    }
    this.x = x;
    this.y = y;
  }

  leave() {
    this.inside = false;
  }

  step(dt: number) {
    const n = this.strokes.length;
    for (let i = 0; i < n; i += 1) {
      this.ages[i] += dt;
      // The oldest strokes fade faster so none is visible by the time it has to go.
      const crowd = 1 + Math.max(0, n - i - MAX_STROKES + 5) * 0.9;
      const k = Math.exp((-dt * crowd) / this.memory);
      this.strokes[i].dx *= k;
      this.strokes[i].dy *= k;
    }
    while (this.strokes.length && Math.hypot(this.strokes[0].dx, this.strokes[0].dy) < 4e-4) {
      this.strokes.shift();
      this.ages.shift();
    }
  }
}
