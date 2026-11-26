import { BufferAttribute, BufferGeometry } from 'three';

/**
 * The shape of an oceanic squid, in body units: the head sits at the origin, the mantle points up,
 * the arms hang down, the back faces +z. Everything that only bends is built once here.
 */
export const MANTLE = 2.78;

type Point = readonly [y: number, r: number];

const MANTLE_PROFILE: Point[] = [
  [0.34, 0.3], [0.2, 0.4], [0.08, 0.46], [-0.005, 0.5], [-0.05, 0.54], [-0.03, 0.575], [0.06, 0.59], [0.3, 0.605],
  [0.7, 0.615], [1.1, 0.59], [1.5, 0.515], [1.88, 0.4], [2.22, 0.262], [2.48, 0.146], [2.66, 0.06], [2.74, 0.02], [MANTLE, 0.0],
];

const HEAD_PROFILE: Point[] = [
  [-0.63, 0.0], [-0.61, 0.13], [-0.55, 0.24], [-0.46, 0.318], [-0.34, 0.375], [-0.2, 0.404], [-0.06, 0.4], [0.1, 0.378], [0.24, 0.355], [0.4, 0.3],
];

/** Catmull–Rom through the profile; returns the point and its tangent. */
function along(profile: Point[], t: number): { y: number; r: number; dy: number; dr: number } {
  const n = profile.length - 1;
  const f = Math.min(n - 1e-6, Math.max(0, t * n));
  const i = Math.floor(f);
  const u = f - i;
  const p = [profile[Math.max(0, i - 1)], profile[i], profile[i + 1], profile[Math.min(n, i + 2)]];
  const at = (k: 0 | 1) => 0.5 * (2 * p[1][k] + (p[2][k] - p[0][k]) * u + (2 * p[0][k] - 5 * p[1][k] + 4 * p[2][k] - p[3][k]) * u * u + (3 * p[1][k] - p[0][k] - 3 * p[2][k] + p[3][k]) * u * u * u);
  const d = (k: 0 | 1) => 0.5 * (p[2][k] - p[0][k] + 2 * (2 * p[0][k] - 5 * p[1][k] + 4 * p[2][k] - p[3][k]) * u + 3 * (3 * p[1][k] - p[0][k] - 3 * p[2][k] + p[3][k]) * u * u);
  return { y: at(0), r: Math.max(0, at(1)), dy: d(0), dr: d(1) };
}

/** Outer radius of the mantle at a height, for attaching the fins. */
export function mantleRadius(y: number): number {
  for (let i = 5; i < MANTLE_PROFILE.length - 1; i += 1) {
    const [y0, r0] = MANTLE_PROFILE[i];
    const [y1, r1] = MANTLE_PROFILE[i + 1];
    if (y >= y0 && y <= y1) return r0 + ((r1 - r0) * (y - y0)) / (y1 - y0);
  }
  return 0;
}

interface Build {
  position: number[];
  normal: number[];
  rest: number[];
  skin: number[];
  fin: number[];
  index: number[];
}

const empty = (): Build => ({ position: [], normal: [], rest: [], skin: [], fin: [], index: [] });

function finish(b: Build): BufferGeometry {
  const g = new BufferGeometry();
  const n = b.position.length / 3;
  g.setAttribute('position', new BufferAttribute(new Float32Array(b.position), 3));
  g.setAttribute('normal', new BufferAttribute(new Float32Array(b.normal), 3));
  g.setAttribute('aRest', new BufferAttribute(new Float32Array(b.rest), 3));
  g.setAttribute('aSkin', new BufferAttribute(new Float32Array(b.skin), 2));
  g.setAttribute('aFin', new BufferAttribute(new Float32Array(b.fin.length ? b.fin : new Array(n * 2).fill(0)), 2));
  g.setAttribute('aPair', new BufferAttribute(new Float32Array(n).fill(-1), 1));
  g.setIndex(b.index);
  return g;
}

function revolve(profile: Point[], rows: number, cols: number, shape: (y: number, theta: number) => number, skin: (y: number, v: number) => [number, number], flat = 0.93): BufferGeometry {
  const b = empty();
  for (let i = 0; i <= rows; i += 1) {
    const p = along(profile, i / rows);
    for (let j = 0; j <= cols; j += 1) {
      const v = j / cols;
      const th = v * Math.PI * 2;
      const k = shape(p.y, th);
      const x = Math.sin(th) * p.r * k;
      const z = Math.cos(th) * p.r * k * flat;
      const len = Math.hypot(p.dy, p.dr) || 1;
      b.position.push(x, p.y, z);
      b.normal.push((Math.sin(th) * p.dy) / len, -p.dr / len, (Math.cos(th) * p.dy) / len / flat);
      b.rest.push(x, p.y, z);
      b.skin.push(...skin(p.y, v));
    }
  }
  const w = cols + 1;
  for (let i = 0; i < rows; i += 1) {
    for (let j = 0; j < cols; j += 1) {
      const a = i * w + j;
      b.index.push(a, a + 1, a + w, a + 1, a + w + 1, a + w);
    }
  }
  return finish(b);
}

