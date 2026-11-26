/**
 * Where the other parts of ebru live. Each is a site of its own; set VITE_APP_URL, VITE_KALEM_URL or
 * VITE_SHOW_URL (in .env.local, for example) to point at another copy.
 */
const env = import.meta.env;

export const LINKS = {
  /** The board, the platform itself. */
  app: (env.VITE_APP_URL as string | undefined) || 'https://app.ebru.ink/',
  /** Kalem's presentation of ebru. */
  kalem: (env.VITE_KALEM_URL as string | undefined) || 'https://kalem.ebru.ink/',
  /** The team's slides. */
  show: (env.VITE_SHOW_URL as string | undefined) || 'https://show.ebru.ink/',
};
