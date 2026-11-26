import { useGSAP } from '@gsap/react';
import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { HAND_C } from '../../brand/hands.ts';
import { HEX, MEMBER_INK } from '../../brand/palette.ts';
import { tasks, team } from '../../data/atlas.ts';
import { contributionReport, EVIDENCE_WEIGHT, proveTask, round1, type ContributionLine } from '../../engine/fairproof.ts';
import type { Evidence, Task } from '../../engine/types.ts';
import { pixelRatio, reducedMotion } from '../../ink/quality.ts';
import { shortTitle } from '../data.ts';
import { gsap, revealCopy, revealTitle } from '../motion.ts';
import { CombEdge } from '../ui/CombEdge.tsx';
import { Hand } from '../ui/Hand.tsx';
import { plop } from '../ui/sound.ts';
import { barInk, ProofInk, type BarTarget, type LensTarget } from './proofInk.ts';
import './proof.css';

const SAMPLE = 'ATL-12';
const EDGE = ['#ff5a3c', '#ff9ec2', '#0f9d8f', '#f4ece0'];
const sample = tasks.find((t) => t.id === SAMPLE)!;

type Delivery = 'open' | 'reviewed' | 'accepted';
const DELIVERY: { id: Delivery; label: string }[] = [
  { id: 'open', label: 'Handed in' },
  { id: 'reviewed', label: 'Reviewed' },
  { id: 'accepted', label: 'Accepted' },
];

const base = contributionReport(team, tasks);
const order = [...base.members].sort((a, b) => b.claimed - a.claimed).map((m) => m.member.id);
const longest = Math.max(...base.members.map((m) => m.claimed));

const KIND: Record<string, string> = {
  pull: 'Pull request',
  commit: 'Commits',
  test: 'Tests',
};

interface Reading {
  bar: number;
  line: ContributionLine;
  x: number;
}

