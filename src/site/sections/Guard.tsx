import { useGSAP } from '@gsap/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { memberHex } from '../../brand/palette.ts';
import { tasks, team } from '../../data/atlas.ts';
import { weekdayName } from '../../engine/calendar.ts';
import { applySuggestion, forecast, type Forecast } from '../../engine/fairguard.ts';
import { clamp, lerp, smooth, span } from '../../ink/random.ts';
import { pixelRatio, reducedMotion, reportFrame } from '../../ink/quality.ts';
import { plan } from '../data.ts';
import { gsap, revealCopy, revealTitle, scroll, ScrollTrigger } from '../motion.ts';
import { CombEdge } from '../ui/CombEdge.tsx';
import { plop, settle } from '../ui/sound.ts';
import { GuardStage } from './guardStage.ts';
import './guard.css';

const EDGE = ['#2a3df0', '#f4ece0', '#ff5a3c', '#ffb43a'];
const ids = team.members.map((m) => m.id);
const days = plan.before.days;
const STORM = days.indexOf(plan.before.members.find((m) => m.member.id === 'omar')!.peak.day);

/** Forecast before any move, after the first, after both. */
const steps: Forecast[] = (() => {
  const out = [plan.before];
  let current = tasks;
  for (const s of plan.suggestions) {
    current = applySuggestion(current, s);
    out.push(forecast(team, current));
  }
  return out;
})();

const loadAt = (f: Forecast, id: string, day: number) => {
  const p = f.members.find((m) => m.member.id === id)!.points;
  const i = Math.floor(day);
  return lerp(p[i].ratio, p[Math.min(p.length - 1, i + 1)].ratio, day - i);
};
const name = (id: string) => team.members.find((m) => m.id === id)!.first;
const peak = (f: Forecast, id: string) => Math.round(f.members.find((m) => m.member.id === id)!.peak.ratio * 100);

/** Scroll positions of the story. */
const BEATS = { week: [0.05, 0.34], first: [0.43, 0.58], second: [0.6, 0.72], rest: [0.76, 0.95] } as const;

interface Moment {
  day: number;
  first: number;
  second: number;
}

function momentAt(p: number): Moment {
  return {
    day: p < BEATS.rest[0] ? STORM * smooth(span(p, ...BEATS.week)) : lerp(STORM, days.length - 1, smooth(span(p, ...BEATS.rest))),
    first: span(p, ...BEATS.first),
    second: span(p, ...BEATS.second),
  };
}

/** Each pour drains its source and fills its target over the same scroll distance. */
function loadsAt(m: Moment): number[] {
  const one = smooth(clamp((m.first - 0.12) / 0.76));
  const two = smooth(clamp((m.second - 0.12) / 0.76));
  return ids.map((id) => {
    const a = loadAt(steps[0], id, m.day);
    const b = loadAt(steps[1], id, m.day);
    const c = loadAt(steps[2], id, m.day);
    return lerp(lerp(a, b, one), c, two);
  });
}

