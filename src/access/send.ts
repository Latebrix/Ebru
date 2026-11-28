/**
 * Sends an access request to ebru's access function (Backend functions/access), the one route anybody may call without
 * an account. The page needs no key: only the public project id. The function checks every field, keeps one open
 * request per email, and answers the same way whether the email asked before or not.
 */
import { BACKEND } from '../links.ts';

export interface AccessRequest {
  email: string;
  name: string;
  school: string;
  team: number;
  why: string;
  lang: 'en' | 'ar';
  /** Stays empty: people never see it; scripts fill it in. */
  website: string;
  /** When the form was drawn, in Unix milliseconds. */
  shown: number;
}

/** Waits at most this long for the server before the person is told to try again. */
const PATIENCE = 20000;

export class SendError extends Error {
  constructor(
    readonly kind: 'offline' | 'busy' | 'refused' | 'server',
    readonly fields: Record<string, string> = {},
  ) {
    super(kind);
  }
}

export async function sendRequest(input: AccessRequest): Promise<void> {
  const stop = new AbortController();
  const timer = setTimeout(() => stop.abort(), PATIENCE);
  let res: Response;
  try {
    res = await fetch(`${BACKEND.endpoint}/functions/access/executions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Appwrite-Project': BACKEND.project },
      body: JSON.stringify({ body: JSON.stringify(input), async: false, path: '/requests', method: 'POST', headers: { 'content-type': 'application/json' } }),
      signal: stop.signal,
    });
  } catch {
    throw new SendError('offline');
  } finally {
    clearTimeout(timer);
  }
  if (res.status === 429) throw new SendError('busy');
  if (!res.ok) throw new SendError('server');
  const execution = (await res.json().catch(() => null)) as { responseStatusCode?: number; responseBody?: string } | null;
  const status = execution?.responseStatusCode ?? 0;
  if (status >= 200 && status < 300) return;
  let fields: Record<string, string> = {};
  try {
    fields = (JSON.parse(execution?.responseBody ?? '{}') as { error?: { fields?: Record<string, string> } }).error?.fields ?? {};
  } catch {
    // The answer had no reasons; the page says it generally.
  }
  if (status === 429) throw new SendError('busy');
  if (status === 400 || status === 422) throw new SendError('refused', fields);
  throw new SendError('server');
}
