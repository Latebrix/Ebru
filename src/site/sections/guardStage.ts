import { HEX, memberHex, MEMBER_INK, mix, rgb, tints } from '../../brand/palette.ts';
import { inkState, type Marble, type InkState, type View } from '../../ink/Marble.ts';
import { leaveSheet, roomFor, takeSheet } from '../../ink/sheet.ts';
import { clamp, rng, smooth } from '../../ink/random.ts';

export interface Pour {
  from: number;
  to: number;
  /** 0 before the ink leaves, 1 once the last of it has landed. */
  q: number;
}

export interface StageInput {
  /** Load per person, 1 is the brim. */
  loads: number[];
  pours: Pour[];
  time: number;
  dt: number;
  /** Scroll speed in screens per second: the jars lean with it. */
  push: number;
  ratio: number;
  /** Show the state as it is, without any movement. */
  still: boolean;
}

interface Jar {
  x: number;
  y: number;
  w: number;
  h: number;
}

const css = (c: readonly number[], a = 1) => `rgb(${c.map((v) => Math.round(v * 255)).join(' ')} / ${a})`;

function jarInk(member: string, seed: number): InkState {
  const r = rng(300 + seed * 7);
  const drops = Array.from({ length: 46 }, (_, i) => ({
    x: (r() - 0.5) * 0.62,
    y: (r() - 0.5) * 1.15,
    r: i < 16 ? 0.1 + r() * 0.1 : 0.02 + r() * 0.07,
    c: 1 + (i % 6),
  }));
  return inkState({
    palette: tints(HEX[MEMBER_INK[member]]),
    drops,
    comb: [0.12, 0.17, 0, r()],
    warp: [0.22, 1.5, r(), r()],
    vein: [0.014, 0.6, 1.6],
    veinOpacity: 0.7,
    pool: 0.1,
    grain: 0.02,
  });
}

/** Five jars of ink. Levels follow the forecast; past the brim the ink runs down the glass. */
export class GuardStage {
  private marble: Marble | null = null;
  private ctx: CanvasRenderingContext2D;
  private states: InkState[];
  private members: string[];
  private shown: number[];
  private speed: number[];
  private spill: number[];
  private tilt = 0;
  private tiltSpeed = 0;
  private colors: string[];

