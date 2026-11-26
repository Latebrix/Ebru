import { useGSAP } from '@gsap/react';
import { useEffect, useRef, useState } from 'react';
import { reducedMotion } from '../../ink/quality.ts';
import { gsap, revealCopy, revealTitle, scroll } from '../motion.ts';
import { CombEdge } from '../ui/CombEdge.tsx';
import { plop } from '../ui/sound.ts';
import './fullset.css';

interface Print {
  id: string;
  name: string;
  line: string;
  board: string;
  sees: string;
  does: string;
}

const PRINTS: Print[] = [
  {
    id: 'octopus',
    name: 'The Soloist',
    line: 'One color, everywhere. Says it’s fine.',
    board: 'Everything on time.',
    sees: 'One ink in most of the picture.',
    does: 'Offers two of their tasks to teammates with free hours.',
  },
  {
    id: 'jellyfish',
    name: 'The Ghost',
    line: 'One drop at kickoff. Nothing since.',
    board: 'In progress.',
    sees: 'No new drops since the first week.',
    does: 'Asks privately first. The team decides what happens next.',
  },
  {
    id: 'unfinished',
    name: 'The Almost-done',
    line: 'Ninety percent finished. Has been since Sunday.',
    board: 'Done, done, nearly done.',
    sees: 'Claims with nothing behind them.',
    does: 'Keeps the points open until the file is there.',
  },
  {
    id: 'puffer',
    name: 'The Last-minute',
    line: 'Two weeks of calm water, then everything at once.',
    board: 'Due Thursday.',
    sees: 'Thursday, on Monday.',
    does: 'Spreads the work before it spills.',
  },
];

const EDGE = ['#2a3df0', '#f4ece0', '#ff5a3c', '#ff9ec2'];

/** A print on a peg: a damped pendulum pushed by the scroll and by the pointer. */
class Sway {
  angle = 0;
  speed = 0;
  readonly stiff: number;
  readonly el: HTMLElement;

  constructor(el: HTMLElement, i: number) {
    this.el = el;
    this.stiff = 26 + i * 3;
  }

  step(dt: number, push: number) {
    this.speed += (-this.stiff * this.angle - 2.1 * this.speed + push) * dt;
    this.angle += this.speed * dt;
    this.el.style.setProperty('--sway', `${this.angle.toFixed(3)}deg`);
  }
}

function Card({ print, index }: { print: Print; index: number }) {
  const [flipped, setFlipped] = useState(false);
  const [missing, setMissing] = useState(false);
  return (
    <figure className="print" style={{ '--i': index } as React.CSSProperties}>
      <div className="print-hang" data-sway>
        <svg className="peg" viewBox="0 0 22 46" aria-hidden="true">
          <rect x="3" y="0" width="16" height="46" rx="5" />
          <rect className="peg-wire" x="0" y="16" width="22" height="4" rx="2" />
        </svg>
        <button
          type="button"
          className="print-flip"
          data-flipped={flipped}
          aria-pressed={flipped}
          aria-label={`${print.name}. ${flipped ? 'Show the front' : 'Turn over to see what ebru does'}`}
          onClick={() => {
            setFlipped(!flipped);
            plop(flipped ? 0.3 : 0.6, 0.7);
          }}
        >
          <span className="print-face print-front">
            {missing ? <span className="print-blank" /> : <img src={`./ebru/${print.id}.webp`} alt="" loading="lazy" decoding="async" draggable={false} onError={() => setMissing(true)} />}
          </span>
          <span className="print-face print-back">
            <span>
              <i>The board says</i>
              <b>{print.board}</b>
            </span>
            <span>
              <i>ebru sees</i>
              <b>{print.sees}</b>
            </span>
            <span>
              <i>ebru does</i>
              <b>{print.does}</b>
            </span>
          </span>
        </button>
      </div>
      <figcaption>
        <h3>{print.name}</h3>
        <p>{print.line}</p>
      </figcaption>
    </figure>
  );
}

