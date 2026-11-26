import { C, ON_WATER } from '../../brand/palette.ts';
import { inkState, type Drop, type InkState } from '../../ink/Marble.ts';
import { clamp, easeOut, lerp, rng, smooth, span } from '../../ink/random.ts';
import { reducedMotion } from '../../ink/quality.ts';
import { Stir } from '../../ink/stir.ts';
import type { InkFrame, InkScene } from '../../ink/useInk.ts';
import { dropStory, type DropStory } from '../data.ts';

interface Falling extends Drop {
  /** Final radius. */
  size: number;
  /** When it falls, in seconds on the hero clock. */
  at: number;
  /** When it starts to dry up again (drops added on the way). */
  until?: number;
  story: DropStory | null;
}

/** The current of ink that enters from the right: the approved composition, oldest drop first. */
function compose(): { x: number; y: number; r: number; c: number }[] {
  const out: { x: number; y: number; r: number; c: number }[] = [];
  const ring = (x: number, y: number, r: number, cols: number[], k: number) => {
    let q = r;
    for (const c of cols) {
      out.push({ x, y, r: q, c });
      q *= k;
    }
  };
  out.push(
    { x: 0.62, y: -0.3, r: 0.3, c: C.blue },
    { x: 0.2, y: -0.42, r: 0.22, c: C.teal },
    { x: 0.78, y: 0.28, r: 0.27, c: C.pink },
    { x: 0.98, y: -0.02, r: 0.26, c: C.saff },
    { x: 0.4, y: -0.04, r: 0.24, c: C.bone },
    { x: 0.02, y: -0.52, r: 0.2, c: C.blue },
  );
  ring(0.58, 0.16, 0.25, [C.verm, C.bone, C.blue, C.saff, C.pink, C.teal, C.bone, C.verm], 0.84);
  ring(0.92, -0.4, 0.19, [C.pink, C.verm, C.bone, C.blue, C.saff], 0.8);
  ring(0.3, -0.36, 0.13, [C.saff, C.bone, C.verm], 0.72);
  const r = rng(19);
  for (let i = 0; i < 24; i += 1) {
    const t = r();
    out.push({
      x: -0.18 + t * 1.15 + (r() - 0.5) * 0.22,
      y: -0.46 + t * 0.72 + (r() - 0.5) * 0.42,
      r: 0.018 + r() * r() * 0.075,
      c: 1 + Math.floor(r() * 6),
    });
  }
  return out;
}

/** The opening: drops fall one after another on the same spot until black water clears them away. */
const OPENING = [C.blue, C.bone, C.verm, C.saff, C.bone, C.teal, C.pink, C.blue, C.bone, C.verm];
const OPENING_STEP = 0.13;
const OPENING_END = 0.2 + OPENING.length * OPENING_STEP;

const CLICK_INKS = [C.verm, C.pink, C.saff, C.blue, C.teal];
const MAX_EXTRA = 26;

export class HeroScene implements InkScene {
  /** 0 at rest, 1 when the ink has covered the whole screen. */
  progress = 0;
  /** Called when the drop under the pointer changes. */
  onRead: (story: DropStory | null, x: number, y: number) => void = () => {};
  onDrop: (size: number) => void = () => {};
  /** Called once the opening has cleared and the pour begins. */
  onPour: () => void = () => {};

  private clock = 0;
  private opening = 0;
  private phase: 'wait' | 'opening' | 'pour' = 'wait';
  private still = reducedMotion();
  private base: Falling[];
  private extra: Falling[] = [];
  private counts = new Map<number, number>();
  private stir = new Stir(0.13, 0.85, 2.6);
  private state: InkState;
  private pointer = { x: 0, y: 0, inside: false, moved: 0 };
  private wantPick = 0;
  private reading: DropStory | null = null;
  private landing: { x: number; y: number } | null = null;
  private pendingDrop = false;
  private clicks = 0;
  private nextRain = 6;
  private rain = rng(7);

  constructor() {
    this.base = compose().map((d, i) => ({
      ...d,
      r: 0,
      size: d.r,
      at: 0.1 + i * 0.05,
      story: this.storyFor(d.c),
    }));
    this.state = inkState({ palette: ON_WATER, warp: [0.34, 1.25, 0, 0], water: 0, vein: [0.02, 0.9, 2.1], strokeRadius: 0.13 });
  }

  private storyFor(color: number) {
    const n = this.counts.get(color) ?? 0;
    this.counts.set(color, n + 1);
    return dropStory(color, n);
  }

  /** Start, with or without the opening flower. */
  begin(opening: boolean) {
    if (this.phase !== 'wait') return;
    this.phase = opening && !this.still ? 'opening' : 'pour';
    if (this.phase === 'pour') this.onPour();
  }

