/**
 * Sends one finished survey to Appwrite (project "Ebru", table research/survey). The table lets anybody
 * add a row and nobody read one, so the page needs no key: only the public project id. Answers carry no
 * names and no address; Appwrite checks every value against the table's columns.
 */
import { BACKEND } from '../links.ts';

const ENDPOINT = BACKEND.endpoint;
const PROJECT = BACKEND.project;
const DATABASE = 'research';
const TABLE = 'survey';

export type Row = Record<string, string | number | boolean | string[]>;

/** Waits at most this long for Appwrite before the student is told to try again. */
const PATIENCE = 15000;

export class SendError extends Error {
  constructor(
    message: string,
    /** True when trying again can help (no connection, a busy server); false when the answer itself was refused. */
    readonly retry: boolean,
  ) {
    super(message);
  }
}

export async function sendAnswers(row: Row): Promise<void> {
  const stop = new AbortController();
  const timer = setTimeout(() => stop.abort(), PATIENCE);
  let res: Response;
  try {
    res = await fetch(`${ENDPOINT}/tablesdb/${DATABASE}/tables/${TABLE}/rows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Appwrite-Project': PROJECT },
      body: JSON.stringify({ rowId: 'unique()', data: row }),
      signal: stop.signal,
    });
  } catch {
    throw new SendError('We could not reach our server. Check your connection and try again.', true);
  } finally {
    clearTimeout(timer);
  }
  if (res.ok) return;
  if (res.status === 429) throw new SendError('Many answers are arriving at once. Please wait a minute and try again.', true);
  if (res.status >= 500) throw new SendError('Our server had a problem. Please try again in a moment.', true);
  throw new SendError('Your answers could not be saved. Please tell the team who sent you this link.', false);
}
