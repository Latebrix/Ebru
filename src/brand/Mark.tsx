import { useMemo } from 'react';
import { FLOWER, FLOWER_RINGS, petalPath } from './flower.ts';
import { EBRU_BOX, EBRU_PATH } from './wordmark.ts';

export function Wordmark({ className, title = 'ebru' }: { className?: string; title?: string }) {
  return (
    <svg className={className} viewBox={`0 0 ${EBRU_BOX.w} ${EBRU_BOX.h}`} role="img" aria-label={title} fill="currentColor">
      <path d={EBRU_PATH} fillRule="evenodd" />
    </svg>
  );
}

/** The five-lobed ink flower. */
export function Flower({ className }: { className?: string }) {
  const rings = useMemo(() => FLOWER_RINGS.map((ring) => ({ ...ring, d: petalPath(ring.r, FLOWER, 50, 50, 50) })), []);
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true">
      {rings.map((ring, i) => (
        <path key={ring.r} d={ring.d} fill={ring.color} data-ring={i} />
      ))}
    </svg>
  );
}