  /** Straight to the page, when the opening cannot be shown. */
  skip() {
    if (this.phase === 'pour') return;
    this.phase = 'pour';
    this.onPour();
  }

  private openingFrame(dt: number, aspect: number): InkState {
    const s = this.state;
    this.opening += dt;
    const t = this.opening;
    const live: Drop[] = [];
    OPENING.forEach((c, i) => {
      const k = clamp((t - 0.2 - i * OPENING_STEP) / 1.15);
      if (k > 0) live.push({ x: 0, y: 0, r: 0.4 * easeOut(k, 4), c });
    });
    const clear = clamp((t - OPENING_END) / 1.0);
    if (clear > 0) live.push({ x: 0, y: 0, r: 2.6 * clear ** 2.4 * Math.max(1, aspect * 0.7), c: C.water });
    s.drops = live;
    s.scale = 1;
    s.shift = [0, 0];
    s.warp = [0, 1, 0, 0];
    s.comb = [0, 1, 0, 0];
    s.petal = [5, 0.34 * smooth(span(t, 0.5, 1.5)), 0.055, Math.PI / 2 + t * 0.25];
    s.petalAt = [0, 0, 0, 0.6];
    s.vortices = [{ x: 0, y: 0, r: 0.42, a: 2.1 * smooth(span(t, 0.5, 2.2)) }];
    s.strokes = [];
    if (clear >= 1) {
      this.phase = 'pour';
      s.petal = [5, 0, 0.1, 0];
      this.onPour();
    }
    return s;
  }

  start(el: HTMLCanvasElement) {
    const place = (event: PointerEvent) => {
      const box = el.getBoundingClientRect();
      this.pointer.x = (event.clientX - box.left) * (el.clientWidth / box.width);
      this.pointer.y = (event.clientY - box.top) * (el.clientHeight / box.height);
    };
    const move = (event: PointerEvent) => {
      place(event);
      this.pointer.inside = event.pointerType !== 'touch' || event.pressure > 0;
      this.pointer.moved = 1;
    };
    const leave = () => {
      this.pointer.inside = false;
      this.stir.leave();
      this.setReading(null);
    };
    const click = (event: PointerEvent) => {
      place(event);
      this.pendingDrop = true;
      this.landing = null;
      this.wantPick = 0;
    };
    const host = el.parentElement ?? el;
    host.addEventListener('pointermove', move);
    host.addEventListener('pointerleave', leave);
    el.addEventListener('pointerdown', click);
    return () => {
      host.removeEventListener('pointermove', move);
      host.removeEventListener('pointerleave', leave);
      el.removeEventListener('pointerdown', click);
    };
  }

  private setReading(story: DropStory | null) {
    if (story === this.reading) {
      if (story) this.onRead(story, this.pointer.x, this.pointer.y);
      return;
    }
    this.reading = story;
    this.onRead(story, this.pointer.x, this.pointer.y);
  }

  private add(x: number, y: number, size: number, c: number, life?: number) {
    if (this.extra.length >= MAX_EXTRA) {
      const oldest = this.extra.find((d) => d.until === undefined || d.until > this.clock + 1.2);
      if (oldest) oldest.until = Math.min(oldest.until ?? Infinity, this.clock);
    }
    this.extra.push({ x, y, r: 0, size, at: this.clock, until: life ? this.clock + life : undefined, c, story: this.storyFor(c) });
  }

