import { useEffect, useState } from 'react';
import { HEX, tints } from '../../brand/palette.ts';
import { inkState, type InkState } from '../../ink/Marble.ts';
import { rng } from '../../ink/random.ts';
import { inkTexture } from '../../ink/texture.ts';
import { people, type Person } from '../people.ts';

const W = 384;
const H = 480;

/** Five small papers from five baths, fine enough for a narrow ring. */
function paper(p: Person, i: number): InkState {
  const r = rng(310 + i * 17);
  const drops = Array.from({ length: 92 }, (_, k) => ({ x: (r() - 0.5) * 0.9, y: (r() - 0.5) * 1.1, r: 0.02 + r() * 0.055, c: 1 + (k % 6) }));
  return inkState({
    palette: tints(HEX[p.ink]),
    drops,
    warp: [0.06, 3.4, r() * 3, r() * 3],
    comb: [0.1, 0.07 + (i % 3) * 0.012, 0.3 * (i - 2), r()],
    vein: [0.02, 0.6, 1.4],
    veinOpacity: 0.8,
    pool: 0.06,
    grain: 0.015,
  });
}

/** The paper of one teammate, printed once and kept. */
function printPaper(id: string): Promise<string> {
  const i = people.findIndex((p) => p.id === id);
  return inkTexture(`ring-${id}`, W, H, () => paper(people[i], i));
}

/**
 * Every teammate's paper by their id. Missing until it has dried, and on machines that cannot
 * paint: the plain colour says the same.
 */
export function usePapers(wanted = true): Record<string, string> {
  const [papers, set] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!wanted) return;
    let stale = false;
    for (const { id } of people) {
      printPaper(id)
        .then((url) => !stale && set((old) => ({ ...old, [id]: url })))
        .catch(() => undefined);
    }
    return () => {
      stale = true;
    };
  }, [wanted]);
  return papers;
}