  readonly canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement, members: string[]) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.members = members;
    this.states = members.map(jarInk);
    this.shown = members.map(() => 0);
    this.speed = members.map(() => 0);
    this.spill = members.map(() => 0);
    this.colors = members.map(memberHex);
    try {
      this.marble = takeSheet();
    } catch {
      // Without WebGL the jars are filled with flat ink.
    }
  }

  /** Jar boxes in CSS pixels. */
  layout(): Jar[] {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const n = this.members.length;
    const gap = w * 0.034;
    const jw = (w - gap * (n - 1)) / n - w * 0.028;
    const step = (w - jw - w * 0.028) / (n - 1);
    const top = h * 0.3;
    return this.members.map((_, i) => ({ x: w * 0.014 + i * step, y: top, w: jw, h: h * 0.985 - top }));
  }

  private body(j: Jar, inset = 0) {
    const c = this.ctx;
    const r = j.w * 0.3 - inset;
    const x = j.x + inset;
    const w = j.w - inset * 2;
    const b = j.y + j.h - inset;
    c.beginPath();
    c.moveTo(x, j.y);
    c.lineTo(x, b - r);
    c.arcTo(x, b, x + r, b, r);
    c.lineTo(x + w - r, b);
    c.arcTo(x + w, b, x + w, b - r, r);
    c.lineTo(x + w, j.y);
    c.closePath();
  }

  draw({ loads, pours, time, dt, push, ratio, still }: StageInput) {
    const { canvas, ctx: c } = this;
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    const pw = Math.round(cw * ratio);
    const ph = Math.round(ch * ratio);
    if (canvas.width !== pw || canvas.height !== ph) {
      canvas.width = pw;
      canvas.height = ph;
    }
    const jars = this.layout();

    // Ink sheets, one per jar, stacked side by side in one WebGL canvas.
    const vw = Math.round(jars[0].w * ratio);
    const vh = Math.round(jars[0].h * ratio);
    if (this.marble) roomFor(this.marble, vw * jars.length, vh);
    const views: View[] = this.states.map((s, i) => {
      s.warp[2] = Math.sin(time * 0.13 + i) * 0.2;
      s.warp[3] = Math.cos(time * 0.1 + i * 1.7) * 0.2;
      s.comb[3] = time * 0.03 + i * 0.4;
      return { x: i * vw, y: 0, w: vw, h: vh, state: s };
    });
    const wet = this.marble?.drawViews(views, time) ?? false;

    // Liquid: each surface is a spring, all of them lean with the scroll.
    this.tiltSpeed += (-38 * this.tilt - 4.2 * this.tiltSpeed - push * 9) * dt;
    this.tilt += this.tiltSpeed * dt;
    loads.forEach((goal, i) => {
      if (still) {
        this.shown[i] = goal;
        this.spill[i] = clamp((goal - 1) / 0.4);
        return;
      }
      this.speed[i] += (30 * (goal - this.shown[i]) - 8.6 * this.speed[i]) * dt;
      this.shown[i] = Math.max(0, this.shown[i] + this.speed[i] * dt);
      const over = clamp((this.shown[i] - 1) / 0.4);
      // Spilt ink runs down at its own pace and dries up once the jar is safe.
      const rate = over > this.spill[i] ? 1.5 : 0.9;
      this.spill[i] += (over - this.spill[i]) * Math.min(1, dt * rate);
    });

    c.setTransform(ratio, 0, 0, ratio, 0, 0);
    c.clearRect(0, 0, cw, ch);

    jars.forEach((j, i) => {
      if (this.spill[i] > 0.01) this.puddle(j, i, ch);
    });
    jars.forEach((j, i) => {
      this.jar(j, i, i * vw, vw, vh, time, wet);
      if (this.spill[i] > 0.01) this.drips(j, i, time);
    });
    for (const pour of pours) if (pour.q > 0.001 && pour.q < 0.999) this.pour(jars, pour, time);
  }

  private surface(j: Jar, i: number, level: number, time: number): (x: number) => number {
    const y0 = j.y + j.h * (1 - Math.min(1, level));
    const calm = 1.6 + Math.min(9, Math.abs(this.speed[i]) * 16 + Math.abs(this.tiltSpeed) * 2.6);
    const lean = Math.max(-0.2, Math.min(0.2, this.tilt * 0.5));
    return (x: number) => {
      const u = (x - j.x) / j.w - 0.5;
      return y0 + lean * u * j.w + Math.sin(u * 7 + time * 2.3 + i * 1.9) * calm * 0.6 + Math.sin(u * 13 - time * 3.1 + i) * calm * 0.4;
    };
  }

  private jar(j: Jar, i: number, sx: number, sw: number, sh: number, time: number, wet: boolean) {
    const c = this.ctx;
    const level = this.shown[i];
    this.body(j);
    c.fillStyle = HEX.ink;
    c.fill();

    c.save();
    const inset = Math.max(4, j.w * 0.045);
    this.body(j, inset);
    c.clip();
    if (level > 0.004) {
      const at = this.surface(j, i, level, time);
      c.beginPath();
      c.moveTo(j.x, j.y + j.h);
      for (let x = j.x; x <= j.x + j.w + 1; x += 5) c.lineTo(x, at(x));
      c.lineTo(j.x + j.w, j.y + j.h);
      c.closePath();
      c.save();
      c.clip();
      if (this.marble && wet) {
        c.drawImage(this.marble.canvas, sx, this.marble.canvas.height - sh, sw, sh, j.x, j.y, j.w, j.h);
      } else {
        c.fillStyle = this.colors[i];
        c.fillRect(j.x, j.y, j.w, j.h);
      }
      c.restore();
      c.beginPath();
      for (let x = j.x; x <= j.x + j.w + 1; x += 5) c.lineTo(x, at(x));
      c.lineWidth = 2;
      c.strokeStyle = css(mix(rgb(this.colors[i]), [1, 1, 1], 0.8));
      c.stroke();
    }
    // Graduation
    c.fillStyle = css(rgb(HEX.bone), 0.5);
    for (let g = 1; g < 4; g += 1) c.fillRect(j.x + inset, j.y + (j.h * g) / 4, g === 2 ? j.w * 0.2 : j.w * 0.12, 1.5);
    c.restore();

    // Lip
    const lip = Math.max(9, j.w * 0.09);
    c.beginPath();
    c.roundRect(j.x - lip * 0.7, j.y - lip, j.w + lip * 1.4, lip, lip * 0.46);
    c.fillStyle = HEX.ink;
    c.fill();
  }

  /** Ink running down the outside of the glass, as a few rounded tongues per side. */
  private drips(j: Jar, i: number, time: number) {
    const c = this.ctx;
    const s = smooth(this.spill[i]);
    const lip = Math.max(9, j.w * 0.09);
    const tongues = [
      { x: -0.1, w: 0.15, len: 0.82 },
      { x: 0.06, w: 0.1, len: 0.44 },
      { x: 0.23, w: 0.08, len: 0.26 },
      { x: 0.74, w: 0.09, len: 0.34 },
      { x: 0.89, w: 0.12, len: 0.6 },
      { x: 1.06, w: 0.15, len: 0.95 },
    ];
    c.beginPath();
    const top = j.y - lip - 4 * s;
    const start = j.x - lip * 0.95;
    const end = j.x + j.w + lip * 0.95;
    const base = j.y + 3 + 6 * s;
    const round = lip * 0.6;
    let x = start;
    c.moveTo(start, base - 2);
    c.lineTo(start, top + round);
    c.quadraticCurveTo(start, top, start + round, top);
    // The ink stands above the rim in one swollen curve.
    const swell = (10 + j.h * 0.075) * s;
    c.bezierCurveTo(j.x + j.w * 0.2, top - swell, j.x + j.w * 0.8, top - swell + Math.sin(time * 2.2) * 3 * s, end - round, top);
    c.quadraticCurveTo(end, top, end, top + round);
    c.lineTo(end, base - 2);
    const far = end;
    // Back along the hem, tongue by tongue, from right to left.
    x = far;
    for (const t of [...tongues].reverse()) {
      const w = t.w * j.w * (0.5 + 0.5 * s);
      const cx = j.x + t.x * j.w;
      const len = t.len * j.h * s + Math.sin(time * 1.3 + t.x * 9) * 2;
      const right = cx + w / 2;
      const tip = base + Math.max(8, len);
      if (right < x) c.bezierCurveTo(x - (x - right) * 0.4, base - 2, right + 4, base - 1, right, base + 8);
      else c.lineTo(right, base + 8);
      c.lineTo(right, tip - w / 2);
      c.bezierCurveTo(right + w * 0.08, tip + w * 0.36, right - w * 1.08, tip + w * 0.36, right - w, tip - w / 2);
      c.lineTo(right - w, base + 8);
      x = right - w;
    }
    c.bezierCurveTo(x - 3, base - 1, start + 2, base - 2, start, base - 2);
    c.closePath();
    c.fillStyle = this.colors[i];
    c.fill();
    c.lineWidth = 1.8;
    c.strokeStyle = HEX.bone;
    c.lineJoin = 'round';
    c.stroke();
    // Drops leaving the two longest tongues
    if (this.spill[i] > 0.55) {
      for (let k = 0; k < 2; k += 1) {
        const t = tongues[k === 0 ? 0 : 5];
        const f = (time * 0.62 + k * 0.45) % 1;
        const y0 = base + t.len * j.h * s;
        const y1 = j.y + j.h + 4;
        if (y0 < y1 - 10) {
          c.beginPath();
          c.ellipse(j.x + t.x * j.w, y0 + (y1 - y0) * f * f, 5, 6.5, 0, 0, Math.PI * 2);
          c.fillStyle = this.colors[i];
          c.fill();
          c.stroke();
        }
      }
    }
  }

  private puddle(j: Jar, i: number, ch: number) {
    const c = this.ctx;
    const s = smooth(clamp((this.spill[i] - 0.25) / 0.75));
    if (s <= 0) return;
    c.beginPath();
    c.ellipse(j.x + j.w / 2, Math.min(ch - 6, j.y + j.h), j.w * (0.52 + 0.34 * s), 5 + 9 * s, 0, 0, Math.PI * 2);
    c.fillStyle = this.colors[i];
    c.fill();
    c.lineWidth = 1.8;
    c.strokeStyle = HEX.bone;
    c.stroke();
  }

  /** A ribbon of ink lifted out of one jar and let down into another, changing colour on the way. */
  private pour(jars: Jar[], { from, to, q }: Pour, time: number) {
    const c = this.ctx;
    const a = jars[from];
    const b = jars[to];
    const lip = Math.max(9, a.w * 0.09);
    const p0 = [a.x + a.w / 2, a.y + 6];
    const lift = a.y - a.h * 0.46;
    const p1 = [a.x + a.w / 2 + (b.x - a.x) * 0.14, lift];
    const p2 = [b.x + b.w / 2 - (b.x - a.x) * 0.14, lift];
    const p3 = [b.x + b.w / 2, b.y + 10 + b.h * (1 - Math.min(1, this.shown[to])) * 0.96];
    const at = (t: number) => {
      const m = 1 - t;
      return [0, 1].map((k) => m * m * m * p0[k] + 3 * m * m * t * p1[k] + 3 * m * t * t * p2[k] + t * t * t * p3[k]);
    };
    const head = smooth(clamp(q / 0.42));
    const tail = smooth(clamp((q - 0.62) / 0.38));
    const n = 46;
    const pts: { x: number; y: number; t: number }[] = [];
    for (let k = 0; k <= n; k += 1) {
      const t = tail + ((head - tail) * k) / n;
      const [x, y] = at(t);
      pts.push({ x: x + Math.sin(t * 16 - time * 5) * 2.2, y, t });
    }
    const width = (k: number) => {
      const e = Math.min(k, n - k) / n;
      return Math.max(3, a.w * 0.17 * Math.min(1, e * 5) * (0.86 + 0.14 * Math.sin(k * 0.6 - time * 6)));
    };
    c.save();
    // The ribbon disappears behind the front lip of each jar.
    c.beginPath();
    c.rect(-50, -50, 4000, a.y - lip + 50);
    for (const j of [a, b]) c.rect(j.x + 5, j.y - lip, j.w - 10, j.h + lip);
    c.clip();
    c.lineCap = 'round';
    for (const casing of [true, false]) {
      for (let k = 0; k < n; k += 1) {
        const w = width(k);
        c.beginPath();
        c.moveTo(pts[k].x, pts[k].y);
        c.lineTo(pts[k + 1].x, pts[k + 1].y);
        c.lineWidth = casing ? w + 4 : w;
        c.strokeStyle = casing ? HEX.bone : css(mix(rgb(this.colors[from]), rgb(this.colors[to]), smooth(clamp((pts[k].t - 0.3) / 0.4))));
        c.stroke();
      }
    }
    c.restore();
  }

  dispose() {
    if (this.marble) leaveSheet();
  }
}
