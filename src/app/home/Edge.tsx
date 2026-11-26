import { HEX } from '../../brand/palette.ts';
import { pull } from '../../ink/comb.ts';

const BANDS = [HEX.pink, HEX.saff, HEX.bone].map((color, i) => {
  // The bands behind end under the paper, so no colour shows along its seam.
  const floor = i === 2 ? 64 : 52;
  let d = `M-40 ${floor}`;
  for (let x = -40; x <= 1480; x += 4) d += `L${x} ${(16 + i * 11 + pull(x / 96 + 0.18 + i * 0.012) * (13 - i)).toFixed(1)}`;
  return { color, d: `${d}L1480 ${floor}Z` };
});

/** The combed edge between the water and the paper, one band behind the other. */
export function Edge({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 1440 64" preserveAspectRatio="none" aria-hidden="true">
      {BANDS.map((b) => (
        <path key={b.color} d={b.d} fill={b.color} />
      ))}
    </svg>
  );
}
