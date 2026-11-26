import { useRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type PointerEvent, type ReactNode } from 'react';
import { HEX } from '../../brand/palette.ts';

const INKS = [HEX.verm, HEX.saff, HEX.pink, HEX.teal, HEX.blue];
let next = 0;

type Tone = 'solid' | 'line' | 'ink';

interface Base {
  tone?: Tone;
  children: ReactNode;
  icon?: ReactNode;
}

/** A drop of ink spreads from wherever the pointer came in; every visit uses the next colour. */
function useDrop() {
  const ref = useRef<HTMLElement | null>(null);
  const place = (event: PointerEvent<HTMLElement>, entering: boolean) => {
    const el = event.currentTarget;
    ref.current = el;
    const box = el.getBoundingClientRect();
    el.style.setProperty('--dx', `${event.clientX - box.left}px`);
    el.style.setProperty('--dy', `${event.clientY - box.top}px`);
    if (entering) {
      const ink = INKS[next % INKS.length];
      next += 1;
      el.style.setProperty('--drop', ink);
      el.style.setProperty('--drop-text', ink === HEX.blue || ink === HEX.teal ? HEX.bone : HEX.ink);
    }
  };
  return {
    onPointerEnter: (event: PointerEvent<HTMLElement>) => place(event, true),
    onPointerLeave: (event: PointerEvent<HTMLElement>) => place(event, false),
  };
}

function Inner({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <>
      <span className="btn-drop" aria-hidden="true" />
      <span className="btn-label">
        {icon}
        {children}
      </span>
    </>
  );
}

export function LinkButton({ tone = 'solid', icon, children, className = '', ...rest }: Base & AnchorHTMLAttributes<HTMLAnchorElement>) {
  const drop = useDrop();
  return (
    <a className={`btn btn-${tone} ${className}`} {...drop} {...rest}>
      <Inner icon={icon}>{children}</Inner>
    </a>
  );
}

export function Button({ tone = 'solid', icon, children, className = '', type = 'button', ...rest }: Base & ButtonHTMLAttributes<HTMLButtonElement>) {
  const drop = useDrop();
  return (
    <button type={type} className={`btn btn-${tone} ${className}`} {...drop} {...rest}>
      <Inner icon={icon}>{children}</Inner>
    </button>
  );
}

export const PlayIcon = () => (
  <svg className="btn-icon" width="11" height="12" viewBox="0 0 11 12" fill="currentColor" aria-hidden="true">
    <path d="M1 1.2v9.6c0 .6.7 1 1.2.7l7.8-4.8c.5-.3.5-1 0-1.4L2.2.5C1.7.2 1 .6 1 1.2z" />
  </svg>
);
