import { useGSAP } from '@gsap/react';
import { useEffect, useRef, useState } from 'react';
import { HAND_A, HAND_B, HAND_C, type HandShape } from '../../brand/hands.ts';
import { HEX, MEMBER_INK } from '../../brand/palette.ts';
import { reducedMotion } from '../../ink/quality.ts';
import { useInk } from '../../ink/useInk.ts';
import { report } from '../data.ts';
import { gsap, ScrollTrigger, SplitText } from '../motion.ts';
import { CombEdge } from '../ui/CombEdge.tsx';
import { Hand } from '../ui/Hand.tsx';
import { plop } from '../ui/sound.ts';
import { BEATS, FALLS, HandsScene, ORDER, type HandId } from './handsScene.ts';
import './hands.css';

interface Seat {
  who: HandId;
  shape: HandShape;
  mirror?: boolean;
  turn?: number;
  /** Fingertips, from the centre, in units of the stage's short side. */
  x: number;
  y: number;
  /** Direction the arm comes from. */
  from: [number, number];
}

const SEATS: Seat[] = [
  { who: 'laila', shape: HAND_A, x: -0.36, y: -0.2, from: [-1, -0.62] },
  { who: 'omar', shape: HAND_A, mirror: true, x: 0.36, y: -0.2, from: [1, -0.62] },
  { who: 'karim', shape: HAND_C, mirror: true, x: 0.34, y: 0.2, from: [0.8, 0.8] },
  { who: 'nour', shape: HAND_C, x: -0.34, y: 0.2, from: [-0.8, 0.8] },
  { who: 'youssef', shape: HAND_B, turn: 78, x: 0.02, y: -0.36, from: [0.16, -1] },
];

const EDGE = ['#ffb43a', '#f4ece0', '#2a3df0', '#08080d'];
const byShare = [...report.members].sort((a, b) => b.share - a.share);

