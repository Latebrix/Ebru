import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { C, HEX } from '../brand/palette.ts';
import { Wordmark } from '../brand/Mark.tsx';
import { useInk } from '../ink/useInk.ts';
import { reducedMotion } from '../ink/quality.ts';
import { gsap, SplitText } from '../site/motion.ts';
import { Button, LinkButton } from '../site/ui/Button.tsx';
import { plop, settle } from '../site/ui/sound.ts';
import { Flood, type FloodHandle } from './Flood.tsx';
import { ANSWER_INKS, PrintScene, type Splash } from './printScene.ts';
import { IDEA, INTRO, LAST, PART_B, PART_C, PROJECT_FRAME, QUESTIONS, SURVEY_VERSION, type Question } from './questions.ts';
import { SendError, sendAnswers, type Row } from './send.ts';

type Value = string | number | string[];
type Answers = Record<string, Value>;

type Screen =
  | { kind: 'welcome' }
  | { kind: 'declined' }
  | { kind: 'again' }
  | { kind: 'question'; i: number }
  | { kind: 'idea' }
  | { kind: 'thanks'; screened: boolean };

type Status = { kind: 'idle' } | { kind: 'sending' } | { kind: 'error'; message: string; retry: boolean };

/** The website's section colours, one after another, as the questions go by. */
type Tone = 'ink' | 'bone' | 'pink' | 'teal' | 'saff' | 'blue';
const QUESTION_TONES: Tone[] = ['bone', 'pink', 'teal', 'saff', 'blue'];
const DARK = new Set<Tone>(['ink', 'teal', 'blue']);

/** Set once a phone has sent its answers, so the same person is not counted twice by accident. */
const SENT = 'ebru-survey-sent';
/** The answers so far, kept for this tab only, so a reload does not lose them. */
const DRAFT = 'ebru-survey-draft';

/** The inks of the choices, in the order of ANSWER_INKS. */
const INK_HEX = [HEX.verm, HEX.blue, HEX.saff, HEX.pink, HEX.teal];
const FIRST_IDEA = QUESTIONS.indexOf(PART_C[0]);
const FIRST_PROJECT = QUESTIONS.indexOf(PART_B[0]);
const LAST_PROJECT = QUESTIONS.indexOf(PART_B[PART_B.length - 1]);

interface Draft {
  screen: Screen;
  answers: Answers;
  other: string;
  started: number;
}

function load<T>(store: Storage | undefined, key: string): T | null {
  try {
    const text = store?.getItem(key);
    return text ? (JSON.parse(text) as T) : null;
  } catch {
    return null;
  }
}

function save(store: Storage | undefined, key: string, value: unknown) {
  try {
    if (value === null) store?.removeItem(key);
    else store?.setItem(key, JSON.stringify(value));
  } catch {
    // A browser that keeps nothing still lets the student answer; only a reload loses the answers.
  }
}

const session = typeof window === 'undefined' ? undefined : window.sessionStorage;
const local = typeof window === 'undefined' ? undefined : window.localStorage;

function firstScreen(): Screen {
  const draft = load<Draft>(session, DRAFT);
  if (draft?.screen.kind === 'question' || draft?.screen.kind === 'idea') return draft.screen;
  return load<number>(local, SENT) ? { kind: 'again' } : { kind: 'welcome' };
}

function toneOf(screen: Screen): Tone {
  if (screen.kind === 'question') return QUESTION_TONES[screen.i % QUESTION_TONES.length];
  return 'ink';
}

/** Which inks an answer falls in: its choice's ink, or the ink of its number. */
function inkOf(q: Question, v: Value): number[] {
  const at = (key: string) => ANSWER_INKS[Math.max(0, q.kind === 'one' || q.kind === 'many' ? q.choices.findIndex((c) => c.key === key) : 0) % ANSWER_INKS.length];
  if (q.kind === 'one') return [at(v as string)];
  if (q.kind === 'many') return (v as string[]).map(at);
  if (q.kind === 'scale') return [ANSWER_INKS[((v as number) + 1) % ANSWER_INKS.length]];
  return [C.bone];
}

const answered = (v: Value | undefined) => !(v === undefined || v === '' || (Array.isArray(v) && v.length === 0));

