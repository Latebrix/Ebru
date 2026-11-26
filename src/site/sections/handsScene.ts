import { C, MEMBER_INK, mix, ON_WATER, rgb } from '../../brand/palette.ts';
import { inkState, type Drop, type InkState, type RGB } from '../../ink/Marble.ts';
import { clamp, easeOut, lerp, smooth, span } from '../../ink/random.ts';
import { reducedMotion } from '../../ink/quality.ts';
import type { InkFrame, InkScene } from '../../ink/useInk.ts';
import { report } from '../data.ts';

/** Order in which the five hands drop. */
export const ORDER = ['laila', 'omar', 'karim', 'nour', 'youssef'] as const;
export type HandId = (typeof ORDER)[number];

const ROUNDS = [0.44, 0.33, 0.23];
const OUTER = 0.43;
const DARK = rgb('#17171f');

/** Scroll positions of the story, 0..1. */
export const BEATS = {
  firstDrop: 0.14,
  lastDrop: 0.56,
  pull: [0.58, 0.74] as const,
  settle: [0.72, 0.9] as const,
};

export interface FallingDrop {
  who: HandId;
  ink: number;
  /** Scroll position at which it touches the water. */
  at: number;
  r: number;
}

/** Fifteen drops: each person's area is their share of the proven work. */
export const FALLS: FallingDrop[] = ROUNDS.flatMap((weight, round) =>
  ORDER.map((who, i) => {
    const share = report.members.find((m) => m.member.id === who)!.share;
    const n = round * ORDER.length + i;
    return {
      who,
      ink: C[MEMBER_INK[who]],
      at: lerp(BEATS.firstDrop, BEATS.lastDrop, n / (ROUNDS.length * ORDER.length - 1)),
      r: OUTER * Math.sqrt(share * weight),
    };
  }),
);

export class HandsScene implements InkScene {
  progress = 0;
  /** Where the picture ends up, in viewport fractions from the centre. */
  aim: [number, number] = [0.14, 0];
  focus: HandId | null = null;
  onHover: (who: HandId | null) => void = () => {};

  private still = reducedMotion();
  private state: InkState = inkState({ palette: [...ON_WATER], water: 0, vein: [0.016, 0.9, 2.2], grain: 0.022 });
  private shown = 0;
  private dim = [0, 0, 0, 0, 0, 0, 0, 0];
  private pointer = { x: 0, y: 0, inside: false };
  private pickIn = 0;
  private hovered: HandId | null = null;

  start(el: HTMLCanvasElement) {
    const move = (event: PointerEvent) => {
      const box = el.getBoundingClientRect();
      this.pointer = { x: (event.clientX - box.left) * (el.clientWidth / box.width), y: (event.clientY - box.top) * (el.clientHeight / box.height), inside: true };
    };
    const leave = () => {
      this.pointer.inside = false;
      this.hover(null);
    };
    const host = el.parentElement ?? el;
    host.addEventListener('pointermove', move);
    host.addEventListener('pointerleave', leave);
    return () => {
      host.removeEventListener('pointermove', move);
      host.removeEventListener('pointerleave', leave);
    };
  }

  private hover(who: HandId | null) {
    if (who === this.hovered) return;
    this.hovered = who;
    this.onHover(who);
  }

  frame({ t, dt, w, h, ratio, marble }: InkFrame): InkState {
    const target = this.still ? 1 : this.progress;
    this.shown = this.still ? 1 : this.shown + (target - this.shown) * (1 - Math.exp(-dt * 10));
    const p = this.shown;
    const s = this.state;
    const aspect = w / h;

    const live: Drop[] = [];
    FALLS.forEach((d, i) => {
      const k = clamp((p - d.at) / 0.055);
      if (k <= 0) return;
      const breathe = this.still ? 0 : 0.008 * Math.sin(t * 1.1 + i * 2.1);
      live.push({ x: 0, y: 0, r: d.r * easeOut(k, 3) * (1 + breathe), c: d.ink });
    });
    s.drops = live;

    const pull = smooth(span(p, ...BEATS.pull));
    const settle = smooth(span(p, ...BEATS.settle));
    s.petal = [5, 0.17 * pull, 0.028, Math.PI / 2];
    s.petalAt = [0, 0, 0, 0.3];
    s.vortices = [{ x: 0, y: 0, r: 0.2, a: 1.55 * smooth(span(p, BEATS.pull[0] + 0.08, BEATS.settle[1])) + (this.still ? 0 : 0.05 * Math.sin(t * 0.5)) }];
    const wob = (this.still ? 0 : 1) * (0.5 + 0.5 * pull);
    s.warp = [0.035 * wob + 0.02, 2.1, 0.2 * Math.sin(t * 0.14), 0.2 * Math.cos(t * 0.11)];
    const tall = aspect < 0.9;
    // On a phone the flower moves up early and keeps the lower half for the words that follow.
    const move = tall ? smooth(span(p, 0.62, 0.8)) : settle;
    const zoom = tall ? lerp(1.5, 2.25, move) : lerp(1.16, 1.05, settle);
    s.scale = zoom;
    s.shift = [-this.aim[0] * aspect * zoom * move, -this.aim[1] * zoom * move];

    // Reading: one person's ink stays lit, the others step back.
    const keep = this.focus ?? this.hovered;
    const keepInk = keep ? C[MEMBER_INK[keep]] : -1;
    for (let c = 1; c <= 6; c += 1) {
      const goal = keep && c !== keepInk ? 1 : 0;
      this.dim[c] += (goal - this.dim[c]) * (1 - Math.exp(-dt * 9));
      s.palette[c] = mix(ON_WATER[c], DARK as RGB, this.dim[c] * 0.86);
    }

    this.pickIn -= dt;
    if (this.pointer.inside && this.pickIn <= 0 && p > BEATS.settle[0]) {
      this.pickIn = 0.08;
      const hit = marble.pick(s, this.pointer.x * ratio, h - this.pointer.y * ratio);
      if (hit) this.hover((hit.index >= 0 ? FALLS.filter((f) => p > f.at)[hit.index] : undefined)?.who ?? null);
    }
    if (p <= BEATS.settle[0]) this.hover(null);
    return s;
  }
}