export function Guard() {
  const root = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const progress = useRef(0);
  const marker = useRef<HTMLElement>(null);
  const [day, setDay] = useState(0);
  const [loads, setLoads] = useState<number[]>(() => ids.map(() => 0));
  const [stage, setStage] = useState(0);
  const [approved, setApproved] = useState<number[]>([]);

  const pairs = useMemo(() => plan.suggestions.map((s) => ({ ...s, fromIndex: ids.indexOf(s.from), toIndex: ids.indexOf(s.to) })), []);

  useEffect(() => {
    const still = reducedMotion();
    const el = canvas.current!;
    let stageInk: GuardStage | null = null;
    let visible = false;
    const near = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        near.disconnect();
        try {
          stageInk = new GuardStage(el, ids);
        } catch {
          el.dataset.inkFailed = '';
        }
      },
      { rootMargin: '60% 0px' },
    );
    near.observe(el);
    const seen = new IntersectionObserver((entries) => {
      visible = entries[entries.length - 1].isIntersecting;
    });
    seen.observe(el);
    let lastText = '';
    let lastStage = 0;
    const tick = (time: number, deltaMs: number) => {
      if (!visible) return;
      const dt = Math.min(0.033, deltaMs / 1000);
      const p = still ? 1 : progress.current;
      const m = momentAt(p);
      const now = loadsAt(m);
      stageInk?.draw({
        loads: now,
        pours: [
          { from: pairs[0].fromIndex, to: pairs[0].toIndex, q: m.first },
          { from: pairs[1].fromIndex, to: pairs[1].toIndex, q: m.second },
        ],
        time: still ? 2 : time,
        dt,
        still,
        push: still ? 0 : scroll.velocity,
        ratio: Math.min(pixelRatio(), 1.5),
      });
      reportFrame(deltaMs / 1000);
      if (marker.current) marker.current.style.left = `${(m.day / (days.length - 1)) * 100}%`;
      const rounded = now.map((v) => Math.round(v * 100));
      const text = `${Math.round(m.day)}|${rounded.join()}`;
      if (text !== lastText) {
        lastText = text;
        setDay(Math.round(m.day));
        setLoads(rounded);
      }
      const s = m.second > 0.5 ? 3 : m.first > 0.5 ? 2 : p > BEATS.week[1] - 0.03 ? 1 : 0;
      if (s !== lastStage) {
        if (s > lastStage) (s === 1 ? settle : () => plop(0.6))();
        lastStage = s;
        setStage(s);
      }
    };
    gsap.ticker.add(tick);
    return () => {
      near.disconnect();
      seen.disconnect();
      gsap.ticker.remove(tick);
      stageInk?.dispose();
    };
  }, [pairs]);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const track = q('.guard-track')[0];
      ScrollTrigger.create({
        trigger: track,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self) => {
          progress.current = self.progress;
        },
      });
      if (reducedMotion()) {
        progress.current = 1;
        return;
      }
      revealTitle(q('.guard-title')[0], track, 'top 45%');
      revealCopy(q('.guard-lead, .guard-balance'), track, 'top 38%');
    },
    { scope: root },
  );

  const balance = stage >= 3 ? steps[2].balance : stage >= 2 ? steps[1].balance : steps[0].balance;
  const worst = plan.before.members.find((m) => m.member.id === 'omar')!;

  const caption =
    stage === 0
      ? 'The week as it stands today.'
      : stage === 1
        ? `${weekdayName(worst.peak.day)}. ${worst.member.first} goes under.`
        : stage === 2
          ? 'One move takes most of the pressure off.'
          : day > STORM
            ? 'The rest of the project. Nobody goes under.'
            : 'Two moves. That is all it takes.';

  return (
    <section className="guard" id="guard" ref={root} data-nav="light">
      <CombEdge from="#0f9d8f" bands={EDGE} />
      <div className="guard-track">
      <div className="guard-pin">
        <div className="guard-head">
          <h2 className="display guard-title">Spread it before it spills.</h2>
          <p className="guard-lead lead">FairGuard reads deadlines, pace and history, sees the overload days before it happens, and proposes the fewest moves that prevent it. People approve. Always.</p>
        </div>

        <div className="guard-board">
          <div className="guard-jars">
            <p className="guard-caption" key={caption}>
              {caption}
            </p>
            <canvas ref={canvas} aria-hidden="true" />
            <ul className="guard-names">
              {ids.map((id, i) => (
                <li key={id} data-over={loads[i] > 100}>
                  <b>{name(id)}</b>
                  <span>{loads[i]}%</span>
                </li>
              ))}
            </ul>
            <div className="guard-days" aria-hidden="true">
              <i ref={marker} />
              {days.map((d, i) => (
                <span key={d} style={{ left: `${(i / (days.length - 1)) * 100}%` }} data-on={i === day} data-storm={i === STORM}>
                  {weekdayName(d, 'short')} {Number(d.slice(8))}
                </span>
              ))}
            </div>
          </div>

          <div className="guard-side">
            <div className="guard-balance">
              <span className="guard-number" key={balance}>
                {balance}
              </span>
              <span>team balance, out of 100</span>
            </div>
            {pairs.map((s, i) => {
              const shown = stage >= 1;
              const done = approved.includes(i);
              return (
                <article key={s.taskId} className="move" data-shown={shown} data-run={stage >= i + 2} data-done={done} style={{ transitionDelay: shown ? `${i * 0.12}s` : '0s' }}>
                  <div className="move-dots" aria-hidden="true">
                    <i style={{ background: memberHex(s.from) }} />
                    <i style={{ background: memberHex(s.to) }} />
                  </div>
                  <h3>
                    {s.kind === 'move' ? `Move ${s.taskTitle} to ${name(s.to)}` : `Share ${s.taskTitle} between ${name(s.from)} and ${name(s.to)}`}
                  </h3>
                  <p>
                    {s.kind === 'move' ? `${name(s.to)} has the skills and the hours. ` : `${name(s.to)} can pair on it. `}
                    {name(s.from)} {peak(steps[i], s.from)}% to {peak(steps[i + 1], s.from)}%, {name(s.to)} {peak(steps[i], s.to)}% to {peak(steps[i + 1], s.to)}%.
                  </p>
                  <button
                    type="button"
                    aria-pressed={done}
                    onClick={() => {
                      setApproved(done ? approved.filter((k) => k !== i) : [...approved, i]);
                      plop(done ? 0.8 : 0.3);
                    }}
                  >
                    <span className="move-ink" aria-hidden="true" />
                    <span>{done ? 'Approved by you' : 'Approve'}</span>
                  </button>
                </article>
              );
            })}
          </div>
        </div>
        <p className="sr-only">
          Forecast for a fictional team: without changes {worst.member.first} reaches {peak(steps[0], 'omar')} percent of capacity on {weekdayName(worst.peak.day)}. Two approved moves raise team balance from {steps[0].balance} to {steps[2].balance}.
        </p>
      </div>
      </div>
    </section>
  );
}