export const mantleGeometry = () =>
  revolve(MANTLE_PROFILE, 84, 72, (y, th) => 1 + (y < 0.05 ? 0.03 * Math.cos(th * 2) : 0), (y, v) => [0.03 + y * 0.345, v * 2]);

/** Eyes sit at the sides, so the head swells there. */
export const EYE_AT = { x: 0.372, y: -0.2, z: 0.02, r: 0.205 };

export const headGeometry = () =>
  revolve(
    HEAD_PROFILE,
    40,
    64,
    (y, th) => 1 + 0.1 * Math.exp(-(((y - EYE_AT.y) / 0.2) ** 2)) * Math.abs(Math.sin(th)) ** 5,
    (y, v) => [0.5 + y * 0.28, v * 1.6],
  );

/** The funnel it steers and jets with. */
export const funnelGeometry = () =>
  revolve([[-0.05, 0.085], [-0.2, 0.09], [-0.215, 0.11], [-0.19, 0.118], [-0.08, 0.135], [0.06, 0.165], [0.2, 0.19], [0.3, 0.2]], 28, 28, () => 1, (y, v) => [0.45 + y * 0.3, v]);

/** One broad, pointed fin: from the middle of the mantle to its tip. */
export function finGeometry(side: -1 | 1): BufferGeometry {
  const b = empty();
  const N = 64;
  const M = 16;
  const from = 1.02;
  const to = 2.8;
  for (let i = 0; i <= N; i += 1) {
    const t = i / N;
    const y = from + (to - from) * t;
    const root = mantleRadius(y) * 0.62 - 0.02 * t;
    // Rises slowly from the front, widest past the middle, then falls away to the tip.
    const span = 0.98 * Math.max(0, Math.sin(Math.PI * t ** 1.18)) ** 0.82 * (0.62 + 0.5 * t);
    for (let j = 0; j <= M; j += 1) {
      const v = j / M;
      const x = side * (root + span * v);
      // The outer edge is swept back toward the tip.
      const yy = y + v * span * 0.16;
      b.position.push(x, yy, 0.1 - 0.06 * v);
      b.normal.push(0, 0, 1);
      b.rest.push(x, yy, 0.1);
      b.skin.push(0.5 + yy * 0.28 + v * 0.04, 0.3 + side * (0.2 + v * 0.22));
      b.fin.push(t, v);
    }
  }
  const w = M + 1;
  for (let i = 0; i < N; i += 1) {
    for (let j = 0; j < M; j += 1) {
      const a = i * w + j;
      b.index.push(a, a + 1, a + w, a + 1, a + w + 1, a + w);
    }
  }
  return finish(b);
}

/** Where each arm grows: angle around the mouth from the back, and its pair. */
export interface ArmPlan {
  pair: number;
  side: -1 | 1;
  phi: number;
  ring: number;
  length: number;
  radius: number;
  splay: number;
  curl: number;
}

const D = Math.PI / 180;
const PLAN = [
  { phi: 24, ring: 0.17, length: 2.45, radius: 0.126, splay: 0.5, curl: 0.9 },
  { phi: 70, ring: 0.2, length: 2.7, radius: 0.134, splay: 0.62, curl: -1.15 },
  { phi: 112, ring: 0.2, length: 2.9, radius: 0.138, splay: 0.46, curl: 1.0 },
  { phi: 136, ring: 0.14, length: 2.75, radius: 0.12, splay: 0.36, curl: 0.6 },
  { phi: 158, ring: 0.17, length: 2.55, radius: 0.13, splay: 0.34, curl: -0.8 },
];

export const ARMS: ArmPlan[] = PLAN.flatMap((p, pair) => ([-1, 1] as const).map((side) => ({ pair, side, ...p, phi: side * p.phi * D })));

/** Thickness along an arm. */
export function armRadius(a: ArmPlan, u: number): number {
  return a.radius * (0.03 + 0.97 * (1 - u) ** 0.9) * (1 + 0.16 * Math.exp(-((u / 0.08) ** 2)));
}
