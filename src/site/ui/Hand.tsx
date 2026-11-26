import { useEffect, useId, useState } from 'react';
import type { HandShape } from '../../brand/hands.ts';
import { HEX, tints, type InkName } from '../../brand/palette.ts';
import { inkState } from '../../ink/Marble.ts';
import { rng } from '../../ink/random.ts';
import { inkTexture } from '../../ink/texture.ts';

/** Marbled cloth in the tints of one ink. */
export function clothTexture(ink: InkName, seed = 3): Promise<string> {
  return inkTexture(`cloth-${ink}-${seed}`, 1200, 420, () => {
    const r = rng(seed * 97 + ink.length * 13);
    const drops = [];
    // Large stones first, then rings, then a spray of small drops: the order a real bath is thrown.
    for (let i = 0; i < 16; i += 1) drops.push({ x: (r() - 0.5) * 3, y: (r() - 0.5) * 1.2, r: 0.16 + r() * 0.2, c: [1, 2, 4, 5][i % 4] });
    for (let i = 0; i < 9; i += 1) {
      const x = (r() - 0.5) * 2.8;
      const y = (r() - 0.5) * 0.9;
      let q = 0.13 + r() * 0.1;
      for (const c of [5, 4, 2, 1]) {
        drops.push({ x, y, r: q, c });
        q *= 0.72;
      }
    }
    for (let i = 0; i < 40; i += 1) drops.push({ x: (r() - 0.5) * 2.9, y: (r() - 0.5) * 1.05, r: 0.012 + r() * r() * 0.07, c: 1 + (i % 5) });
    return inkState({
      palette: tints(HEX[ink]),
      drops,
      warp: [0.62, 1.15, r() * 2 - 1, r() * 2 - 1],
      vortices: [
        { x: -1.05, y: 0.1, r: 0.36, a: 3.2 },
        { x: -0.2, y: -0.16, r: 0.34, a: -2.8 },
        { x: 0.75, y: 0.12, r: 0.4, a: 3.4 },
      ],
      vein: [0.012, 0.5, 1.2],
      veinOpacity: 0.55,
      pool: 0.1,
      grain: 0.022,
    });
  });
}

interface Props {
  shape: HandShape;
  ink: InkName;
  mirror?: boolean;
  /** Degrees, applied before mirroring. */
  turn?: number;
  /** How far the sleeve reaches, in the same units as the hand. */
  length?: number;
  className?: string;
}
/** The cuff sits a little over the wrist. */
const OVERLAP = 16;

/** A pinching hand whose fingertips sit exactly on the element's origin. Scale with --u (px per unit). */
export function Hand({ shape, ink, mirror = false, turn = 0, length = 3200, className = '' }: Props) {
  const id = useId();
  const [cloth, setCloth] = useState<string | null>(null);

  useEffect(() => {
    let stale = false;
    clothTexture(ink)
      .then((url) => !stale && setCloth(url))
      .catch(() => undefined);
    return () => {
      stale = true;
    };
  }, [ink]);

  const [c1, c2] = shape.cuff.map((c, i) => [c[0] - shape.dir[i][0] * OVERLAP, c[1] - shape.dir[i][1] * OVERLAP]);
  const [e1, e2] = [c1, c2].map((c, i) => [c[0] + shape.dir[i][0] * length, c[1] + shape.dir[i][1] * length]);
  const sleeve = `M${c1}L${e1}L${e2}L${c2}Z`;
  const along = (Math.atan2(shape.dir[0][1] + shape.dir[1][1], shape.dir[0][0] + shape.dir[1][0]) * 180) / Math.PI;
  const mid = [(c1[0] + c2[0]) / 2, (c1[1] + c2[1]) / 2];

  return (
    <svg className={`hand ${className}`} viewBox="0 0 100 100" aria-hidden="true">
      <g transform={`${mirror ? 'scale(-1 1) ' : ''}rotate(${turn})`}>
        <path className="hand-skin" d={shape.path} />
        <clipPath id={id}>
          <path d={sleeve} />
        </clipPath>
        <g clipPath={`url(#${id})`}>
          <path d={sleeve} fill={HEX[ink]} />
          {cloth && <image href={cloth} x={-60} y={-length * 0.2} width={length + 200} height={length * 0.4} preserveAspectRatio="xMidYMid slice" transform={`translate(${mid}) rotate(${along})`} />}
        </g>
        <path className="hand-seam" d={sleeve} />
      </g>
    </svg>
  );
}