export function FullSet() {
  const root = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const rope = useRef<SVGPathElement>(null);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const pin = q('.set-pin')[0];
      revealTitle(q('.set-title')[0], pin, 'top 55%');
      revealCopy(q('.set-intro p'), pin, 'top 45%');
      const mm = gsap.matchMedia();
      mm.add('(min-width: 861px)', () => {
        const travel = () => Math.max(0, track.current!.scrollWidth - window.innerWidth);
        gsap.to(track.current, {
          x: () => -travel(),
          ease: 'none',
          scrollTrigger: {
            trigger: pin,
            start: 'top top',
            end: () => `+=${travel()}`,
            pin,
            scrub: 0.6,
            invalidateOnRefresh: true,
            anticipatePin: 1,
          },
        });
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  // Rope and pendulums
  useEffect(() => {
    const el = root.current!;
    const path = rope.current!;
    const svg = path.ownerSVGElement!;
    const drawRope = (sag: number) => {
      const w = svg.clientWidth;
      const h = svg.clientHeight;
      const n = 5;
      let d = `M0 ${h * 0.22}`;
      for (let i = 0; i < n; i += 1) {
        const x0 = (i / n) * w;
        const x1 = ((i + 1) / n) * w;
        const dip = h * 0.34 + sag * (i % 2 ? 1 : -1);
        d += `Q${(x0 + x1) / 2} ${h * 0.22 + dip} ${x1} ${h * 0.22}`;
      }
      path.setAttribute('d', d);
    };
    drawRope(0);
    if (reducedMotion()) return;
    const sways = [...el.querySelectorAll<HTMLElement>('[data-sway]')].map((s, i) => new Sway(s, i));
    const onEnter = (event: PointerEvent) => {
      const i = sways.findIndex((s) => s.el === event.currentTarget);
      if (i >= 0) sways[i].speed += (event.movementX || 6) * 1.6;
    };
    sways.forEach((s) => s.el.addEventListener('pointerenter', onEnter));
    let visible = false;
    let bounce = 0;
    let bounceSpeed = 0;
    const seen = new IntersectionObserver((entries) => {
      visible = entries[entries.length - 1].isIntersecting;
    });
    seen.observe(el);

    const tick = (time: number, deltaMs: number) => {
      if (!visible) return;
      const dt = Math.min(0.033, deltaMs / 1000);
      const push = -scroll.velocity * 92;
      sways.forEach((s, i) => s.step(dt, push + Math.sin(time * 0.9 + i * 1.7) * 2.4));
      bounceSpeed += (-60 * bounce - 5 * bounceSpeed + scroll.velocity * 130) * dt;
      bounce += bounceSpeed * dt;
      drawRope(bounce);
    };
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      seen.disconnect();
      sways.forEach((s) => s.el.removeEventListener('pointerenter', onEnter));
    };
  }, []);

  return (
    <section className="set" ref={root} data-nav="light">
      <CombEdge from="#f4ece0" bands={EDGE} />
      <div className="set-pin">
        <div className="set-track" ref={track}>
          <svg className="rope" aria-hidden="true">
            <path ref={rope} />
          </svg>
          <div className="set-intro">
            <h2 className="display h-xl set-title">You’ve met the full set.</h2>
            <p className="lead">Every group project hangs these four on the wall. Turn one over to see what an ordinary board misses.</p>
          </div>
          {PRINTS.map((print, i) => (
            <Card key={print.id} print={print} index={i} />
          ))}
          <div className="set-end">
            <p className="display h-lg">Nobody meant it.</p>
            <p className="lead">They just could not see each other’s load. In 23 student teams, the wider the gap between reported and recorded work, the lower the result (Berrezueta-Guzman et al., 2025).</p>
            <p className="cite">Berrezueta-Guzman, S., Parmacli, I., Habib, M. K., Krusche, S., &amp; Wagner, S. (2025). Assessing teamwork dynamics in software development projects. In 2025 IEEE EDUCON (pp. 1–5). https://doi.org/10.1109/EDUCON62633.2025.11016305</p>
          </div>
        </div>
      </div>
    </section>
  );
}
