/** One S-shaped pull of the comb, the same curve the ink engine uses. */
export function pull(x: number): number {
  const f = Math.abs(x - Math.floor(x) - 0.5) * 2;
  return Math.exp(-3.2 * (1 - f)) * 1.04 - Math.exp(-3.2 * f) * 1.04;
}
