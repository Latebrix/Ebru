import { useGSAP } from '@gsap/react';
import { useEffect, useRef, useState } from 'react';
import { Edge } from '../../app/home/Edge.tsx';
import { usePapers } from '../../app/home/prints.ts';
import { Ring } from '../../app/home/Ring.tsx';
import { dayOf, nextUp, weekOf } from '../../app/home/week.ts';
import { demoPeople, personIn } from '../../app/people.ts';
import { Flower } from '../../brand/Mark.tsx';
import { HEX, memberHex, MEMBER_INK } from '../../brand/palette.ts';
import { tasks, team } from '../../data/atlas.ts';
import { applySuggestion } from '../../engine/fairguard.ts';
import { pixelRatio, reducedMotion } from '../../ink/quality.ts';
import { plan, report, shortTitle } from '../data.ts';
import { gsap, revealCopy, revealTitle } from '../motion.ts';
import { CombEdge } from '../ui/CombEdge.tsx';
import { SharedWater } from './platformInk.ts';
import './platforms.css';

const EDGE = ['#ff5a3c', '#ffb43a', '#f4ece0', '#2a3df0'];

const person = (id: string | undefined) => personIn(demoPeople, id);
const WEEK = weekOf(team, demoPeople, tasks);
const NEXT = nextUp(tasks, null).slice(0, 4);
const MOVE = plan.suggestions[0];
/** The week after the first move. */
const FIRST = weekOf(team, demoPeople, applySuggestion(tasks, MOVE));
const load = (w: typeof WEEK, id: string) => `${Math.round(w.loads.find((l) => l.id === id)!.ratio * 100)}%`;
const NOUR = tasks.filter((t) => t.status !== 'done' && t.status !== 'backlog' && t.assignees.some((a) => a.member === 'nour')).slice(0, 3);
const byShare = [...report.members].sort((a, b) => b.share - a.share);