/** Every answer becomes one drop on the student's print. */
function splashesOf(answers: Answers): Splash[] {
  const out: Splash[] = [];
  for (const q of QUESTIONS) {
    const v = answers[q.id];
    if (!answered(v)) continue;
    const inks = inkOf(q, v);
    if (q.kind === 'many') out.push({ key: q.id, inks, size: 0.06 + 0.012 * inks.length });
    else if (q.kind === 'scale') out.push({ key: q.id, inks: [inks[0], C.bone, inks[0]], size: 0.05 + (v as number) * 0.012 });
    else if (q.kind === 'text') out.push({ key: q.id, inks: [C.bone, C.teal], size: 0.06 });
    else out.push({ key: q.id, inks: [inks[0], C.bone, inks[0]], size: 0.085 });
  }
  return out;
}

/** The colour of each question's drop in the row at the top, or null while it is unanswered. */
function dotsOf(answers: Answers): (string | null)[] {
  return QUESTIONS.map((q) => {
    const v = answers[q.id];
    if (!answered(v)) return null;
    if (q.kind === 'text') return HEX.bone;
    return INK_HEX[ANSWER_INKS.indexOf(inkOf(q, v)[0] as (typeof ANSWER_INKS)[number])] ?? HEX.bone;
  });
}

/** The water of the welcome and the end: a finished ebru first, the student's own print last. */
function Tray({ size, splashes }: { size: 'tall' | 'end'; splashes: Splash[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const scene = useInk(ref, () => new PrintScene(), { scale: 0.85, margin: '0px' });
  useEffect(() => scene.current.show(splashes), [scene, splashes]);
  return (
    <div className="sv-tray" data-size={size} aria-hidden="true">
      <canvas ref={ref} />
    </div>
  );
}

export function Survey() {
  const [screen, setScreen] = useState<Screen>(firstScreen);
  const [answers, setAnswers] = useState<Answers>(() => load<Draft>(session, DRAFT)?.answers ?? {});
  const [other, setOther] = useState(() => load<Draft>(session, DRAFT)?.other ?? '');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [shared, setShared] = useState('');
  /** The print of the answers that were just sent, kept for the thank-you screen. */
  const [sentPrint, setSentPrint] = useState<Splash[]>([]);
  const started = useRef(load<Draft>(session, DRAFT)?.started ?? 0);
  const title = useRef<HTMLHeadingElement>(null);
  const flood = useRef<FloodHandle>(null);
  const moving = useRef(false);
  const dots = useMemo(() => dotsOf(answers), [answers]);
  const tone = toneOf(screen);

  // Every new screen: the page starts at the top and the title rises out of its lines.
  useLayoutEffect(() => {
    window.scrollTo({ top: 0 });
    const el = title.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    if (reducedMotion()) return;
    const split = new SplitText(el, { type: 'lines,words', mask: 'lines' });
    const tween = gsap.from(split.words, { yPercent: 115, duration: 0.9, stagger: Math.min(0.035, 0.45 / split.words.length), ease: 'expo.out' });
    const rest = gsap.from(el.parentElement!.querySelectorAll('.sv-reveal'), { y: 26, opacity: 0, duration: 0.8, stagger: 0.05, delay: 0.15, ease: 'expo.out' });
    return () => {
      tween.kill();
      rest.kill();
      split.revert();
    };
  }, [screen]);

  useEffect(() => {
    const going = screen.kind === 'question' || screen.kind === 'idea';
    save(session, DRAFT, going ? ({ screen, answers, other, started: started.current } satisfies Draft) : null);
  }, [screen, answers, other]);

  /** To the next screen behind a combed flood of the next colour, led by the inks of the answer. */
  const go = (next: Screen, lead: string[] = []) => {
    if (moving.current) return;
    setStatus({ kind: 'idle' });
    const to = toneOf(next);
    const bands = [...lead.slice(0, 2), HEX.bone, HEX[to]];
    moving.current = true;
    flood.current?.run(bands, () => {
      setScreen(next);
      moving.current = false;
    });
    if (!flood.current) {
      setScreen(next);
      moving.current = false;
    }
  };

  const after = (i: number): Screen => (i + 1 === FIRST_IDEA ? { kind: 'idea' } : { kind: 'question', i: i + 1 });

  const back = (): Screen => {
    if (screen.kind === 'idea') return { kind: 'question', i: FIRST_IDEA - 1 };
    if (screen.kind === 'question' && screen.i === FIRST_IDEA) return { kind: 'idea' };
    if (screen.kind === 'question' && screen.i > 0) return { kind: 'question', i: screen.i - 1 };
    return { kind: 'welcome' };
  };

  /** Everything answered so far, in the shape of the table's columns. */
  const row = (finish: Answers): Row => {
    const all = { ...answers, ...finish };
    const out: Row = { version: SURVEY_VERSION, consent: true, seconds: Math.min(86400, Math.round((Date.now() - started.current) / 1000)) };
    for (const q of QUESTIONS) {
      const v = all[q.id];
      if (v === undefined || v === '') continue;
      out[q.id] = q.kind === 'text' ? String(v).trim().slice(0, q.max) : v;
    }
    const tools = all.tools;
    if (Array.isArray(tools) && tools.includes('other') && other.trim()) out.tools_other = other.trim().slice(0, 80);
    if (all.projects === 'none') for (const q of QUESTIONS.slice(FIRST_PROJECT)) delete out[q.id];
    return out;
  };

  const submit = async (finish: Answers, screened: boolean) => {
    if (status.kind === 'sending') return;
    setStatus({ kind: 'sending' });
    try {
      await sendAnswers(row(finish));
      save(local, SENT, Date.now());
      const print = splashesOf({ ...answers, ...finish });
      setSentPrint(print);
      setAnswers({});
      setOther('');
      go({ kind: 'thanks', screened }, [HEX.verm, HEX.saff]);
      if (!screened) window.setTimeout(settle, 900);
    } catch (err) {
      const e = err instanceof SendError ? err : new SendError('Something went wrong. Please try again.', true);
      setStatus({ kind: 'error', message: e.message, retry: e.retry });
    }
  };

  const pickOne = (q: Question, i: number, key: string | number, k: number) => {
    if (status.kind === 'sending' || moving.current) return;
    setAnswers({ ...answers, [q.id]: key });
    plop(0.35 + k * 0.12, 0.9);
    if (q.id === 'projects' && key === 'none') {
      void submit({ [q.id]: key }, true);
      return;
    }
    // A moment to see the choice fill with ink, then the next colour floods in.
    window.setTimeout(() => go(after(i), [INK_HEX[k % INK_HEX.length]]), reducedMotion() ? 0 : 240);
  };

  const toggle = (q: Question, key: string, k: number) => {
    if (q.kind !== 'many') return;
    const now = Array.isArray(answers[q.id]) ? (answers[q.id] as string[]) : [];
    let next = now.includes(key) ? now.filter((x) => x !== key) : [...now, key];
    if (key === q.alone && next.includes(key)) next = [key];
    else if (q.alone) next = next.filter((x) => x !== q.alone);
    if (next.includes(key)) plop(0.35 + k * 0.1, 0.7);
    setAnswers({ ...answers, [q.id]: next });
  };

  const sending = status.kind === 'sending';
  const problem = status.kind === 'error' && (
    <p className="sv-problem" role="alert">
      {status.message}
    </p>
  );
  const button = DARK.has(tone) ? 'solid' : 'ink';

  let content: React.ReactNode;

  if (screen.kind === 'welcome') {
    content = (
      <>
        <Tray size="tall" splashes={[]} />
        <main className="sv-page sv-welcome">
          <Wordmark className="sv-mark sv-reveal" />
          <h1 tabIndex={-1} ref={title} className="display">
            {INTRO.title}
          </h1>
          <p className="sv-promise sv-reveal">Every answer drops one ink. At the end you see the print your answers made.</p>
          <div className="sv-intro sv-reveal">
            {INTRO.lines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
          <p className="sv-ask sv-reveal">{INTRO.consent}</p>
          <div className="sv-row sv-reveal">
            <Button
              tone="solid"
              className="sv-btn"
              onClick={() => {
                started.current = Date.now();
                go({ kind: 'question', i: 0 }, [HEX.verm, HEX.saff]);
              }}
            >
              Yes, I agree
            </Button>
            <Button tone="line" className="sv-btn" onClick={() => go({ kind: 'declined' })}>
              No, thank you
            </Button>
          </div>
          <p className="sv-small sv-reveal">13 short questions. You can go back and change an answer before you send.</p>
        </main>
      </>
    );
  } else if (screen.kind === 'declined' || screen.kind === 'again' || screen.kind === 'thanks') {
    const thanks = screen.kind === 'thanks';
    const share = async () => {
      const url = `${location.origin}${location.pathname}`;
      try {
        if (navigator.share) {
          await navigator.share({ title: INTRO.title, url });
          return;
        }
        await navigator.clipboard.writeText(url);
        setShared('Link copied. Paste it in your class group.');
      } catch (err) {
        if ((err as Error)?.name !== 'AbortError') setShared(`Copy this link: ${url}`);
      }
    };
    content = (
      <>
        {thanks && !screen.screened && <Tray size="end" splashes={sentPrint} />}
        <main className="sv-page sv-end">
          <h1 tabIndex={-1} ref={title} className="display">
            {screen.kind === 'declined' && 'No problem. Thank you for your time.'}
            {screen.kind === 'again' && 'This phone has already answered. Thank you.'}
            {thanks && (screen.screened ? 'Thank you. This survey is for students who have worked in a group project.' : 'Thank you. This is your print.')}
          </h1>
          {thanks && !screen.screened && <p className="sv-lead sv-reveal">Every drop is one of your answers. Together, all the answers show us how group work is shared.</p>}
          {(thanks || screen.kind === 'again') && (
            <div className="sv-row sv-reveal">
              <Button tone="solid" className="sv-btn" onClick={() => void share()}>
                Share the survey
              </Button>
              <LinkButton tone="line" className="sv-btn" href="./">
                What is ebru?
              </LinkButton>
            </div>
          )}
          <p className="sv-small" role="status">
            {shared}
          </p>
          {screen.kind === 'again' && (
            <button
              className="sv-link"
              type="button"
              onClick={() => {
                save(local, SENT, null);
                go({ kind: 'welcome' });
              }}
            >
              Somebody else wants to answer on this phone
            </button>
          )}
        </main>
      </>
    );
  } else if (screen.kind === 'idea') {
    content = (
      <main className="sv-page">
        <Top dots={dots} n={PART_C[0].n - 1} onBack={() => go(back())} />
        <p className="sv-frame sv-reveal">Our idea</p>
        <h1 tabIndex={-1} ref={title} className="display sv-idea">
          {IDEA}
        </h1>
        <p className="sv-small sv-reveal">The next three questions are about this idea.</p>
        <Button tone={button} className="sv-btn sv-reveal" onClick={() => go({ kind: 'question', i: FIRST_IDEA }, [HEX.teal])}>
          Continue
        </Button>
      </main>
    );
  } else {
    const i = screen.i;
    const q = QUESTIONS[i];
    const value = answers[q.id];
    const inProject = i >= FIRST_PROJECT && i <= LAST_PROJECT;
    const last = i === LAST - 1;
    content = (
      <main className="sv-page">
        <Top dots={dots} n={q.n} onBack={() => go(back())} />
        {inProject && <p className="sv-frame sv-reveal">{PROJECT_FRAME}</p>}
        <h1 tabIndex={-1} ref={title} id={`q-${q.id}`} className="display">
          {q.ask}
        </h1>

        {q.kind === 'one' && (
          <div className="sv-choices" role="group" aria-labelledby={`q-${q.id}`}>
            <p className="sv-how sv-reveal">Choose one.</p>
            {q.choices.map((c, k) => (
              <button
                key={c.key}
                type="button"
                className="sv-choice sv-reveal"
                aria-pressed={value === c.key}
                disabled={sending}
                style={{ '--c': INK_HEX[k % INK_HEX.length] } as CSSProperties}
                onClick={() => pickOne(q, i, c.key, k)}
              >
                <i aria-hidden="true" />
                <span>{c.label}</span>
              </button>
            ))}
          </div>
        )}

        {q.kind === 'many' && (
          <>
            <div className="sv-choices" role="group" aria-labelledby={`q-${q.id}`}>
              <p className="sv-how sv-reveal">Choose all that apply.</p>
              {q.choices.map((c, k) => {
                const on = Array.isArray(value) && value.includes(c.key);
                return (
                  <button
                    key={c.key}
                    type="button"
                    className="sv-choice sv-reveal"
                    data-many="true"
                    aria-pressed={on}
                    style={{ '--c': INK_HEX[k % INK_HEX.length] } as CSSProperties}
                    onClick={() => toggle(q, c.key, k)}
                  >
                    <i aria-hidden="true" />
                    <span>{c.label}</span>
                  </button>
                );
              })}
              {q.other && Array.isArray(value) && value.includes(q.other) && (
                <label className="sv-other">
                  <span>Which other tool?</span>
                  <input value={other} maxLength={80} autoComplete="off" onChange={(e) => setOther(e.target.value)} />
                </label>
              )}
            </div>
            <Button
              tone={button}
              className="sv-btn"
              disabled={!Array.isArray(value) || value.length === 0}
              onClick={() => go(after(i), inkOf(q, value ?? []).map((c) => INK_HEX[ANSWER_INKS.indexOf(c as (typeof ANSWER_INKS)[number])] ?? HEX.bone))}
            >
              Next
            </Button>
          </>
        )}

        {q.kind === 'scale' && (
          <div className="sv-scale sv-reveal" role="group" aria-labelledby={`q-${q.id}`}>
            <div className="sv-drops">
              {[1, 2, 3, 4, 5].map((v) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={value === v}
                  aria-label={v === 1 ? `1, ${q.low}` : v === 5 ? `5, ${q.high}` : String(v)}
                  style={{ '--c': INK_HEX[(v + 1) % INK_HEX.length] } as CSSProperties}
                  onClick={() => pickOne(q, i, v, (v + 1) % INK_HEX.length)}
                >
                  {v}
                </button>
              ))}
            </div>
            <div className="sv-ends" aria-hidden="true">
              <span>1 = {q.low}</span>
              <span>5 = {q.high}</span>
            </div>
          </div>
        )}

        {q.kind === 'text' && (
          <form
            className="sv-text sv-reveal"
            onSubmit={(e) => {
              e.preventDefault();
              void submit({ [q.id]: String(value ?? '') }, false);
            }}
          >
            <label>
              <span>Optional. Please do not write any names.</span>
              <textarea rows={4} maxLength={q.max} value={typeof value === 'string' ? value : ''} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} />
            </label>
            {problem}
            <Button tone={button} type="submit" className="sv-btn" disabled={sending} aria-busy={sending}>
              {sending ? 'Sending…' : 'Send my answers'}
            </Button>
          </form>
        )}

        {!last && problem}
        {!last && status.kind === 'error' && status.retry && answers.projects === 'none' && (
          <Button tone={button} className="sv-btn" onClick={() => void submit({ projects: 'none' }, true)}>
            Try again
          </Button>
        )}
        {sending && !last && (
          <p className="sv-small" role="status">
            Sending…
          </p>
        )}
      </main>
    );
  }

  // A new screen is a new element: the title's split letters never meet the next question's words.
  const key = screen.kind === 'question' ? `q${screen.i}` : screen.kind;
  return (
    <div className="sv-shell" data-tone={tone} data-screen={screen.kind}>
      <div className="sv-screen" key={key}>
        {content}
      </div>
      <Flood ref={flood} />
    </div>
  );
}

/** Back, the number, and one drop for every question, coloured once it is answered. */
function Top({ n, dots, onBack }: { n: number; dots: (string | null)[]; onBack: () => void }) {
  return (
    <div className="sv-top">
      <button className="sv-back" type="button" onClick={onBack}>
        Back
      </button>
      <p className="sv-count">
        {n} of {LAST}
      </p>
      <ol className="sv-dots" aria-hidden="true">
        {dots.map((c, k) => (
          <li key={k} data-on={!!c} style={c ? ({ '--c': c } as CSSProperties) : undefined} />
        ))}
      </ol>
    </div>
  );
}
