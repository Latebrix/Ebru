import { useGSAP } from '@gsap/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { lightDevice } from '../../ink/device.ts';
import { whenIdle } from '../../ink/idle.ts';
import { pixelRatio, reducedMotion, reportFrame, skipFrame, softwareDrawing } from '../../ink/quality.ts';
import type { Squid } from '../../kalem/Squid.ts';
import { useInk } from '../../ink/useInk.ts';
import { gsap, revealCopy, revealTitle } from '../motion.ts';
import { LinkButton, PlayIcon } from '../ui/Button.tsx';
import { CombEdge } from '../ui/CombEdge.tsx';
import { plop, setSound, settle } from '../ui/sound.ts';
import { BathScene } from './kalemBath.ts';
import { KalemVoice, loadLine, sentences, type Line } from './kalemVoice.ts';
import './kalem.css';
import { LINKS } from '../../links.ts';

const QUESTIONS = [
  { id: 'who', label: 'Who are you?' },
  { id: 'judge', label: 'Do you judge people?' },
  { id: 'fair', label: 'So what is fair?' },
] as const;

const EDGE = ['#ff9ec2', '#f4ece0', '#0f9d8f', '#08080d'];

export function Kalem() {
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const bath = useRef<HTMLCanvasElement>(null);
  const water = useRef<HTMLCanvasElement>(null);
  const caption = useRef<HTMLParagraphElement>(null);
  const bathScene = useInk(bath, () => new BathScene());
  const voice = useMemo(() => new KalemVoice(), []);
  const squid = useRef<Squid | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const [line, setLine] = useState<Line | null>(null);
  const [part, setPart] = useState(0);
  const [failed, setFailed] = useState(false);
  const parts = useMemo(() => (line ? sentences(line) : []), [line]);
  const speaking = useRef(false);
  speaking.current = playing !== null;

  useEffect(() => {
    voice.onEnd = () => {
      setPlaying(null);
      const s = squid.current;
      if (!s) return;
      // Thank you for asking.
      s.mood = 'glad';
      s.wave(-1);
      window.setTimeout(() => {
        s.wave(-1, false);
        s.mood = 'calm';
      }, 1900);
    };
    return () => voice.dispose();
  }, [voice]);

  // Kalem: hidden in the bath until somebody comes, then curious, then talkative.
  useEffect(() => {
    const el = stage.current!;
    const canvas = water.current!;
    const still = reducedMotion();
    const pointer = { x: 0, y: 0, inside: false };
    const view = { w: 1, h: 1, left: 0, width: 1, bath: 0 };
    let s: Squid | null = null;
    let gone = false;
    let visible = false;
    let placed = false;
    let t = 0;
    /** Seconds since it noticed somebody; negative while it has not. */
    let met = -1;
    let hiding = 0;

    const measure = () => {
      view.w = el.clientWidth;
      view.h = el.clientHeight;
      view.left = canvas.offsetLeft;
      view.width = canvas.clientWidth;
      view.bath = bath.current!.clientHeight;
    };
    const sizes = new ResizeObserver(measure);
    sizes.observe(el);

    const move = (event: PointerEvent) => {
      const box = el.getBoundingClientRect();
      pointer.x = event.clientX - box.left;
      pointer.y = event.clientY - box.top;
      pointer.inside = event.pointerType !== 'touch';
    };
    const leave = () => {
      pointer.inside = false;
    };
    const down = (event: PointerEvent) => {
      if (!s || (event.target as HTMLElement).closest('button, a')) return;
      const box = el.getBoundingClientRect();
      const x = event.clientX - box.left;
      const y = event.clientY - box.top;
      if (s.hit(x, y)) {
        s.startle(x, y);
        hiding = 2.8;
        plop(0.95);
        plop(0.6, 0.7);
      }
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    el.addEventListener('pointerdown', down);

    const seen = new IntersectionObserver((entries) => {
      visible = entries[entries.length - 1].isIntersecting;
    });
    seen.observe(el);
    // Built while the page is idle, so it is ready long before anybody scrolls this far.
    let asked = false;
    let close = false;
    const fetch = () => {
      if (asked || gone) return;
      asked = true;
      import('../../kalem/Squid.ts')
        .then(({ Squid: Animal }) => {
          if (gone) return;
          s = new Animal(canvas, 1.4);
          s.urgent = close;
          squid.current = s;
        })
        .catch(() => {
          el.dataset.inkFailed = '';
        });
    };
    // First in the queue: it is the one everybody comes to see.
    const forget = lightDevice() ? () => undefined : whenIdle(fetch, true);
    const near = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        near.disconnect();
        close = true;
        fetch();
        if (s) s.urgent = true;
      },
      { rootMargin: '160% 0px' },
    );
    near.observe(el);
    const meet = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          meet.disconnect();
          met = 0;
          settle();
        }
      },
      { threshold: 0.2 },
    );
    meet.observe(el);

    const tick = (_time: number, deltaMs: number) => {
      if (!visible || !s?.awake || skipFrame()) return;
      const dt = still ? 0.016 : Math.min(0.033, (deltaMs / 1000) * (softwareDrawing() ? 2 : 1));
      const { w, h } = view;
      const narrow = w < 861;
      s.stage(w, h);
      s.scale = narrow ? Math.min(0.66, w / 620) : Math.min(1.65, Math.max(0.85, Math.min(w / 1080, h / 800)));
      const home = narrow ? { x: w * 0.57, y: Math.min(h * 0.25, 320) } : { x: w * 0.72, y: h * 0.45 };
      // The level of the bath, roughly: what is below it is out of sight.
      const surface = h - view.bath * 0.52;
      if (!placed) {
        s.place(home.x, still ? home.y : h + 520 * s.scale);
        s.lookX = home.x;
        s.lookY = home.y;
        placed = true;
        if (still) for (let i = 0; i < 160; i += 1) s.update(1 / 60, i / 60);
      }
      if (!still) t += dt;
      const loud = voice.loudness(dt);
      s.voice = loud;
      bathScene.current.voice = loud;

      if (met >= 0 && !still) {
        met += dt;
        hiding = Math.max(0, hiding - dt);
        if (met < 0.6) {
          // Two long arms feel their way out of the ink first.
          s.tx = home.x - 60 * s.scale;
          s.ty = surface + 400 * s.scale;
          s.urge = 0.9;
          s.reachTo(3, -1, home.x - 170 * s.scale, surface - (46 + 46 * Math.sin(t * 3)) * s.scale, 60, -1);
          s.reachTo(3, 1, home.x + 120 * s.scale, surface - (76 + 40 * Math.sin(t * 3 + 1.6)) * s.scale, 60, 1);
        } else if (met < 1.35) {
          // Then the hood and one eye, and a careful look left and right.
          s.tx = home.x;
          s.ty = surface - 6 * s.scale;
          s.urge = 0.9;
          s.mood = 'curious';
          s.lookX = home.x + (met < 1 ? -1 : 1) * 600;
          s.lookY = surface - 30;
        } else {
          if (met - dt < 1.35) {
            s.release(3);
            s.jet(0, -0.9, 1);
            s.puff(9, 0.8);
            plop(0.7, 0.7);
          }
          const wander = speaking.current ? 0.35 : 1;
          s.urge = hiding > 0 ? 1.8 : 1;
          s.tx = home.x + Math.sin(t * 0.31) * w * 0.028 * wander;
          s.ty = home.y + Math.sin(t * 0.47 + 1) * h * 0.028 * wander;
          s.blush = hiding > 0 && hiding < 2.2 ? 1 : 0;
          if (hiding > 1.2) {
            s.tx = home.x + w * 0.12;
            s.ty = home.y - h * 0.14;
          } else if (hiding > 0) {
            s.mood = 'shy';
          } else {
            if (s.mood === 'shy' || s.mood === 'surprised') s.mood = 'calm';
            if (speaking.current) {
              s.mood = 'calm';
              s.lookX = w * 0.12;
              s.lookY = h * 0.56;
              s.lean = Math.sin(t * 0.9) * 0.05;
            } else if (pointer.inside) {
              const dx = pointer.x - home.x;
              const dy = pointer.y - home.y;
              const d = Math.hypot(dx, dy) || 1;
              const lean = Math.min(d * 0.16, w * 0.06);
              s.tx += (dx / d) * lean;
              s.ty += (dy / d) * lean * 0.7;
              s.lookX = pointer.x;
              s.lookY = pointer.y;
              s.lean = Math.max(-0.14, Math.min(0.14, dx / (w * 2.4)));
              if (s.mood !== 'glad') s.mood = d < 260 * s.scale ? 'curious' : 'calm';
              // Curious enough to reach out with one arm
              const side = dx > 0 ? 1 : -1;
              if (d < 340 * s.scale && d > 80 * s.scale && dy > -120 * s.scale) {
                s.reachTo(2, side, pointer.x - (dx / d) * 18, pointer.y - (dy / d) * 18, 60);
                s.release(2, -side as -1 | 1);
              } else {
                s.release(2);
              }
            } else {
              s.release(2);
              s.lean = 0;
              s.lookX = home.x + Math.sin(t * 0.4) * 400 - 160;
              s.lookY = home.y + Math.sin(t * 0.33 + 2) * 160;
              if (s.mood !== 'glad') s.mood = 'calm';
            }
          }
        }
      }
      if (!still) s.update(dt, t);
      s.render(view.left, 0, view.width, h, softwareDrawing() || lightDevice() ? pixelRatio() : Math.min(1.75, Math.max(1, window.devicePixelRatio || 1)));
      reportFrame(deltaMs / 1000);
    };
    gsap.ticker.add(tick);
    return () => {
      gone = true;
      forget();
      gsap.ticker.remove(tick);
      sizes.disconnect();
      near.disconnect();
      seen.disconnect();
      meet.disconnect();
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
      el.removeEventListener('pointerdown', down);
      s?.dispose();
      squid.current = null;
    };
  }, [bathScene, voice]);

  const ask = useCallback(
    async (id: string) => {
      if (playing === id) {
        voice.stop();
        setPlaying(null);
        return;
      }
      setFailed(false);
      setPlaying(id);
      try {
        const next = await loadLine(id);
        setPart(0);
        setLine(next);
        setSound(true);
        await voice.play(next);
      } catch {
        setPlaying(null);
        setFailed(true);
      }
    },
    [playing, voice],
  );

  // Captions follow the recorded word times.
  useEffect(() => {
    if (!line || parts.length === 0) return;
    const tick = () => {
      if (!voice.line) return;
      const t = voice.time;
      let i = 0;
      while (i + 1 < parts.length && t >= line.words[parts[i + 1].from][1] - 0.12) i += 1;
      setPart(i);
      caption.current?.querySelectorAll<HTMLElement>('span').forEach((el) => {
        el.dataset.on = String(t >= Number(el.dataset.t) - 0.04);
      });
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [line, parts, voice]);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      revealTitle(q('.kalem-title')[0], stage.current, 'top 55%');
      revealCopy(q('.kalem-copy > .lead, .asks li, .kalem-cta'), stage.current, 'top 45%');
    },
    { scope: root },
  );

  const now = parts[Math.min(part, parts.length - 1)];

  return (
    <section className="kalem" id="kalem" ref={root} data-nav="dark">
      <CombEdge from="#ffb43a" bands={EDGE} />
      <div className="kalem-stage" ref={stage}>
      <canvas className="kalem-water" ref={water} aria-hidden="true" />
      <canvas className="kalem-bath" ref={bath} aria-hidden="true" />
      <div className="kalem-in">
        <div className="kalem-copy">
          <h2 className="display h-xl kalem-title">Something lives in the ink.</h2>
          <p className="lead">Meet Kalem. The word means pen, and it once gave the squid its other name: calamari, the one who carries ink. Ten arms, two for each teammate. Ask it something.</p>
          <ul className="asks">
            {QUESTIONS.map((question) => (
              <li key={question.id}>
                <button type="button" className="ask" aria-pressed={playing === question.id} onClick={() => void ask(question.id)}>
                  <span className="ask-icon" aria-hidden="true">
                    {playing === question.id ? (
                      <svg width="12" height="12" viewBox="0 0 12 12">
                        <rect x="1" y="1" width="10" height="10" rx="2" fill="currentColor" />
                      </svg>
                    ) : (
                      <PlayIcon />
                    )}
                  </span>
                  {question.label}
                </button>
              </li>
            ))}
          </ul>
          <div className="kalem-cta">
            <LinkButton href={LINKS.kalem} icon={<PlayIcon />}>
              Watch Kalem present everything
            </LinkButton>
          </div>
        </div>
      </div>
      <div className="kalem-caption" data-on={playing !== null} aria-live="polite">
        {line && now && (
          <p ref={caption} key={`${line.id}-${part}`}>
            {line.words.slice(now.from, now.to + 1).map(([word, from], i) => (
              <span key={`${from}-${i}`} data-t={from}>
                {word}{' '}
              </span>
            ))}
          </p>
        )}
      </div>
      {failed && (
        <p className="kalem-error" role="alert">
          The recording could not be played. Check the sound output and ask again.
        </p>
      )}
      </div>
    </section>
  );
}
