import { useGSAP } from '@gsap/react';
import { useEffect, useRef, useState } from 'react';
import { Wordmark } from '../../brand/Mark.tsx';
import { HEX } from '../../brand/palette.ts';
import { reducedMotion } from '../../ink/quality.ts';
import { useInk } from '../../ink/useInk.ts';
import { gsap, holdScroll, ScrollTrigger, SplitText } from '../motion.ts';
import { LinkButton, PlayIcon } from '../ui/Button.tsx';
import { ArmPeek } from '../ui/ArmPeek.tsx';
import { plop } from '../ui/sound.ts';
import { HeroScene } from './heroScene.ts';
import './hero.css';
import { LINKS } from '../../links.ts';

const SEEN = 'ebru.opening';

/** The opening plays once per visit and only when the page starts at the top. */
function shouldOpen(): boolean {
  if (reducedMotion() || window.scrollY > 40 || location.hash.length > 1) return false;
  try {
    return sessionStorage.getItem(SEEN) === null;
  } catch {
    return true;
  }
}

export function Hero({ onPour }: { onPour: () => void }) {
  const root = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const reader = useRef<HTMLDivElement>(null);
  const word = useRef<HTMLDivElement>(null);
  const scene = useInk(canvas, () => new HeroScene());
  const [poured, setPoured] = useState(false);

  useEffect(() => {
    const s = scene.current;
    const el = reader.current!;
    const x = gsap.quickTo(el, 'x', { duration: 0.35, ease: 'power3.out' });
    const y = gsap.quickTo(el, 'y', { duration: 0.35, ease: 'power3.out' });
    // The label that travels with the pointer and says whose drop this is.
    s.onRead = (story, px, py) => {
      x(px);
      y(py);
      if (!story) {
        el.dataset.on = 'false';
        return;
      }
      el.dataset.on = 'true';
      el.style.setProperty('--c', HEX[story.ink]);
      el.querySelector('b')!.textContent = `${story.who}, ${story.what}`;
      el.querySelector('small')!.textContent = story.note;
    };
    s.onDrop = (size) => plop(size);

    const open = shouldOpen();
    let stale = false;
    let patience = 0;
    s.onPour = () => {
      holdScroll(false);
      setPoured(true);
      onPour();
    };
    // Wait for the fonts so the headline never reflows mid-reveal, but not for long.
    const fonts = Promise.race([document.fonts.ready, new Promise((done) => setTimeout(done, 1200))]);
    void fonts.then(() => {
      if (stale) return;
      if (open) {
        try {
          sessionStorage.setItem(SEEN, '1');
        } catch {
          // Private mode: the opening simply plays again next time.
        }
        holdScroll(true);
        gsap.set(word.current, { autoAlpha: 1 });
        gsap.fromTo(word.current!.firstElementChild, { yPercent: 130 }, { yPercent: 0, duration: 0.8, ease: 'expo.out' });
        gsap.delayedCall(0.6, () => s.begin(true));
        // Whatever happens to the film, nobody is kept waiting for the page.
        patience = window.setTimeout(() => s.skip(), 9000);
      } else {
        s.begin(false);
      }
    });
    return () => {
      stale = true;
      window.clearTimeout(patience);
      holdScroll(false);
    };
  }, [scene, onPour]);

  useGSAP(
    () => {
      if (!poured) return;
      const q = gsap.utils.selector(root);
      gsap.set(word.current, { autoAlpha: 0 });
      gsap.set(q('.hero-copy, .hero-def, .hero-hint, .hero-shade'), { visibility: 'inherit' });
      const split = new SplitText(q('.hero-title'), { type: 'lines,chars', linesClass: 'mask-line', mask: 'lines' });
      if (!reducedMotion()) {
        gsap
          .timeline()
          .from(q('.hero-shade'), { opacity: 0, duration: 1.2, ease: 'power1.out' }, 0)
          .from(split.chars, { yPercent: 118, rotate: 7, transformOrigin: '0% 100%', stagger: 0.022, duration: 1.15 }, 0.1)
          .from(q('.hero-sub'), { y: 26, opacity: 0, duration: 1.1 }, 0.7)
          .from(q('.hero-row > *'), { y: 22, opacity: 0, stagger: 0.09, duration: 1 }, 0.85)
          .from(q('.hero-def, .hero-hint'), { y: 18, opacity: 0, stagger: 0.12, duration: 1 }, 1.15)
          // The hint has been read by now; the edge belongs to somebody else.
          .to(q('.hero-hint'), { autoAlpha: 0, duration: 0.8 }, 8);
      }
      ScrollTrigger.create({
        trigger: root.current,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self) => {
          scene.current.progress = self.progress;
        },
      });
      gsap
        .timeline({ scrollTrigger: { trigger: root.current, start: 'top top', end: '+=60%', scrub: 0.4, invalidateOnRefresh: true } })
        .fromTo(
          split.masks,
          { x: 0 },
          {
            // Far enough that not a letter is left behind, on any screen.
            x: (i: number, el: Element) => -(el.getBoundingClientRect().right + window.innerWidth * (i === 0 ? 0.06 : 0.2)),
            rotate: (i) => (i === 0 ? -5 : 4),
            ease: 'power2.in',
          },
          0,
        )
        .fromTo(q('.hero-fade'), { y: 0, opacity: 1 }, { y: -60, opacity: 0, stagger: 0.04, ease: 'power1.in', immediateRender: false }, 0);
    },
    { scope: root, dependencies: [poured], revertOnUpdate: true },
  );

  return (
    <section className="hero" id="top" ref={root} data-nav="dark">
      <div className="hero-pin">
        <div className="hero-word" ref={word} aria-hidden="true">
          <div>
            <Wordmark />
          </div>
        </div>
        <canvas className="hero-ink" ref={canvas} aria-hidden="true" />
        {/* The shade comes in with the words; its inner layer leaves with them on scroll. */}
        <div className="hero-shade" aria-hidden="true">
          <i className="hero-fade" />
        </div>
        <div className="hero-copy">
          <h1 className="hero-title">
            Group work,
            <br />
            in full color.
          </h1>
          <div className="hero-fade">
            <p className="hero-sub">ebru shows who really did what, checks it against the rubric, and spreads the load before anyone drowns.</p>
          </div>
          <div className="hero-fade">
            <div className="hero-row">
              <LinkButton href={LINKS.app}>Open the board</LinkButton>
              <LinkButton href={LINKS.kalem} tone="line" icon={<PlayIcon />}>
                Watch Kalem present
              </LinkButton>
            </div>
          </div>
        </div>
        <div className="hero-fade">
          <p className="hero-def">
            <b>ebru</b> is the art of painting with ink on water. Every drop moves the others, and every drop stays visible.
          </p>
          <p className="hero-hint" aria-hidden="true">
            Stir the ink. Click to let a drop fall.
          </p>
        </div>
        <ArmPeek active={poured} />
        <div className="reader" ref={reader} data-on="false" aria-hidden="true">
          <div className="reader-in">
            <i />
            <span>
              <b />
              <small />
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
