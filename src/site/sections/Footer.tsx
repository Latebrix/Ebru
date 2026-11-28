import { useGSAP } from '@gsap/react';
import { useEffect, useMemo, useRef } from 'react';
import { EBRU_BOX, EBRU_PATH } from '../../brand/wordmark.ts';
import { reducedMotion } from '../../ink/quality.ts';
import { useInk } from '../../ink/useInk.ts';
import { gsap, revealCopy, revealTitle, scrollTo } from '../motion.ts';
import { LinkButton } from '../ui/Button.tsx';
import { CombEdge } from '../ui/CombEdge.tsx';
import { plop } from '../ui/sound.ts';
import { FooterScene } from './footerScene.ts';
import './footer.css';
import { LINKS } from '../../links.ts';

const EDGE = ['#ffb43a', '#f4ece0', '#ff9ec2', '#08080d'];

/**
 * Our sponsor, credited once, centred under the wordmark: the name and the logo, nothing more. The logo's dark
 * lettering is drawn light here (the icon keeps its colours), as BrowserStack's own logo for dark backgrounds does.
 */
function Sponsor() {
  return (
    <aside className="sponsor" aria-label="Sponsor">
      <p className="sponsor-by">Testing is sponsored by</p>
      <a className="sponsor-logo" href="https://www.browserstack.com" target="_blank" rel="sponsored noopener noreferrer" aria-label="BrowserStack">
        <img className="sponsor-icon" src="./ebru/sponsor-browserstack.webp" alt="" width="640" height="146" loading="lazy" decoding="async" />
        <img className="sponsor-name" src="./ebru/sponsor-browserstack.webp" alt="" width="640" height="146" loading="lazy" decoding="async" />
      </a>
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
      gsap.from(q('.sponsor > *'), { y: 16, opacity: 0, duration: 0.8, stagger: 0.1, ease: 'power2.out', scrollTrigger: { trigger: q('.sponsor')[0], start: 'top 92%', once: true } });
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
          <LinkButton href={`${LINKS.site}request-access`} tone="line">
            Ask to try ebru
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