/** The dashboard: one sentence, five rings, one decision, and what comes next. */
function Laptop({ papers }: { papers: Record<string, string> }) {
  const [from, to] = [person(MOVE.from)!, person(MOVE.to)!];
  return (
    <div className="ui ui-laptop">
      <aside>
        <Flower />
        {[HEX.blue, HEX.bone, HEX.verm, HEX.teal, HEX.saff, HEX.pink].map((c, i) => (
          <i key={c} style={{ background: c }} data-on={i === 0} />
        ))}
      </aside>
      <div className="ui-dash">
        <div className="ui-week">
          <div className="ui-picture">
            <canvas data-window />
          </div>
          <h4>
            {WEEK.worst?.member.first} goes under on {WEEK.worst?.weekday}.
          </h4>
          <p className="ui-balance">
            <b>{WEEK.balance}</b>
            <span>
              team balance,
              <br />
              out of 100
            </span>
          </p>
          <ul className="ui-mates">
            {WEEK.loads.map((l) => (
              <li key={l.id} data-full={l.ratio > 1}>
                <Ring person={person(l.id)!} ratio={l.ratio} paper={papers[l.id] ?? null} />
                <p>
                  {person(l.id)!.first}
                  <b>{Math.round(l.ratio * 100)}%</b>
                </p>
              </li>
            ))}
          </ul>
        </div>
        <div className="ui-paper">
          <Edge className="ui-edge" />
          <div className="ui-decide">
            <span>One decision</span>
            <b>
              Give {MOVE.taskTitle} to {to.first}.
            </b>
            <p>
              {from.first} <s>{load(WEEK, MOVE.from)}</s> {Math.round(FIRST.loads.find((l) => l.id === MOVE.from)!.ratio * 100)}%
            </p>
            <em>Yes, move it</em>
          </div>
          <ul className="ui-next">
            {NEXT.map((t) => (
              <li key={t.id}>
                <b>{dayOf(t)}</b>
                <span>{shortTitle(t.id, t.title)}</span>
                <img src={person(t.assignees[0].member)!.portrait} alt="" loading="lazy" style={{ '--c': memberHex(t.assignees[0].member) } as React.CSSProperties} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Phone() {
  return (
    <div className="ui ui-phone">
      <div className="ui-picture">
        <canvas data-window />
        <p>
          Morning, Nour.
          <b>{NOUR.length} drops to go</b>
        </p>
      </div>
      <ul>
        {NOUR.map((t, i) => (
          <li key={t.id}>
            <i style={{ '--c': HEX[MEMBER_INK.nour], '--p': t.progress ?? 0 } as React.CSSProperties} data-on={i === 0} />
            <span>
              <b>{shortTitle(t.id, t.title)}</b>
              <small>{t.points} pts, due {t.due.slice(8)} Dec</small>
            </span>
          </li>
        ))}
      </ul>
      <span className="ui-proof">Add proof</span>
    </div>
  );
}

function Tablet() {
  return (
    <div className="ui ui-tablet">
      <header>
        <b>Report for the instructor</b>
        <span>balance {plan.after.balance}</span>
      </header>
      <div className="ui-picture">
        <canvas data-window />
        <Flower />
      </div>
      <ul>
        {byShare.map((m) => (
          <li key={m.member.id}>
            <i style={{ background: memberHex(m.member.id) }} />
            <b>{m.member.first}</b>
            <span className="ui-bar">
              <i style={{ width: `${m.share * 250}%`, background: memberHex(m.member.id) }} />
            </span>
            <em>{Math.round(m.share * 100)}%</em>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The laptop, phone and tablet over one shared water, drifting as the page scrolls. The website and the download page use it. */
export function Devices() {
  const stage = useRef<HTMLDivElement>(null);
  const [close, setClose] = useState(false);
  const papers = usePapers(demoPeople, close);

  // Every device copies the part of the shared picture it is in front of.
  useEffect(() => {
    const host = stage.current!;
    const still = reducedMotion();
    const windows = [...host.querySelectorAll<HTMLCanvasElement>('canvas[data-window]')].map((c) => ({ c, ctx: c.getContext('2d')!, device: c.closest<HTMLElement>('.device')!, zoom: 1 }));
    // The interfaces are laid out at 1:1 and zoomed to the size of their device.
    const fit = () => {
      for (const w of windows) {
        w.zoom = w.device.offsetWidth / Number(w.device.dataset.wide);
        w.device.style.setProperty('--z', String(w.zoom));
      }
    };
    fit();
    const resize = new ResizeObserver(fit);
    resize.observe(host);
    let water: SharedWater | null = null;
    let visible = false;
    const near = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        near.disconnect();
        setClose(true);
        try {
          water = new SharedWater();
        } catch {
          host.dataset.inkFailed = '';
        }
      },
      { rootMargin: '60% 0px' },
    );
    near.observe(host);
    const seen = new IntersectionObserver((entries) => {
      visible = entries[entries.length - 1].isIntersecting;
    });
    seen.observe(host);
    const tick = (time: number) => {
      if (!visible || !water) return;
      const ratio = Math.min(pixelRatio(), 1.5);
      const w = window.innerWidth;
      const h = window.innerHeight;
      // Tilted devices are sampled from their bounding box; the tilt is only a few degrees.
      const boxes = windows.map(({ c, zoom }) => {
        const r = c.getBoundingClientRect();
        return { x: r.left + (r.width - c.offsetWidth * zoom) / 2, y: r.top + (r.height - c.offsetHeight * zoom) / 2, w: c.offsetWidth * zoom, h: c.offsetHeight * zoom };
      });
      const tops = water.draw(boxes, { w, h }, ratio, still ? 3 : time);
      if (!tops) return;
      windows.forEach(({ c, ctx }, i) => {
        const cw = Math.round(boxes[i].w * ratio);
        const ch = Math.round(boxes[i].h * ratio);
        if (c.width !== cw || c.height !== ch) {
          c.width = cw;
          c.height = ch;
        }
        ctx.drawImage(water!.canvas, 0, tops[i], cw, ch, 0, 0, cw, ch);
      });
    };
    gsap.ticker.add(tick);
    return () => {
      resize.disconnect();
      near.disconnect();
      seen.disconnect();
      gsap.ticker.remove(tick);
      water?.dispose();
    };
  }, []);

  useGSAP(
    () => {
      if (reducedMotion()) return;
      const q = gsap.utils.selector(stage);
      const through = { trigger: stage.current, start: 'top bottom', end: 'bottom top', scrub: 0.6 } as const;
      gsap.fromTo(q('.device-laptop'), { y: 120, rotate: 1.5 }, { y: -70, rotate: -1, ease: 'none', scrollTrigger: through });
      gsap.fromTo(q('.device-phone'), { y: 420, rotate: -9 }, { y: -190, rotate: -2, ease: 'none', scrollTrigger: through });
      gsap.fromTo(q('.device-tablet'), { y: 300, rotate: 10 }, { y: -130, rotate: 2.5, ease: 'none', scrollTrigger: through });
    },
    { scope: stage },
  );

  return (
        <div className="devices" ref={stage} aria-hidden="true">
          <div className="device device-laptop" data-wide={820}>
            <div className="device-screen">
              <Laptop papers={papers} />
            </div>
            <div className="device-base" />
          </div>
          <div className="device device-phone" data-wide={272}>
            <div className="device-screen">
              <Phone />
            </div>
          </div>
          <div className="device device-tablet" data-wide={372}>
            <div className="device-screen">
              <Tablet />
            </div>
          </div>
        </div>
  );
}

export function Platforms() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (reducedMotion()) return;
      const q = gsap.utils.selector(root);
      revealTitle(q('.platforms-title')[0], q('.platforms-head')[0]);
      revealCopy(q('.platforms-head .lead'), q('.platforms-head')[0]);
      gsap.from(q('.systems li'), { y: 30, opacity: 0, stagger: 0.07, duration: 0.9, scrollTrigger: { trigger: q('.systems'), start: 'top 92%' } });
    },
    { scope: root },
  );

  return (
    <section className="platforms" ref={root} data-nav="dark">
      <CombEdge bands={EDGE} />
      <div className="platforms-in">
        <div className="platforms-head">
          <h2 className="display h-xl platforms-title">One water. Every screen.</h2>
          <p className="lead">Plan on the web, photograph proof with your phone, work deep on the desktop. Every drop lands in the same picture, seconds later.</p>
        </div>
        <Devices />
        <ul className="systems">
          {['Web', 'iOS', 'Android', 'Windows', 'macOS'].map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
