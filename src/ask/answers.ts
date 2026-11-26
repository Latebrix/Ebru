/** Answers our own users gave on the ask page. They stay in this browser; slide 6 reads them. */
export interface Answer {
  /** Somebody did less than the others. */
  less: boolean;
  /** Everybody expected the same workload. */
  same: boolean;
  /** The team could see who had too much before the last days. */
  seen: boolean;
  say: string;
  at: number;
}

const KEY = 'ebru-answers';
/** The slide has room for twelve portraits. */
export const MOST = 12;
/** Fewer voices than this are not a finding yet. */
export const ENOUGH = 5;

const valid = (a: unknown): a is Answer => {
  const v = a as Answer;
  return !!v && typeof v.less === 'boolean' && typeof v.same === 'boolean' && typeof v.seen === 'boolean' && typeof v.at === 'number';
};

/** Reads a list from outside: unknown shapes are dropped, sentences are kept short. */
export function parseAnswers(text: string): Answer[] {
  try {
    const list: unknown = JSON.parse(text);
    if (!Array.isArray(list)) return [];
    return list.filter(valid).map((a) => ({ less: a.less, same: a.same, seen: a.seen, at: a.at, say: typeof a.say === 'string' ? a.say.trim().slice(0, 90) : '' }));
  } catch {
    return [];
  }
}

export function readAnswers(): Answer[] {
  try {
    return parseAnswers(localStorage.getItem(KEY) ?? '[]').slice(0, MOST);
  } catch {
    return [];
  }
}

/** Answers travel to the slides after the # of the address, so they never reach a server. */
const CARRIED = /^#(\d+(?:\.\d+)?)\/answers\/([\w-]+)$/;

/** The address of a slide that brings these answers along. */
export function answersLink(slides: string, slide: number, list: Answer[]): string {
  let bin = '';
  for (const b of new TextEncoder().encode(JSON.stringify(list))) bin += String.fromCharCode(b);
  return `${slides}#${slide}/answers/${btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`;
}

/** Keeps the answers an address brought along, and takes them out of the address again. */
export function takeAnswersFromAddress() {
  const m = CARRIED.exec(location.hash);
  if (!m) return;
  try {
    const bin = atob(m[2].replace(/-/g, '+').replace(/_/g, '/'));
    const known = readAnswers();
    const brought = parseAnswers(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
    writeAnswers([...known, ...brought.filter((a) => !known.some((b) => b.at === a.at))]);
  } catch {
    // A broken address changes nothing.
  }
  history.replaceState(null, '', `#${m[1]}`);
}

/** False when the browser keeps nothing. */
export function writeAnswers(list: Answer[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MOST)));
    return true;
  } catch {
    return false;
  }
}
