import { useEffect, useRef, useState, type FormEvent } from 'react';
import { LINKS } from '../links.ts';
import { answersLink, ENOUGH, MOST, parseAnswers, readAnswers, writeAnswers, type Answer } from './answers.ts';

const QUESTIONS = [
  { key: 'less', ask: 'In your last group project, did somebody do less than the others?' },
  { key: 'same', ask: 'Did everybody expect the same workload?' },
  { key: 'seen', ask: 'Could you see who had too much, before the last days?' },
] as const;

type Draft = Pick<Answer, 'less' | 'same' | 'seen'>;
/** Home, the three questions, and one sentence at the end. */
type Screen = 'home' | 0 | 1 | 2 | 'say';

const EMPTY: Draft = { less: false, same: false, seen: false };

function face(i: number): string {
  return `./ebru/show/cameo-${(i % MOST) + 1}.webp`;
}

export function Ask() {
  const [list, setList] = useState(readAnswers);
  const [screen, setScreen] = useState<Screen>('home');
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [note, setNote] = useState('');
  const title = useRef<HTMLHeadingElement>(null);
  const full = list.length >= MOST;

  useEffect(() => {
    title.current?.focus({ preventScroll: true });
  }, [screen]);

  const keep = (next: Answer[]) => {
    setList(next);
    if (!writeAnswers(next)) setNote('This browser keeps nothing. Copy the answers before you close the page.');
  };

  const answer = (value: boolean) => {
    if (typeof screen !== 'number') return;
    setDraft({ ...draft, [QUESTIONS[screen].key]: value });
    setScreen(screen === 2 ? 'say' : ((screen + 1) as 1 | 2));
  };

  const finish = (say: string) => {
    keep([...list, { ...draft, say: say.trim().slice(0, 90), at: Date.now() }]);
    setDraft(EMPTY);
    setNote('Thank you.');
    setScreen('home');
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(list));
      setNote('Copied. Send it to the laptop and add it there.');
    } catch {
      setNote('Copying is blocked in this browser.');
    }
  };

  const add = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const more = parseAnswers(String(new FormData(form).get('answers') ?? '')).filter((a) => !list.some((b) => b.at === a.at));
    if (!more.length) {
      setNote('Nothing new in there.');
      return;
    }
    const next = [...list, ...more].slice(0, MOST);
    keep(next);
    form.reset();
    setNote(`${next.length - list.length} added.`);
  };

  if (screen === 'home') {
    return (
      <main className="ask-page">
        <header>
          <h1 tabIndex={-1} ref={title}>
            Three questions.
            <br />
            Thirty seconds.
          </h1>
          <p>Ask somebody who has worked in a group. Nobody’s name is kept.</p>
        </header>
        <ol className="ask-people" aria-label={`${list.length} of ${MOST} people`}>
          {Array.from({ length: MOST }, (_, i) => (
            <li key={i} data-on={i < list.length}>
              <img src={face(i)} alt="" width={190} height={252} />
            </li>
          ))}
        </ol>
        <p className="ask-status" role="status">
          {note && <b>{note} </b>}
          {list.length === 0 && 'Five answers are enough for the slide.'}
          {list.length > 0 && list.length < ENOUGH && `${ENOUGH - list.length} more, then the slide uses your answers.`}
          {list.length >= ENOUGH && (
            <>
              Slide 6 now shows your {list.length} answers. <a href={answersLink(LINKS.show, 6, list)}>Open slide 6</a>
            </>
          )}
        </p>
        <button className="ask-start" type="button" disabled={full} onClick={() => { setNote(''); setScreen(0); }}>
          {full ? 'All twelve are in' : list.length ? 'Next person' : 'Start'}
        </button>
        <details className="ask-tools">
          <summary>Answers on several phones</summary>
          <div>
            <button type="button" disabled={!list.length} onClick={() => void copy()}>
              Copy these answers
            </button>
            <form onSubmit={add}>
              <label>
                Paste answers from another phone
                <textarea name="answers" rows={3} spellCheck={false} />
              </label>
              <button type="submit">Add them</button>
            </form>
            <button
              type="button"
              disabled={!list.length}
              onClick={() => {
                if (!window.confirm('Remove the last person?')) return;
                keep(list.slice(0, -1));
                setNote('Removed.');
              }}
            >
              Remove the last person
            </button>
          </div>
        </details>
      </main>
    );
  }

  return (
    <main className="ask-page ask-one">
      <img className="ask-face" src={face(list.length)} alt="" width={190} height={252} />
      {screen === 'say' ? (
        <form
          className="ask-say"
          onSubmit={(e) => {
            e.preventDefault();
            finish(String(new FormData(e.currentTarget).get('say') ?? ''));
          }}
        >
          <h1 tabIndex={-1} ref={title}>
            One sentence about that project?
          </h1>
          <label>
            <span>Optional, 90 letters</span>
            <input name="say" maxLength={90} autoComplete="off" />
          </label>
          <button className="ask-start" type="submit">
            Done
          </button>
        </form>
      ) : (
        <>
          <p className="ask-count">{screen + 1} of 3</p>
          <h1 tabIndex={-1} ref={title}>
            {QUESTIONS[screen].ask}
          </h1>
          <div className="ask-drops">
            <button type="button" data-answer="yes" onClick={() => answer(true)}>
              Yes
            </button>
            <button type="button" data-answer="no" onClick={() => answer(false)}>
              No
            </button>
          </div>
        </>
      )}
      <button className="ask-back" type="button" onClick={() => { setDraft(EMPTY); setScreen('home'); }}>
        Stop
      </button>
    </main>
  );
}
