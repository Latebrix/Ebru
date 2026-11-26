import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Flower, Wordmark } from '../brand/Mark.tsx';
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

/** Set once a phone has sent its answers, so the same person is not counted twice by accident. */
const SENT = 'ebru-survey-sent';
/** The answers so far, kept for this tab only, so a reload does not lose them. */
const DRAFT = 'ebru-survey-draft';

const INKS = ['var(--verm)', 'var(--blue)', 'var(--saff)', 'var(--pink)', 'var(--teal)'];
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
const calm = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

function firstScreen(): Screen {
  const draft = load<Draft>(session, DRAFT);
  if (draft?.screen.kind === 'question' || draft?.screen.kind === 'idea') return draft.screen;
  return load<number>(local, SENT) ? { kind: 'again' } : { kind: 'welcome' };
}

export function Survey() {
  const [screen, setScreen] = useState<Screen>(firstScreen);
  const [answers, setAnswers] = useState<Answers>(() => load<Draft>(session, DRAFT)?.answers ?? {});
  const [other, setOther] = useState(() => load<Draft>(session, DRAFT)?.other ?? '');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [shared, setShared] = useState('');
  const started = useRef(load<Draft>(session, DRAFT)?.started ?? 0);
  const title = useRef<HTMLHeadingElement>(null);
  const leaving = useRef<number | undefined>(undefined);

  useEffect(() => {
    title.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [screen]);

  useEffect(() => {
    const going = screen.kind === 'question' || screen.kind === 'idea';
    save(session, DRAFT, going ? ({ screen, answers, other, started: started.current } satisfies Draft) : null);
  }, [screen, answers, other]);

  useEffect(() => () => window.clearTimeout(leaving.current), []);

  const go = (next: Screen) => {
    setStatus({ kind: 'idle' });
    setScreen(next);
  };

  const after = (i: number): Screen => {
    if (i + 1 === FIRST_IDEA) return { kind: 'idea' };
    return { kind: 'question', i: i + 1 };
  };

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
      if (q.kind === 'text') out[q.id] = String(v).trim().slice(0, q.max);
      else out[q.id] = v;
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
      setAnswers({});
      setOther('');
      go({ kind: 'thanks', screened });
    } catch (err) {
      const e = err instanceof SendError ? err : new SendError('Something went wrong. Please try again.', true);
      setStatus({ kind: 'error', message: e.message, retry: e.retry });
    }
  };

  const pickOne = (q: Question, i: number, key: string | number) => {
    if (status.kind === 'sending') return;
    setAnswers({ ...answers, [q.id]: key });
    if (q.id === 'projects' && key === 'none') {
      void submit({ [q.id]: key }, true);
      return;
    }
    window.clearTimeout(leaving.current);
    leaving.current = window.setTimeout(() => go(after(i)), calm() ? 0 : 260);
  };

  const toggle = (q: Question, key: string) => {
    if (q.kind !== 'many') return;
    const now = Array.isArray(answers[q.id]) ? (answers[q.id] as string[]) : [];
    let next = now.includes(key) ? now.filter((k) => k !== key) : [...now, key];
    if (key === q.alone && next.includes(key)) next = [key];
    else if (q.alone) next = next.filter((k) => k !== q.alone);
    setAnswers({ ...answers, [q.id]: next });
  };

  const sending = status.kind === 'sending';
  const problem = status.kind === 'error' && (
    <p className="sv-problem" role="alert">
      {status.message}
    </p>
  );

  if (screen.kind === 'welcome') {
    return (
      <main className="sv-page sv-welcome">
        <Wordmark className="sv-mark" />
        <Flower className="sv-flower" />
        <h1 tabIndex={-1} ref={title}>
          {INTRO.title}
        </h1>
        <div className="sv-intro">
          {INTRO.lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <p className="sv-ask">{INTRO.consent}</p>
        <div className="sv-row">
          <button
            className="sv-go"
            type="button"
            onClick={() => {
              started.current = Date.now();
              go({ kind: 'question', i: 0 });
            }}
          >
            Yes, I agree
          </button>
          <button className="sv-quiet" type="button" onClick={() => go({ kind: 'declined' })}>
            No, thank you
          </button>
        </div>
        <p className="sv-small">13 short questions. You can go back and change an answer before you send.</p>
      </main>
    );
  }

  if (screen.kind === 'declined' || screen.kind === 'again' || screen.kind === 'thanks') {
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
    return (
      <main className="sv-page sv-end">
        <Flower className="sv-flower sv-flower-end" />
        <h1 tabIndex={-1} ref={title}>
          {screen.kind === 'declined' && 'No problem. Thank you for your time.'}
          {screen.kind === 'again' && 'This phone has already answered. Thank you.'}
          {thanks && (screen.screened ? 'Thank you. This survey is for students who have worked in a group project.' : 'Thank you. Your answers are saved.')}
        </h1>
        {thanks && !screen.screened && <p className="sv-lead">Every answer helps us build a fairer way to share group work.</p>}
        {(thanks || screen.kind === 'again') && (
          <div className="sv-row">
            <button className="sv-go" type="button" onClick={() => void share()}>
              Share the survey
            </button>
            <a className="sv-quiet" href="./">
              What is ebru?
            </a>
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
    );
  }

  if (screen.kind === 'idea') {
    return (
      <main className="sv-page">
        <Top n={PART_C[0].n - 1} onBack={() => go(back())} />
        <p className="sv-frame">Our idea</p>
        <h1 tabIndex={-1} ref={title} className="sv-idea">
          {IDEA}
        </h1>
        <p className="sv-small">The next three questions are about this idea.</p>
        <button className="sv-go" type="button" onClick={() => go({ kind: 'question', i: FIRST_IDEA })}>
          Continue
        </button>
      </main>
    );
  }

  const i = screen.i;
  const q = QUESTIONS[i];
  const value = answers[q.id];
  const inProject = i >= FIRST_PROJECT && i <= LAST_PROJECT;
  const last = i === LAST - 1;

  return (
    <main className="sv-page">
      <Top n={q.n} onBack={() => go(back())} />
      {inProject && <p className="sv-frame">{PROJECT_FRAME}</p>}
      <h1 tabIndex={-1} ref={title} id={`q-${q.id}`}>
        {q.ask}
      </h1>

      {q.kind === 'one' && (
        <div className="sv-choices" role="group" aria-labelledby={`q-${q.id}`}>
          <p className="sv-how">Choose one.</p>
          {q.choices.map((c, k) => (
            <button
              key={c.key}
              type="button"
              className="sv-choice"
              aria-pressed={value === c.key}
              disabled={sending}
              style={{ '--c': INKS[k % INKS.length] } as CSSProperties}
              onClick={() => pickOne(q, i, c.key)}
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
            <p className="sv-how">Choose all that apply.</p>
            {q.choices.map((c, k) => {
              const on = Array.isArray(value) && value.includes(c.key);
              return (
                <button
                  key={c.key}
                  type="button"
                  className="sv-choice"
                  data-many="true"
                  aria-pressed={on}
                  style={{ '--c': INKS[k % INKS.length] } as CSSProperties}
                  onClick={() => toggle(q, c.key)}
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
          <button className="sv-go" type="button" disabled={!Array.isArray(value) || value.length === 0} onClick={() => go(after(i))}>
            Next
          </button>
        </>
      )}

      {q.kind === 'scale' && (
        <div className="sv-scale" role="group" aria-labelledby={`q-${q.id}`}>
          <div className="sv-drops">
            {[1, 2, 3, 4, 5].map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={value === v}
                aria-label={v === 1 ? `1, ${q.low}` : v === 5 ? `5, ${q.high}` : String(v)}
                style={{ '--c': INKS[(v + 1) % INKS.length] } as CSSProperties}
                onClick={() => pickOne(q, i, v)}
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
          className="sv-text"
          onSubmit={(e) => {
            e.preventDefault();
            void submit({ [q.id]: String(value ?? '') }, false);
          }}
        >
          <label>
            <span>Optional. Please do not write any names.</span>
            <textarea
              rows={4}
              maxLength={q.max}
              value={typeof value === 'string' ? value : ''}
              onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
            />
          </label>
          {problem}
          <button className="sv-go" type="submit" disabled={sending} aria-busy={sending}>
            {sending ? 'Sending…' : 'Send my answers'}
          </button>
        </form>
      )}

      {!last && problem}
      {!last && status.kind === 'error' && status.retry && answers.projects === 'none' && (
        <button className="sv-go" type="button" onClick={() => void submit({ projects: 'none' }, true)}>
          Try again
        </button>
      )}
      {sending && !last && (
        <p className="sv-small" role="status">
          Sending…
        </p>
      )}
    </main>
  );
}

function Top({ n, onBack }: { n: number; onBack: () => void }) {
  return (
    <div className="sv-top">
      <button className="sv-back" type="button" onClick={onBack}>
        Back
      </button>
      <p className="sv-count">
        {n} of {LAST}
      </p>
      <div className="sv-bar" aria-hidden="true">
        <i style={{ width: `${(n / LAST) * 100}%` }} />
      </div>
    </div>
  );
}
