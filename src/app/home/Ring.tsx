import { person } from '../people.ts';
import './ring.css';

interface Props {
  id: string;
  /** 1 is all that one person can carry. */
  ratio: number;
  /** Printed marbling; plain colour until it has dried. */
  paper: string | null;
}

/** Ellipses that begin at twelve o'clock. */
const oval = (rx: number, ry: number) => `M64 ${80 - ry}a${rx} ${ry} 0 0 1 0 ${ry * 2}a${rx} ${ry} 0 0 1 0 ${-ry * 2}`;
const MAIN = oval(54, 70);
const RIM = oval(61.8, 77.8);
const MORE = oval(68, 84);

/** A portrait in a ring of white paper. The ring fills with ink, and what does not fit lies outside it. */
export function Ring({ id, ratio, paper }: Props) {
  const p = person(id)!;
  const percent = Math.round(ratio * 100);
  const inked = Math.min(100, percent);
  const more = Math.max(0, percent - 100);
  return (
    <span className="ring" style={{ '--c': p.hex } as React.CSSProperties}>
      <svg viewBox="0 0 128 160" aria-hidden="true">
        <defs>
          <pattern id={`ring-${id}`} width="128" height="160" patternUnits="userSpaceOnUse">
            <rect width="128" height="160" fill={p.hex} />
            {paper && <image href={paper} width="128" height="160" preserveAspectRatio="xMidYMid slice" />}
          </pattern>
        </defs>
        <path className="ring-track" d={MAIN} />
        <path className="ring-ink" d={MAIN} pathLength={100} stroke={`url(#ring-${id})`} strokeDasharray={`${inked} 200`} data-empty={inked === 0} />
        <path className="ring-rim" d={RIM} />
        <path className="ring-more" d={MORE} pathLength={100} strokeDasharray={`${more} 200`} data-empty={more === 0} />
      </svg>
      <img src={p.portrait} alt="" width={190} height={252} draggable={false} loading="lazy" />
    </span>
  );
}
