import { useGSAP } from '@gsap/react';
import { useEffect, useRef, useState } from 'react';
import { Flower, Wordmark } from '../../brand/Mark.tsx';
import { reducedMotion } from '../../ink/quality.ts';
import { gsap, holdScroll, ScrollTrigger, scrollTo } from '../motion.ts';
import { LinkButton } from './Button.tsx';
import { onSound, plop, setSound, soundOn } from './sound.ts';
import './nav.css';
import { LINKS as SITES } from '../../links.ts';

const LINKS = [
  ['#problem', 'The problem'],
  ['#proof', 'FairProof'],
  ['#rubric', 'Rubric check'],
  ['#guard', 'FairGuard'],
  ['#kalem', 'Kalem'],
] as const;

export function Nav({ show }: { show: boolean }) {
  const bar = useRef<HTMLElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [sound, setSoundState] = useState(soundOn());

  useEffect(() => onSound(setSoundState), []);

  useGSAP(() => {
    if (!show || reducedMotion()) return;
    gsap.from(bar.current!.querySelectorAll('[data-in]'), { y: -40, opacity: 0, stagger: 0.06, duration: 1.1, delay: 0.5 });
  }, [show]);

  // Hide on the way down, return on the way up, and follow the colour of the section underneath.
  useEffect(() => {
    const el = bar.current!;
    /** Every section that gives the bar a colour, measured once and again when the page changes. */
    let marks: { top: number; bottom: number; theme: string; under: string }[] = [];
    const measure = () => {
      const y = window.scrollY;
      marks = [...document.querySelectorAll<HTMLElement>('[data-nav]')].map((s) => {
        const box = s.getBoundingClientRect();
        // The seam at the top of a section still shows the colour of the one above.
        const seam = s.querySelector<HTMLElement>(':scope > .comb-edge.is-flow')?.offsetHeight ?? 0;
        return { top: box.top + y + seam * 0.72, bottom: box.bottom + y, theme: s.dataset.nav!, under: s.dataset.under ?? getComputedStyle(s).backgroundColor };
      });
    };
    measure();
    ScrollTrigger.addEventListener('refresh', measure);
    let shown: (typeof marks)[number] | null = null;
    const trigger = ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: (self) => {
        const y = self.scroll();
        if (y < 80) el.dataset.hidden = 'false';
        else if (Math.abs(self.getVelocity()) > 160) el.dataset.hidden = self.direction > 0 ? 'true' : 'false';
        let under: (typeof marks)[number] | null = null;
        for (const m of marks) if (m.top <= y + 40 && m.bottom > y + 40) under = m;
        el.dataset.scrolled = String(y > 80);
        if (under && under !== shown) {
          shown = under;
          el.dataset.theme = under.theme;
          el.style.setProperty('--under', under.under);
        }
      },
    });
    return () => {
      trigger.kill();
      ScrollTrigger.removeEventListener('refresh', measure);
    };
  }, []);

  useEffect(() => {
    holdScroll(open);
    if (!open) return;
    const close = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', close);
    sheet.current?.querySelector('a')?.focus();
    return () => window.removeEventListener('keydown', close);
  }, [open]);

  const go = (hash: string) => (event: React.MouseEvent) => {
    event.preventDefault();
    setOpen(false);
    holdScroll(false);
    scrollTo(hash);
  };

  return (
    <>
      <header className="nav" ref={bar} data-hidden="false" data-scrolled="false" data-theme="dark" style={{ visibility: show ? 'visible' : 'hidden' }}>
        <a className="nav-logo" href="#top" onClick={go('#top')} aria-label="ebru, back to the top" data-in>
          <Wordmark />
        </a>
        <nav className="nav-links" aria-label="Sections">
          {LINKS.map(([hash, label]) => (
            <a key={hash} href={hash} onClick={go(hash)} data-in>
              <span data-text={label}>{label}</span>
            </a>
          ))}
        </nav>
        <div className="nav-end">
          <button
            className="nav-sound"
            type="button"
            aria-pressed={sound}
            aria-label={sound ? 'Sound on' : 'Sound off'}
            data-in
            onClick={() => {
              setSound(!sound);
              if (!sound) plop(0.4);
            }}
          >
            {[0, 1, 2, 3].map((i) => (
              <i key={i} style={{ animationDelay: `${i * -0.23}s` }} data-on={sound} />
            ))}
          </button>
          <span data-in className="nav-cta">
            <LinkButton href={SITES.app}>Open the board</LinkButton>
          </span>
          <button className="nav-menu" type="button" aria-expanded={open} aria-controls="menu" onClick={() => setOpen(!open)} data-in>
            {open ? 'Close' : 'Menu'}
          </button>
        </div>
      </header>
      <div className="menu" id="menu" ref={sheet} data-open={open} inert={!open}>
        <Flower className="menu-flower" />
        <ul>
          {LINKS.map(([hash, label], i) => (
            <li key={hash} style={{ transitionDelay: open ? `${0.12 + i * 0.05}s` : '0s' }}>
              <a href={hash} onClick={go(hash)}>
                {label}
              </a>
            </li>
          ))}
        </ul>
        <LinkButton href={SITES.app}>Open the board</LinkButton>
      </div>
    </>
  );
}
