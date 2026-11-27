import { useGSAP } from '@gsap/react';
import { useEffect, useMemo, useRef } from 'react';
import { EBRU_BOX, EBRU_PATH } from '../../brand/wordmark.ts';
import { reducedMotion } from '../../ink/quality.ts';
import { useInk } from '../../ink/useInk.ts';
import { gsap, revealCopy, revealTitle, scrollTo } from '../motion.ts';
import { LinkButton, PlayIcon } from '../ui/Button.tsx';
import { CombEdge } from '../ui/CombEdge.tsx';
import { plop } from '../ui/sound.ts';
import { FooterScene } from './footerScene.ts';
import './footer.css';
import { LINKS } from '../../links.ts';

const EDGE = ['#ffb43a', '#f4ece0', '#ff9ec2', '#08080d'];

/** Our sponsor on a perforated stamp, as in the deck, in the words BrowserStack agreed to. The site names it only; amounts stay in the deck. */
function Sponsor() {
  return (
    <aside className="sponsor" aria-label="Our sponsor">
      <div className="sponsor-paper">
        <div className="sponsor-who">
          <p className="sponsor-by">Sponsored by</p>
          <a href="https://www.browserstack.com" target="_blank" rel="sponsored noopener noreferrer">
            <img src="./ebru/sponsor-browserstack.webp" alt="BrowserStack" width="640" height="146" loading="lazy" decoding="async" />
          </a>
        </div>
        <p className="sponsor-line">This project is tested with BrowserStack. BrowserStack sponsors the testing infrastructure for this project.</p>
      </div>
    </aside>
  );
}

export function Footer() {
  const root = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const scene = useInk(canvas, () => new FooterScene());
  const mask = useMemo(() => {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${EBRU_BOX.w} ${EBRU_BOX.h}'><path fill-rule='evenodd' d='${EBRU_PATH}'/></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }, []);

  useEffect(() => {
    scene.current.onDrop = () => plop(0.5);
  }, [scene]);

  useGSAP(
    () => {
      if (reducedMotion()) return;
      const q = gsap.utils.selector(root);
      revealTitle(q('.footer-title')[0], q('.footer-top')[0], 'top 70%');
      revealCopy(q('.footer-row'), q('.footer-top')[0], 'top 66%', 0.3);
      gsap.fromTo(q('.footer-word'), { yPercent: 26, scale: 0.94 }, { yPercent: 0, scale: 1, ease: 'none', scrollTrigger: { trigger: q('.footer-word'), start: 'top bottom', end: 'bottom bottom', scrub: 0.5 } });
      // The stamp is pressed down once, the first time it comes into view.
      gsap.from(q('.sponsor-paper'), { y: -70, rotate: -7, opacity: 0, duration: 0.9, ease: 'back.out(1.7)', scrollTrigger: { trigger: q('.sponsor')[0], start: 'top 88%', once: true } });
    },
    { scope: root },
  );

  return (
    <footer className="footer" ref={root} data-nav="dark">
      <CombEdge from="#2a3df0" bands={EDGE} />
      <div className="footer-top">
        <h2 className="display footer-title">Share the work, not the stress.</h2>
        <div className="footer-row">
          <LinkButton href={LINKS.app}>Open the board</LinkButton>
          <LinkButton href={LINKS.kalem} tone="line" icon={<PlayIcon />}>
            Watch Kalem present
          </LinkButton>
        </div>
      </div>
      <div className="footer-word" style={{ aspectRatio: `${EBRU_BOX.w} / ${EBRU_BOX.h}` }}>
        <canvas ref={canvas} style={{ maskImage: mask, WebkitMaskImage: mask }} aria-hidden="true" />
        <span className="sr-only">ebru</span>
      </div>
      <Sponsor />
      <div className="footer-end">
        <p>
          ebru is an AI-powered, multi-platform board for teamwork and workload evaluation. Built for the Technical English midterm, Foundation Year Engineering, NOVA University Lisbon and The Knowledge Hub.
        </p>
        <p>Team Atlas, its tasks and its scores are fictional sample data.</p>
        <a
          href="#top"
          onClick={(event) => {
            event.preventDefault();
            scrollTo('#top', { duration: 2.4 });
          }}
        >
          Back to the top
        </a>
      </div>
    </footer>
  );
}
