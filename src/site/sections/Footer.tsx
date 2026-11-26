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
