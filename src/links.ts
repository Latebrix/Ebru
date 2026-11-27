/**
 * Where every part of ebru lives, built from one domain. To move ebru, change DOMAIN here (Platform owns this file; run
 * `npm run sync -- --write` in the other repositories) or set VITE_EBRU_DOMAIN for a build. One address can still point
 * somewhere else, a local copy for example: VITE_SITE_URL, VITE_APP_URL, VITE_API_URL, VITE_KALEM_URL, VITE_SHOW_URL.
 * Pages use the same addresses through %LINK_SITE%, %LINK_APP%… (vite.config.ts fills them in), so no file names a
 * domain itself.
 */
export const DOMAIN = 'ebru.ink';

/** The Appwrite project behind api.<domain>. Its id is public: every page that talks to Appwrite sends it. */
const PROJECT = '6b0339c9003768c0ff10';

type Vars = Record<string, string | boolean | undefined>;

const pick = (vars: Vars, key: string) => {
  const value = vars[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
};

/** Every address for these build variables. vite.config.ts calls it too, before `import.meta.env` exists. */
export function linksFor(vars: Vars = {}) {
  const domain = pick(vars, 'VITE_EBRU_DOMAIN') || DOMAIN;
  const at = (sub?: string) => `https://${sub ? `${sub}.` : ''}${domain}/`;
  return {
    /** The website. */
    site: pick(vars, 'VITE_SITE_URL') || at(),
    /** The board, the platform itself. */
    app: pick(vars, 'VITE_APP_URL') || at('app'),
    /** Appwrite, behind our own domain, so its session cookie is first-party for every ebru site. */
    api: (pick(vars, 'VITE_API_URL') || `${at('api')}v1`).replace(/\/$/, ''),
    /** Kalem's presentation of ebru. */
    kalem: pick(vars, 'VITE_KALEM_URL') || at('kalem'),
    /** The team's slides. */
    show: pick(vars, 'VITE_SHOW_URL') || at('show'),
  };
}

export type Links = ReturnType<typeof linksFor>;

const vars: Vars = import.meta.env ?? {};

export const LINKS: Links = linksFor(vars);

/** The backend every ebru page talks to. */
export const BACKEND = {
  endpoint: LINKS.api,
  project: pick(vars, 'VITE_APPWRITE_PROJECT') || PROJECT,
} as const;

/** An address as people read it, without the scheme or the last slash: "ebru.ink/survey". */
export const shown = (url: string) => url.replace(/^https?:\/\//, '').replace(/\/$/, '');

/** A Vite plugin for vite.config.ts: fills %LINK_SITE%, %LINK_APP%, %LINK_API%… in the pages with these addresses. */
export const linksInPages = (links: Links) => ({
  name: 'ebru-links',
  transformIndexHtml: (html: string) =>
    html.replace(/%LINK_([A-Z]+)%/g, (all, key: string) => links[key.toLowerCase() as keyof Links] ?? all),
});
