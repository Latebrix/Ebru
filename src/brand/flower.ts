/**
 * The ebru flower: rings of five people's ink, pulled inward by five strokes and given one turn.
 * One lobe per member. Used as the symbol, the favicon and the picture the team paints together.
 */
export interface PetalShape {
  count: number;
  depth: number;
  width: number;
  /** Radius at which the strokes reach full depth. */
  outer: number;
  phase: number;
  /** Final turn of the stylus: angle at the centre and how far it reaches. */
  swirl: number;
  reach: number;
  /** Irregularity of the hand. */
  wobble: number;
}

export const FLOWER: PetalShape = { count: 5, depth: 0.37, width: 0.06, outer: 0.66, phase: Math.PI / 2, swirl: 1.75, reach: 0.45, wobble: 0.03 };

/** Radius of a ring of size `r` in direction `theta`, after the strokes. */
export function petalRadius(r: number, theta: number, f: PetalShape): number {
  const k = (Math.PI * 2) / f.count;
  const turn = (theta + f.phase) / k + 0.5;
  const a = (turn - Math.floor(turn) - 0.5) * k;
  const s = Math.abs(Math.sin(a));
  // rho + pull(rho) = r, solved by bisection (the left side only grows with rho).
  let lo = 0;
  let hi = r;
  for (let i = 0; i < 26; i += 1) {
    const rho = (lo + hi) / 2;
    const t = Math.min(1, rho / f.outer);
    const pull = f.depth * Math.exp((-rho * s) / f.width) * t * t * (3 - 2 * t);
    if (rho + pull < r) lo = rho;
    else hi = rho;
  }
  return (lo + hi) / 2;
}

/** Closed SVG path for one ring. `size` scales ink units to path units; y points down. */
export function petalPath(r: number, f: PetalShape = FLOWER, size = 50, cx = 50, cy = 50, steps = 240): string {
  let d = '';
  for (let i = 0; i < steps; i += 1) {
    // Start on a cusp so every cusp is sampled exactly.
    const theta = (i / steps) * Math.PI * 2 - f.phase;
    const rho = petalRadius(r, theta, f);
    const turned = theta + f.swirl * Math.exp(-((rho / f.reach) ** 2));
    const x = Math.cos(turned) * rho;
    const y = Math.sin(turned) * rho;
    const px = x + f.wobble * Math.sin(y * 3.1 + 1.2);
    const py = y + f.wobble * Math.sin(x * 2.7 + 0.4);
    d += `${i === 0 ? 'M' : 'L'}${(cx + px * size).toFixed(2)} ${(cy - py * size).toFixed(2)}`;
  }
  return `${d}Z`;
}

/** Rings from the outside in: radius and colour. Bone rings are the pauses between hands. */
export const FLOWER_RINGS: { r: number; color: string }[] = [
  { r: 0.95, color: '#2a3df0' },
  { r: 0.855, color: '#f4ece0' },
  { r: 0.82, color: '#ff5a3c' },
  { r: 0.65, color: '#ffb43a' },
  { r: 0.545, color: '#f4ece0' },
  { r: 0.515, color: '#0f9d8f' },
  { r: 0.37, color: '#ff9ec2' },
  { r: 0.215, color: '#2a3df0' },
  { r: 0.085, color: '#f4ece0' },
];
