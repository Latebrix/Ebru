import { useGSAP } from '@gsap/react';
import { useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { DIGITS } from '../../brand/digits.ts';
import { HAND_A } from '../../brand/hands.ts';
import { HEX, memberHex } from '../../brand/palette.ts';
import { reducedMotion } from '../../ink/quality.ts';
import { useInk } from '../../ink/useInk.ts';
import { gsap, revealCopy, revealTitle, ScrollTrigger } from '../motion.ts';
import { CombEdge } from '../ui/CombEdge.tsx';
import { Hand } from '../ui/Hand.tsx';
import { plop, settle } from '../ui/sound.ts';
import { CHECKABLE, CRITERIA, HELPER, LIVE, TOTAL } from './rubricData.ts';
import { RubricScene } from './rubricScene.ts';
import './rubric.css';

const EDGE = ['#2a3df0', '#ffb43a', '#f4ece0', '#0f9d8f'];
const WIDEST = Math.max(...CRITERIA.map((c) => DIGITS[String(c.marks)].w));

export function Rubric() {
  const root = useRef<HTMLElement>(null);
  const windows = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  useInk(canvas, () => new RubricScene(), { scale: 0.9 });
  const mask = useId();
  const [picked, setPicked] = useState(3);
  const [added, setAdded] = useState<string[]>([]);
  const [landed, setLanded] = useState(reducedMotion());
  const [box, setBox] = useState({ w: 0, h: 0, rows: 1 });

  // The numerals are cut at the exact size of the sheet.
  useLayoutEffect(() => {
    const el = windows.current!;
    const measure = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      setBox({ w, h, rows: w < 760 ? 2 : 1 });
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const per = Math.ceil(CRITERIA.length / box.rows);
  const cells = useMemo(
    () =>
      CRITERIA.map((c, i) => {
        const row = Math.floor(i / per);
        const inRow = row === box.rows - 1 ? CRITERIA.length - per * row : per;
        const cw = box.w / inRow;
        const ch = box.h / box.rows;
        const x = cw * (i - row * per);
        const y = row * ch;
        // Each numeral fills its cell: as tall as the sheet allows, never wider than 88% of the column.
        const digit = DIGITS[String(c.marks)];
        const k = Math.min((ch * 0.9) / 1046, (cw * (box.rows > 1 ? 0.78 : 0.88)) / WIDEST);
        return { c, x, y, w: cw, h: ch, k, d: digit.d, at: `translate(${x + (cw - digit.w * k) / 2} ${y + ch / 2 - 500 * k}) scale(${k})`, top: ch / 2 - 523 * k, tall: 1046 * k };
      }),
    [box, per],
  );

  const coverOf = (id: string) => {
    const c = CRITERIA.find((k) => k.id === id)!;
    return Math.min(1, c.cover + (added.includes(id) ? (c.task?.gain ?? 0) : 0));
  };
  const found = CRITERIA.reduce((s, c) => s + (c.marks - c.live) * c.cover, 0);
  const planned = CRITERIA.reduce((s, c) => s + (c.marks - c.live) * (coverOf(c.id) - c.cover), 0);
  const current = CRITERIA[picked];

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      if (reducedMotion()) {
        gsap.set(q('.rubric-hand'), { autoAlpha: 0 });
        return;
      }
      revealTitle(q('.rubric-title')[0], q('.rubric-head')[0]);
      revealCopy(q('.rubric-head .lead'), q('.rubric-head')[0]);

      // Two hands lower the sheet onto the bath, let go and leave.
      const sheet = q('.rubric-sheet');
      gsap
        .timeline({ scrollTrigger: { trigger: q('.rubric-drop'), start: 'top 96%', end: 'top 34%', scrub: 0.5 } })
        .fromTo(sheet, { y: '-17vh', rotate: -5, transformOrigin: '50% 0%' }, { y: 0, rotate: 0, ease: 'power1.inOut' }, 0);
      gsap
        .timeline({ scrollTrigger: { trigger: q('.rubric-drop'), start: 'top 30%', end: 'top -6%', scrub: 0.5 } })
        .to(q('.rubric-hand-l'), { x: '-42vw', y: '-30vh', rotate: -18, ease: 'power1.in' }, 0)
        .to(q('.rubric-hand-r'), { x: '42vw', y: '-30vh', rotate: 18, ease: 'power1.in' }, 0);
      ScrollTrigger.create({
        trigger: q('.rubric-drop')[0],
        start: 'top 42%',
        once: true,
        onEnter: () => {
          setLanded(true);
          settle();
        },
      });
      gsap.from(q('.rubric-detail > *'), { y: 36, opacity: 0, stagger: 0.1, duration: 1, scrollTrigger: { trigger: q('.rubric-detail'), start: 'top 88%' } });
    },
    { scope: root },
  );

  return (
    <section className="rubric" id="rubric" ref={root} data-nav="light">
      <CombEdge from="#f4ece0" bands={EDGE} />
      <div className="rubric-in">
        <div className="rubric-head">
          <h2 className="display rubric-title">Done. The way they asked.</h2>
          <p className="lead">Upload the rubric. ebru reads every criterion, matches it with the evidence on your board, and shows what is missing while there is still time to fix it.</p>
        </div>

        <div className="rubric-drop">
          <div className="rubric-sheet" data-landed={landed}>
            <div className="rubric-top">
              <span className="rubric-file">
                <svg width="17" height="20" viewBox="0 0 17 20" aria-hidden="true">
                  <path d="M2.5 1h8l4.5 4.5V17a2 2 0 0 1-2 2H2.5a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2z" fill="none" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M10 1v5h5" fill="none" stroke="currentColor" strokeWidth="1.6" />
                </svg>
                Midterm rubric, {CRITERIA.length} criteria, {TOTAL} marks
              </span>
              <span className="rubric-count">
                <b>{found.toFixed(1)}</b> of {CHECKABLE} checkable marks have evidence
                {planned > 0 && <em>, {planned.toFixed(1)} more planned</em>}
              </span>
            </div>
            <div className="rubric-windows" ref={windows}>
              <canvas ref={canvas} aria-hidden="true" />
              {cells.map(({ c, x, y, w, h, top, tall }, i) => {
                const level = landed && c.live < c.marks ? coverOf(c.id) : 0;
                return (
                  <div key={c.id} className="rubric-water" style={{ left: x - 1, top: y, width: w + 2, height: h }}>
                    <i style={{ height: top + (1 - level) * tall, transitionDelay: `${0.15 + i * 0.09}s` }} />
                  </div>
                );
              })}
              <svg className="rubric-stencil" width={box.w} height={box.h} viewBox={`0 0 ${Math.max(1, box.w)} ${Math.max(1, box.h)}`} aria-hidden="true">
                <defs>
                  <mask id={mask} maskUnits="userSpaceOnUse" x="-4" y="-4" width={box.w + 8} height={box.h + 8}>
                    <rect x="-4" y="-4" width={box.w + 8} height={box.h + 8} fill="#fff" />
                    {cells.map(({ c, d, at }) => c.live < c.marks && <path key={c.id} d={d} transform={at} fill="#000" fillRule="evenodd" />)}
                  </mask>
                </defs>
                <rect x="-4" y="-4" width={box.w + 8} height={box.h + 8} fill={HEX.bone} mask={`url(#${mask})`} />
                {cells.map(({ c, d, at, k }) => (
                  <path key={c.id} className={c.live === c.marks ? 'rubric-live' : 'rubric-rim'} d={d} transform={at} strokeWidth={1.8 / Math.max(k, 0.01)} strokeDasharray={c.live === c.marks ? `${7 / Math.max(k, 0.01)} ${5 / Math.max(k, 0.01)}` : undefined} />
                ))}
              </svg>
              {cells.map(({ c, x, y, w, h }, i) => (
                <button
                  key={c.id}
                  type="button"
                  className="rubric-hit"
                  aria-pressed={picked === i}
                  aria-label={`${c.name}, ${c.marks} marks`}
                  style={{ left: x, top: y, width: w, height: h }}
                  onClick={() => {
                    setPicked(i);
                    plop(0.35, 0.5);
                  }}
                />
              ))}
            </div>
            <ul className="rubric-names" style={{ gridTemplateColumns: `repeat(${per}, 1fr)` }}>
              {CRITERIA.map((c, i) => (
                <li key={c.id} data-on={picked === i}>
                  <button type="button" onClick={() => setPicked(i)} tabIndex={-1} aria-hidden="true">
                    {c.name}
                    <small>{c.live === c.marks ? 'judged live' : c.live > 0 ? `${c.marks - c.live} found, ${c.live} live` : `${Math.round(coverOf(c.id) * 100)}% has evidence`}</small>
                  </button>
                </li>
              ))}
            </ul>
            <p className="rubric-current">
              {current.name}
              <small>{current.live === current.marks ? 'judged live' : `${Math.round(coverOf(current.id) * 100)}% has evidence`}</small>
            </p>
            <div className="rubric-hand rubric-hand-l" aria-hidden="true">
              <Hand shape={HAND_A} ink="verm" />
            </div>
            <div className="rubric-hand rubric-hand-r" aria-hidden="true">
              <Hand shape={HAND_A} ink="blue" mirror />
            </div>
          </div>
        </div>

        <div className="rubric-detail" aria-live="polite">
          <div>
            <h3>They ask for</h3>
            <p key={current.id} className="swap">
              {current.asks}
            </p>
          </div>
          <div>
            <h3>Found on the board</h3>
            {current.found.length > 0 ? (
              <ul key={current.id} className="swap">
                {current.found.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            ) : (
              <p key={current.id} className="swap">
                {current.live > 0 ? 'Nothing to look for. People award these marks on the day, and ebru never scores how somebody speaks.' : 'Nothing yet.'}
              </p>
            )}
          </div>
          <div>
            <h3>Still missing</h3>
            {current.missing && current.task ? (
              <div key={current.id} className="swap">
                <p>{current.missing}</p>
                <button
                  type="button"
                  className="rubric-add"
                  data-done={added.includes(current.id)}
                  disabled={added.includes(current.id)}
                  onClick={() => {
                    setAdded([...added, current.id]);
                    plop(0.7);
                  }}
                >
                  <i style={{ background: memberHex(HELPER.id) }} />
                  <span>
                    <b>{added.includes(current.id) ? `On ${HELPER.first}’s list` : current.task.title}</b>
                    <small>
                      {added.includes(current.id) ? current.task.title : `${HELPER.first} has room, at ${HELPER.load}% load`}
                    </small>
                  </span>
                </button>
              </div>
            ) : (
              <p key={current.id} className="swap">
                {current.live > 0 ? `${current.live} ${current.live === 1 ? 'mark is' : 'marks are'} judged live. Everything else is here.` : 'Nothing. This one is complete.'}
              </p>
            )}
          </div>
        </div>
        <p className="rubric-note">
          This is the real rubric of our midterm, checked against a fictional team. {LIVE} of the {TOTAL} marks are awarded by people on the day, so ebru leaves them empty.
        </p>
      </div>
    </section>
  );
}