/** A number that rolls to its new value. */
function Roll({ value, digits = 1 }: { value: number; digits?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef({ v: value });
  useEffect(() => {
    const tween = gsap.to(shown.current, {
      v: value,
      duration: reducedMotion() ? 0 : 0.9,
      ease: 'power3.out',
      onUpdate: () => {
        if (ref.current) ref.current.textContent = shown.current.v.toFixed(digits);
      },
    });
    return () => {
      tween.kill();
    };
  }, [value, digits]);
  return <span ref={ref}>{value.toFixed(digits)}</span>;
}

export function Proof() {
  const root = useRef<HTMLElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const lensEl = useRef<HTMLDivElement>(null);
  const lensCanvas = useRef<HTMLCanvasElement>(null);
  const bars = useRef<(HTMLCanvasElement | null)[]>([]);
  const [off, setOff] = useState<string[]>([]);
  const [delivery, setDelivery] = useState<Delivery>('accepted');
  const [reading, setReading] = useState<Reading | null>(null);
  const readingRef = useRef<Reading | null>(null);
  readingRef.current = reading;

  const edited: Task = useMemo(
    () => ({
      ...sample,
      evidence: sample.evidence.filter((e) => !off.includes(e.id)),
      execution: delivery === 'accepted' ? { reviewedBy: 'omar', accepted: true } : delivery === 'reviewed' ? { reviewedBy: 'omar' } : {},
    }),
    [off, delivery],
  );
  const proof = useMemo(() => proveTask(edited), [edited]);
  const live = useMemo(() => contributionReport(team, tasks.map((t) => (t.id === SAMPLE ? edited : t))), [edited]);
  const rows = order.map((id) => live.members.find((m) => m.member.id === id)!);
  const owner = sample.assignees[0].member;

  const goals = useRef<number[]>([]);
  goals.current = rows.map((m) => m.vcs / longest);

  // One ink context paints all five bars and the lens.
  useEffect(() => {
    const el = root.current!;
    const still = reducedMotion();
    let ink: ProofInk | null = null;
    let visible = false;
    let begun = still;
    let clock = 0;
    const fills = order.map(() => 0);
    const speeds = order.map(() => 0);
    const motion = order.map(() => 0);
    const starts = order.map((_, i) => 0.35 + i * 0.13);
    const targets: BarTarget[] = order.map((member, i) => ({ member, canvas: bars.current[i]!, fill: 0, state: barInk(member, i) }));

    const near = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        near.disconnect();
        try {
          ink = new ProofInk();
        } catch {
          el.dataset.inkFailed = '';
        }
      },
      { rootMargin: '60% 0px' },
    );
    near.observe(list.current!);
    const seen = new IntersectionObserver((entries) => {
      const e = entries[entries.length - 1];
      visible = e.isIntersecting;
    });
    seen.observe(list.current!);
    const enter = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          begun = true;
          el.dataset.poured = '';
        }
      },
      { rootMargin: '0px 0px -28% 0px' },
    );
    enter.observe(list.current!);

    const tick = (time: number, deltaMs: number) => {
      if (!visible || !ink) return;
      const dt = Math.min(0.04, deltaMs / 1000);
      if (begun) clock += dt;
      fills.forEach((_, i) => {
        const goal = begun && clock > starts[i] ? goals.current[i] : 0;
        if (still) {
          fills[i] = goal;
        } else {
          // A heavy liquid: a soft spring with a little overshoot.
          const a = 34 * (goal - fills[i]) - 9.4 * speeds[i];
          speeds[i] += a * dt;
          fills[i] = Math.max(0, fills[i] + speeds[i] * dt);
          motion[i] += (Math.min(1, Math.abs(speeds[i]) * 1.5) - motion[i]) * Math.min(1, dt * 9);
        }
        targets[i].fill = fills[i];
      });
      const r = readingRef.current;
      let lens: LensTarget | null = null;
      if (r && lensCanvas.current) {
        const c = targets[r.bar].canvas;
        lens = { canvas: lensCanvas.current, bar: r.bar, x: (r.x * c.clientWidth - c.clientWidth / 2) / c.clientHeight, y: 0 };
      }
      ink.draw(targets, lens, Math.min(pixelRatio(), 1.5), still ? 1 : time, motion);
    };
    gsap.ticker.add(tick);
    return () => {
      near.disconnect();
      seen.disconnect();
      enter.disconnect();
      gsap.ticker.remove(tick);
      ink?.dispose();
    };
  }, []);

  useGSAP(
    () => {
      if (reducedMotion()) return;
      const q = gsap.utils.selector(root);
      revealTitle(q('.proof-title')[0], q('.proof-head')[0]);
      revealCopy(q('.proof-head .lead'), q('.proof-head')[0]);
      gsap.from(q('.proof-card'), { y: 70, rotate: -2.5, opacity: 0, duration: 1.2, scrollTrigger: { trigger: q('.proof-card'), start: 'top 88%' } });
      gsap.from(q('.bar-row'), { opacity: 0, y: 24, stagger: 0.08, duration: 0.9, scrollTrigger: { trigger: list.current, start: 'top 80%' } });
    },
    { scope: root },
  );

  // The magnifier follows the pointer over a bar and reads the piece underneath.
  const move = useRef<{ x: (v: number) => void; y: (v: number) => void } | null>(null);
  useEffect(() => {
    move.current = {
      x: gsap.quickTo(lensEl.current, 'x', { duration: 0.5, ease: 'power3.out' }),
      y: gsap.quickTo(lensEl.current, 'y', { duration: 0.5, ease: 'power3.out' }),
    };
  }, []);

  const read = (index: number) => (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch') return;
    const box = event.currentTarget.getBoundingClientRect();
    const host = root.current!.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width;
    move.current?.x(event.clientX - host.left);
    move.current?.y(event.clientY - host.top);
    const line = lineAt(rows[index].lines, x * longest);
    if (!line) {
      setReading(null);
      return;
    }
    setReading({ bar: index, line, x });
  };

  const toggle = (e: Evidence) => {
    const removing = !off.includes(e.id);
    setOff(removing ? [...off, e.id] : off.filter((id) => id !== e.id));
    plop(removing ? 0.8 : 0.3, 0.8);
  };

  return (
    <section className="proof" id="proof" ref={root} data-nav="light">
      <CombEdge from="#08080d" bands={EDGE} />
      <div className="proof-in">
        <div className="proof-side">
          <div className="proof-head">
            <h2 className="display proof-title">Color you can prove.</h2>
            <p className="lead">FairProof weighs how hard a task was, the evidence behind it, and whether it was delivered. A claim stays empty until something fills it.</p>
          </div>
          <div className="proof-card">
            <header>
              <i style={{ background: HEX[MEMBER_INK[owner]] }} />
              <span>
                <b>{sample.title.replace(' — ', ', ')}</b>
                <small>{team.members.find((m) => m.id === owner)!.name}</small>
              </span>
            </header>
            <p className="proof-try" data-warn={proof.pending}>
              {proof.pending ? 'Too little proof. Below 0.30 the claim stays empty.' : 'Take a piece of evidence away and watch the bar.'}
            </p>
            <ul className="proof-evidence">
              {sample.evidence.map((e) => {
                const on = !off.includes(e.id);
                return (
                  <li key={e.id}>
                    <button type="button" className="ev" aria-pressed={on} onClick={() => toggle(e)}>
                      <span className="ev-drop" aria-hidden="true" style={{ '--c': HEX[MEMBER_INK[owner]] } as React.CSSProperties} />
                      <span className="ev-name">
                        {KIND[e.kind] ?? e.kind}
                        <small>
                          {e.title.split(' · ')[0]}, {e.source}
                        </small>
                      </span>
                      <span className="ev-weight">{(EVIDENCE_WEIGHT[e.kind] * e.relevance).toFixed(2)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="proof-delivery" role="radiogroup" aria-label="Delivery">
              {DELIVERY.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  role="radio"
                  aria-checked={delivery === d.id}
                  onClick={() => {
                    setDelivery(d.id);
                    plop(0.5, 0.6);
                  }}
                >
                  {d.label}
                </button>
              ))}
              <i style={{ '--at': DELIVERY.findIndex((d) => d.id === delivery) } as React.CSSProperties} aria-hidden="true" />
            </div>
            <dl className="proof-sum">
              <div>
                <dd>{sample.points}</dd>
                <dt>difficulty</dt>
              </div>
              <i aria-hidden="true">×</i>
              <div>
                <dd>
                  <Roll value={proof.confidence} digits={2} />
                </dd>
                <dt>evidence</dt>
              </div>
              <i aria-hidden="true">×</i>
              <div>
                <dd>
                  <Roll value={proof.execution} digits={2} />
                </dd>
                <dt>delivered</dt>
              </div>
              <i aria-hidden="true">=</i>
              <div className="proof-total">
                <dd>
                  <Roll value={proof.verified} />
                </dd>
                <dt>proven points</dt>
              </div>
            </dl>
          </div>
        </div>

        <div className="proof-bars" ref={list} onPointerLeave={() => setReading(null)}>
          {rows.map((m, i) => (
            <div className="bar-row" key={m.member.id} data-on={reading?.bar === i}>
              <div className="bar-who">
                <b>{m.member.name}</b>
                <small>
                  {m.pendingTasks > 0 ? (
                    <em>
                      {m.pendingTasks} {m.pendingTasks === 1 ? 'claim needs' : 'claims need'} proof
                    </em>
                  ) : (
                    m.member.role
                  )}
                </small>
              </div>
              <div
                className="bar"
                style={{ '--fill': `${(m.vcs / longest) * 100}%`, '--c': HEX[MEMBER_INK[m.member.id]] } as React.CSSProperties}
                onPointerMove={read(i)}
                onPointerLeave={() => setReading(null)}
              >
                <span className="bar-claim" style={{ width: `${(m.claimed / longest) * 100}%` }} />
                <canvas
                  ref={(node) => {
                    bars.current[i] = node;
                  }}
                  aria-hidden="true"
                />
                {marks(m.lines).map((at) => (
                  <span key={at} className="bar-mark" style={{ left: `${(at / longest) * 100}%` }} />
                ))}
                <span className="bar-n">
                  <Roll value={m.vcs} />
                  <em>of {round1(m.claimed)}</em>
                </span>
              </div>
              <div className="bar-share">
                <Roll value={m.share * 100} digits={0} />
                <span>%</span>
              </div>
            </div>
          ))}
          <p className="proof-key">
            <span className="key-claim" /> claimed
            <span className="key-ink" /> proven
            <span className="key-note">Fictional sample team. Every number is computed on this page by the FairProof engine.</span>
          </p>
        </div>

        <div className="lens" ref={lensEl} data-on={reading !== null} aria-hidden="true">
          <div className="lens-in">
            <div className="lens-handle" />
            <div className="lens-glass">
              <canvas ref={lensCanvas} />
              {reading && (
                <div className="lens-text">
                  <b>{shortTitle(reading.line.taskId, reading.line.title)}</b>
                  {reading.line.pending ? (
                    <span>claimed {round1(reading.line.claimed)}, nothing proven</span>
                  ) : (
                    <>
                      <span>
                        {reading.line.points} × {reading.line.confidence.toFixed(2)} × {reading.line.execution.toFixed(2)}
                      </span>
                      <strong>{round1(reading.line.verified).toFixed(1)}</strong>
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="lens-hand">
              <Hand shape={HAND_C} ink={MEMBER_INK[reading ? order[reading.bar] : 'youssef']} mirror />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Where one proven piece ends and the next begins. */
function marks(lines: ContributionLine[]): number[] {
  const out: number[] = [];
  let sum = 0;
  for (const l of lines) {
    if (l.verified <= 0) continue;
    sum += l.verified;
    out.push(sum);
  }
  return out.slice(0, -1);
}

/** The piece of work under a position on the bar; past the proven part, the open claims. */
function lineAt(lines: ContributionLine[], at: number): ContributionLine | null {
  let sum = 0;
  for (const l of lines) {
    if (l.verified <= 0) continue;
    sum += l.verified;
    if (at <= sum) return l;
  }
  const claimed = lines.reduce((s, l) => s + l.claimed, 0);
  if (at > claimed) return null;
  return lines.find((l) => l.pending) ?? null;
}