export function Hands() {
  const root = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const scene = useInk(canvas, () => new HandsScene());
  const [lit, setLit] = useState<string | null>(null);

  useEffect(() => {
    scene.current.onHover = (who) => setLit(who);
  }, [scene]);

  const focus = (who: string | null) => {
    scene.current.focus = who as HandId | null;
    setLit(who);
  };

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const still = reducedMotion();
      const mm = gsap.matchMedia();
      mm.add({ wide: '(min-width: 861px)', tall: '(max-width: 860px)' }, (context) => {
        const { tall } = context.conditions as { tall: boolean };
        scene.current.aim = tall ? [0, 0.26] : [0.16, 0];
        const words = ['.say-1', '.say-2', '.say-3'].map((sel) => new SplitText(q(sel), { type: 'lines,words,chars', linesClass: 'mask-line', mask: 'lines', charsClass: 'say-char' }));
        if (still) {
          gsap.set(q('.hands-arm, .hands-fall, .say-1'), { autoAlpha: 0 });
          return;
        }
        let heard = -1;
        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: q('.hands-track')[0],
            // The first words come while the section is still arriving, so the screen is never empty.
            start: 'top 60%',
            end: 'bottom bottom',
            scrub: 0.5,
            onUpdate: (self) => {
              scene.current.progress = self.progress;
              // A soft drop each time one lands while scrolling down.
              const n = FALLS.filter((f) => f.at <= self.progress).length;
              if (n > heard && heard >= 0 && self.isActive) plop(0.25 + FALLS[n - 1].r * 2, 0.45);
              heard = n;
            },
          },
        });
        tl.set({}, {}, 1);
        // Hands start close over the empty water and back away as the picture grows.
        const reach = (p: number) => 0.78 + 0.44 * Math.min(1, Math.max(0, (p - 0.1) / (BEATS.lastDrop - 0.1)));

        // Headline one
        tl.fromTo(words[0].chars, { yPercent: 120, rotate: 8 }, { yPercent: 0, rotate: 0, stagger: 0.003, duration: 0.05, ease: 'power3.out' }, 0.0);
        tl.to(words[0].chars, { yPercent: -130, stagger: 0.002, duration: 0.05, ease: 'power2.in' }, 0.4);

        SEATS.forEach((seat, i) => {
          const arm = q(`.hands-arm[data-who="${seat.who}"]`);
          const float = q(`.hands-float[data-who="${seat.who}"]`);
          const at = (k: number) => ({ x: () => `${seat.x * (k - 1) * 100}svmin`, y: () => `${seat.y * (k - 1) * 100}svmin` });
          tl.fromTo(float, at(reach(0)), { ...at(reach(BEATS.lastDrop)), duration: BEATS.lastDrop - 0.1 }, 0.1);
          const drop = q(`.hands-fall[data-who="${seat.who}"]`);
          const far = 1.15;
          tl.fromTo(
            arm,
            { x: () => `${seat.from[0] * far * 100}vmin`, y: () => `${seat.from[1] * far * 100}vmin`, rotate: seat.from[0] * -16 },
            { x: 0, y: 0, rotate: 0, duration: 0.1, ease: 'power3.out' },
            0.015 + i * 0.018,
          );
          FALLS.filter((f) => f.who === seat.who).forEach((f) => {
            const lead = 0.036;
            // Lean in, let go, lean back.
            tl.to(arm, { x: -seat.x * 22, y: -seat.y * 22, duration: lead * 0.7, ease: 'power2.inOut' }, f.at - lead);
            tl.fromTo(drop, { scale: 0, x: 0, y: 0, autoAlpha: 1 }, { scale: 1, duration: lead * 0.45, ease: 'back.out(2)', immediateRender: false }, f.at - lead);
            tl.to(drop, { x: () => `${-seat.x * reach(f.at) * 100}svmin`, y: () => `${-seat.y * reach(f.at) * 100}svmin`, scale: 0.55, duration: lead * 0.6, ease: 'power2.in' }, f.at - lead * 0.55);
            tl.set(drop, { autoAlpha: 0 }, f.at + 0.004);
            tl.to(arm, { x: 0, y: 0, duration: lead, ease: 'power2.out' }, f.at + 0.002);
          });
          // Five pulls at once, then everybody leaves.
          tl.to(arm, { x: seat.x * -70, y: seat.y * -70, duration: 0.07, ease: 'power2.inOut' }, BEATS.pull[0] - 0.03);
          tl.to(arm, { x: () => `${seat.from[0] * far * 100}vmin`, y: () => `${seat.from[1] * far * 100}vmin`, rotate: seat.from[0] * 20, duration: 0.13, ease: 'power2.in' }, BEATS.pull[0] + 0.07);
        });

        const late = tall ? 0.09 : 0;
        tl.fromTo(words[1].chars, { yPercent: 120, rotate: 8 }, { yPercent: 0, rotate: 0, stagger: 0.003, duration: 0.06, ease: 'power3.out' }, 0.72 + late);
        tl.fromTo(words[2].chars, { yPercent: 120, rotate: 6 }, { yPercent: 0, rotate: 0, stagger: 0.002, duration: 0.06, ease: 'power3.out' }, 0.78 + late * 0.8);
        tl.fromTo(q('.share'), { x: -30, autoAlpha: 0 }, { x: 0, autoAlpha: 1, stagger: 0.012, duration: 0.05, ease: 'power2.out' }, 0.83 + late * 0.6);
        tl.fromTo(q('.hands-note'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.04 }, 0.9 + late * 0.4);
      });
      ScrollTrigger.refresh();
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section className="hands" ref={root} data-nav="dark">
      <CombEdge from="#ff9ec2" bands={EDGE} />
      <div className="hands-track">
      <div className="hands-pin">
        <p className="say say-1 display" aria-hidden="true">
          Many hands.
        </p>
        <canvas className="hands-ink" ref={canvas} aria-hidden="true" />
        <div className="hands-stage" aria-hidden="true">
          {SEATS.map((seat) => (
            <div key={seat.who} className="hands-seat" style={{ left: `calc(50% + ${seat.x * 100}svmin)`, top: `calc(50% + ${seat.y * 100}svmin)` }}>
              <div className="hands-float" data-who={seat.who}>
                <i className="hands-fall" data-who={seat.who} style={{ background: HEX[MEMBER_INK[seat.who]] }} />
                <div className="hands-arm" data-who={seat.who}>
                  <Hand shape={seat.shape} ink={MEMBER_INK[seat.who]} mirror={seat.mirror} turn={seat.turn} />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="hands-result">
          <h2 className="display">
            <span className="sr-only">Many hands. </span>
            <span className="say say-2">One picture.</span>
            <span className="say say-3">Every drop still visible.</span>
          </h2>
          <ul className="shares" onPointerLeave={() => focus(null)}>
            {byShare.map((m) => (
              <li key={m.member.id}>
                <button
                  type="button"
                  className="share"
                  data-lit={lit === null ? 'all' : lit === m.member.id}
                  onPointerEnter={() => focus(m.member.id)}
                  onFocus={() => focus(m.member.id)}
                  onBlur={() => focus(null)}
                >
                  <i style={{ background: HEX[MEMBER_INK[m.member.id]] }} />
                  <b>{m.member.first}</b>
                  <span>{Math.round(m.share * 100)}%</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="hands-note">The picture is the data. The wider the ring, the more proven work behind it. Team Atlas is a fictional team.</p>
        </div>
      </div>
      </div>
      <p className="sr-only">
        Five people each let drops of their own ink fall into the same water. The finished flower shows {byShare.map((m) => `${m.member.first} ${Math.round(m.share * 100)} percent`).join(', ')} of the proven work, in the order{' '}
        {ORDER.join(', ')}.
      </p>
    </section>
  );
}
