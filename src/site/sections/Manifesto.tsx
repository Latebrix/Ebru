import { useGSAP } from '@gsap/react';
import { useRef } from 'react';
import { reducedMotion } from '../../ink/quality.ts';
import { gsap, SplitText } from '../motion.ts';
import './manifesto.css';

function Chip({ name, tilt }: { name: string; tilt: number }) {
  return (
    <span className="chip" style={{ '--tilt': `${tilt}deg` } as React.CSSProperties}>
      <img src={`./ebru/chip-${name}.webp`} alt="" loading="lazy" decoding="async" />
    </span>
  );
}

export function Manifesto() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      new SplitText(q('.manifesto-text'), { type: 'words', wordsClass: 'word', ignore: '.chip' });
      if (reducedMotion()) return;
      // The sheet is laid on the ink: it arrives slightly turned and settles flat.
      gsap.fromTo(
        q('.sheet'),
        { rotate: -3.2, yPercent: 4, transformOrigin: '20% 0%' },
        { rotate: 0, yPercent: 0, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'top 12%', scrub: 0.3 } },
      );
      const pieces = q('.word, .chip');
      const timeline = gsap.timeline({ scrollTrigger: { trigger: q('.manifesto-text'), start: 'top 74%', end: 'bottom 62%', scrub: 0.5 } });
      pieces.forEach((el, i) => {
        if (el.classList.contains('chip')) {
          timeline.fromTo(el, { clipPath: 'inset(0% 50% 0% 50% round 0.3em)', rotate: 0 }, { clipPath: 'inset(0% 0% 0% 0% round 0.3em)', rotate: 'var(--tilt)', duration: 3.2, ease: 'power3.out' }, i);
          timeline.fromTo(el.querySelector('img'), { scale: 1.7 }, { scale: 1, duration: 3.6, ease: 'power3.out' }, i);
        } else {
          timeline.fromTo(el, { opacity: 0.14 }, { opacity: 1, duration: 2.2, ease: 'none' }, i);
        }
      });
      gsap.from(q('.manifesto-note'), { y: 30, opacity: 0, duration: 1.1, scrollTrigger: { trigger: q('.manifesto-note'), start: 'top 88%' } });
    },
    { scope: root },
  );

  return (
    <section className="manifesto" id="problem" ref={root} data-nav="light" data-under="#f4ece0">
      <div className="sheet">
        <svg className="deckle" viewBox="0 0 1440 26" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 26V13l31-4 46 5 38-6 57 3 44-5 61 7 33-4 49 2 62-6 45 6 71-3 39 4 58-7 47 5 66-2 52 5 41-6 73 4 36-3 64 5 55-6 48 4 69-3 43 6 51-5 67 2 34-4 58 6 46-5 26 3V26z" />
        </svg>
        <div className="sheet-in">
          <p className="manifesto-text display">
            Five people <Chip name="hands" tilt={-2} /> start a project. By week two, one of them is doing everything, <Chip name="octopus" tilt={2} /> one has quietly drifted off, <Chip name="jellyfish" tilt={-3} /> and the deadline is about to burst.{' '}
            <Chip name="puffer" tilt={2} /> And nobody saw it coming.
          </p>
          <p className="manifesto-note lead">We are students. We have been all of them.</p>
        </div>
      </div>
    </section>
  );
}