  frame({ dt, w, h, ratio, marble }: InkFrame): InkState {
    const aspect = w / h;
    if (this.phase === 'opening') return this.openingFrame(dt, aspect);
    if (this.phase === 'pour') this.clock += dt;
    const t = this.still ? 100 : this.clock;
    const s = this.state;
    const p = smooth(this.progress);

    // Framing: the ink sits right of the headline, under it on narrow screens, and fills the view as you scroll.
    const narrow = clamp((1.25 - aspect) / 0.75);
    // On a phone the words take the top of the screen, so the ink starts below the buttons.
    const phone = clamp((0.75 - aspect) / 0.25);
    const scale0 = lerp(1, 1.16, narrow);
    const sx = lerp(-0.05, 0.5, narrow);
    const sy = lerp(0, 0.74, narrow) + 0.36 * phone;
    s.scale = lerp(scale0, scale0 * 0.8, p);
    s.shift = [lerp(sx, 0.36, p), lerp(sy, -0.06, p)];

    // Drops grow in the order they fell; each one pushes everything before it.
    const breathe = this.still ? 0 : 1;
    const live: Drop[] = [];
    for (let i = 0; i < this.base.length; i += 1) {
      const d = this.base[i];
      const k = this.still ? 1 : clamp((t - d.at) / 1.25);
      d.r = d.size * easeOut(k, 4) * (1 + breathe * 0.013 * Math.sin(t * 0.8 + i * 1.7));
      if (d.r > 0) live.push(d);
    }
    this.extra = this.extra.filter((d) => d.until === undefined || this.clock < d.until + 1.2);
    for (const d of this.extra) {
      const grow = easeOut(clamp((this.clock - d.at) / 0.9), 4);
      const dry = d.until === undefined ? 1 : 1 - smooth(clamp((this.clock - d.until) / 1.2));
      d.r = d.size * grow * dry;
      if (d.r > 0) live.push(d);
    }
    // Flooding: the stones swell until no water is left.
    if (p > 0) {
      const swell = span(this.progress, 0.12, 0.95);
      live.unshift(
        { x: -0.5, y: 0.62, r: 0.62 * easeOut(span(swell, 0.1, 1), 2), c: C.pink },
        { x: -0.62, y: -0.42, r: 0.6 * easeOut(span(swell, 0, 0.9), 2), c: C.verm },
        { x: 0.2, y: 0.62, r: 0.5 * easeOut(span(swell, 0.05, 0.8), 2), c: C.saff },
        { x: 0.1, y: 0.1, r: 0.42 * easeOut(span(swell, 0.1, 0.9), 2), c: C.teal },
        { x: 1.35, y: 0.3, r: 0.5 * easeOut(span(swell, 0, 0.7), 2), c: C.blue },
        { x: 0.86, y: -0.72, r: 0.45 * easeOut(span(swell, 0, 0.7), 2), c: C.saff },
      );
    }
    s.drops = live;

    // Two slow vortices stir the pour once the first stones are down, then keep breathing.
    const turn = this.still ? 1 : smooth(span(t, 0.9, 3.6));
    const sway = breathe * Math.sin(t * 0.33);
    s.vortices = [
      { x: 0.28, y: -0.22, r: 0.3, a: 2.6 * turn + 0.22 * sway + p * 1.1 },
      { x: 0.98, y: 0.16, r: 0.3, a: -2.2 * turn - 0.2 * Math.sin(t * 0.27 + 1) * breathe - p * 0.6 },
    ];
    s.warp = [0.34, 1.25, breathe * 0.05 * Math.sin(t * 0.17), breathe * 0.05 * Math.sin(t * 0.13 + 2)];
    s.comb = [0.16 * smooth(span(this.progress, 0.1, 0.8)), 0.16, 0.5, 0];
    s.grain = 0.024;

    // Stirring
    const unit = s.scale / h;
    const ix = (this.pointer.x * ratio - w / 2) * unit + s.shift[0];
    const iy = -(this.pointer.y * ratio - h / 2) * unit + s.shift[1];
    if (this.pointer.inside && this.pointer.moved) {
      this.stir.move(ix, iy);
      this.pointer.moved = 0;
    }
    this.stir.step(dt);
    s.strokes = this.stir.strokes;

    // Reading the drop under the pointer, a few times a second.
    this.wantPick -= dt;
    if ((this.pendingDrop || (this.pointer.inside && this.wantPick <= 0)) && p < 0.4) {
      this.wantPick = 0.07;
      const hit = marble.pick(s, this.pointer.x * ratio, h - this.pointer.y * ratio);
      if (hit && this.pendingDrop) this.landing = { x: hit.x, y: hit.y };
      else if (hit) {
        const d = hit.index >= 0 ? (s.drops[hit.index] as Falling | undefined) : undefined;
        this.setReading(this.pointer.inside ? (d?.story ?? null) : null);
      }
    }
    if (this.pendingDrop && this.landing) {
      const c = CLICK_INKS[this.clicks % CLICK_INKS.length];
      this.clicks += 1;
      const size = 0.045 + Math.random() * 0.04;
      this.add(this.landing.x, this.landing.y, size, c, 40);
      this.onDrop(size / 0.085);
      this.pendingDrop = false;
      this.landing = null;
    }
    // A quiet rain keeps the picture alive while nobody touches it.
    if (!this.still && this.phase === 'pour' && p === 0 && this.clock > this.nextRain) {
      this.nextRain = this.clock + 2.6 + this.rain() * 2.2;
      const a = this.rain();
      this.add(0.05 + a * 0.85, -0.42 + a * 0.6 + (this.rain() - 0.5) * 0.36, 0.02 + this.rain() * 0.035, 1 + Math.floor(this.rain() * 6), 16);
    }
    return s;
  }
}
