/**
 * Which drop lies under a pixel. The same backward path the shader takes, walked once by the
 * processor, so the question never has to wait for the graphics card.
 */
import type { InkPick, InkState } from './Marble.ts';
import { MAX_DROPS, MAX_STROKES } from './shader.ts';
import { CPU_FIELD } from './uniforms.ts';

const fract = (x: number) => x - Math.floor(x);
const smoothstep = (a: number, b: number, x: number) => {
  const u = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return u * u * (3 - 2 * u);
};
const cusp = (x: number) => {
  const f = Math.abs(fract(x) - 0.5) * 2;
  return Math.exp(-3.2 * (1 - f)) * 1.04 - Math.exp(-3.2 * f) * 1.04;
};

/** Beyond its edge the current goes on as in a mirror. */
const fold = (i: number) => {
  const m = i & (CPU_FIELD * 2 - 1);
  return Math.min(m, CPU_FIELD * 2 - 1 - m);
};

/** The current at a point, from the copied field. */
function current(field: Float32Array, qx: number, qy: number): [number, number] {
  const tx = (qx + 4) * (CPU_FIELD / 8) - 0.5;
  const ty = (qy + 4) * (CPU_FIELD / 8) - 0.5;
  const ix = Math.floor(tx);
  const iy = Math.floor(ty);
  const fx = tx - ix;
  const fy = ty - iy;
  const at = (x: number, y: number, k: number) => field[(fold(y) * CPU_FIELD + fold(x)) * 2 + k];
  const mix = (k: number) => (at(ix, iy, k) * (1 - fx) + at(ix + 1, iy, k) * fx) * (1 - fy) + (at(ix, iy + 1, k) * (1 - fx) + at(ix + 1, iy + 1, k) * fx) * fy;
  return [mix(0), mix(1)];
}

function unstroke(s: InkState, field: Float32Array, x: number, y: number): [number, number] {
  const k = 1 / (s.strokeRadius * s.strokeRadius);
  for (const st of s.strokes.slice(-MAX_STROKES).reverse()) {
    const dx = x - st.x;
    const dy = y - st.y;
    const e = Math.exp(-(dx * dx + dy * dy) * k);
    x -= st.dx * e;
    y -= st.dy * e;
  }
  for (const v of s.vortices.slice(0, 4)) {
    if (v.a === 0) continue;
    const dx = x - v.x;
    const dy = y - v.y;
    const a = v.a * Math.exp(-(dx * dx + dy * dy) / (v.r * v.r));
    const c = Math.cos(a);
    const n = Math.sin(a);
    // Matrices in the shader are written by columns.
    x = v.x + c * dx + n * dy;
    y = v.y - n * dx + c * dy;
  }
  if (s.warp[0] > 0) {
    const [wx, wy] = current(field, x * s.warp[1] + s.warp[2], y * s.warp[1] + s.warp[3]);
    x += s.warp[0] * wx;
    y += s.warp[0] * wy;
  }
  if (s.ripple[2] !== 0) {
    const dx = x - s.ripple[0];
    const dy = y - s.ripple[1];
    const rho = Math.hypot(dx, dy);
    const wave = Math.sin(rho * s.ripple[3] - s.rippleMod[0]) * Math.exp(-rho / s.rippleMod[1]) * smoothstep(0, 0.05, rho);
    const g = (s.ripple[2] * wave) / Math.max(rho, 1e-4);
    x += dx * g;
    y += dy * g;
  }
  if (s.petal[1] !== 0) {
    const dx = x - s.petalAt[0];
    const dy = y - s.petalAt[1];
    const rho = Math.hypot(dx, dy);
    const kk = (Math.PI * 2) / s.petal[0];
    const a = (fract((Math.atan2(dy, dx) + s.petal[3]) / kk + 0.5) - 0.5) * kk;
    let pull = s.petal[1] * Math.exp((-rho * Math.abs(Math.sin(a))) / s.petal[2]) * smoothstep(Math.max(0, s.petalAt[2]), s.petalAt[3], rho);
    if (s.petalAt[2] < 0) pull *= 1 - smoothstep(-s.petalAt[2], -s.petalAt[2] * 1.35, rho);
    const g = (rho + pull) / Math.max(rho, 1e-4);
    x = s.petalAt[0] + dx * g;
    y = s.petalAt[1] + dy * g;
  }
  const comb = (amp: number, spacing: number, angle: number, phase: number, alongX: boolean) => {
    if (amp === 0) return;
    const c = Math.cos(angle);
    const n = Math.sin(angle);
    let qx = c * x + n * y;
    let qy = -n * x + c * y;
    if (alongX) qx -= amp * cusp(qy / spacing + phase);
    else qy -= amp * cusp(qx / spacing + phase);
    x = c * qx - n * qy;
    y = n * qx + c * qy;
  };
  comb(...s.comb2, true);
  comb(...s.comb, false);
  return [x, y];
}

/** `px`, `py` are device pixels from the bottom left of a canvas of `w` by `h`. */
export function pickInk(s: InkState, field: Float32Array, px: number, py: number, w: number, h: number): InkPick {
  const [x0, y0] = unstroke(s, field, ((px - w / 2) / h) * s.scale + s.shift[0], ((py - h / 2) / h) * s.scale + s.shift[1]);
  let x = x0;
  let y = y0;
  const first = Math.max(0, s.drops.length - MAX_DROPS);
  for (let i = s.drops.length - 1; i >= first; i -= 1) {
    const d = s.drops[i];
    const dx = x - d.x;
    const dy = y - d.y;
    const m = (d.r * d.r) / Math.max(dx * dx + dy * dy, 1e-9);
    if (m > 1) return { index: i, color: d.c, x: x0, y: y0 };
    const k = Math.sqrt(1 - m);
    x = d.x + dx * k;
    y = d.y + dy * k;
  }
  return { index: -1, color: 0, x: x0, y: y0 };
}
