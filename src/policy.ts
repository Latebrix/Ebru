import type { Links } from './links.ts';

/**
 * The security policy of ebru's pages, written into each page at build time. Appwrite Sites serves static files with
 * its own headers (HSTS for two years with preload, nosniff, ETags) but no Content-Security-Policy, so the policy lives
 * in a meta element. A meta policy cannot say frame-ancestors; the app answers that itself: a page inside a frame only
 * ever shows the sample board, never a signed-in project (src/live/Root.tsx).
 *
 * Platform owns this file; the website keeps a copy (npm run sync).
 */
export function policyFor(links: Links, options: { google?: boolean } = {}): string {
  const api = new URL(links.api);
  // Google's account picker: its script, its button frame and its styles (native sign-in on the web).
  const google = options.google ? ' https://accounts.google.com/gsi/' : '';
  return [
    "default-src 'self'",
    `script-src 'self'${google}`,
    // React writes style attributes (positions, colours); no script can run from a style.
    `style-src 'self' 'unsafe-inline'${google}`,
    `img-src 'self' data: blob: ${api.origin}`,
    "font-src 'self' data:",
    "media-src 'self' blob:",
    `connect-src 'self' ${api.origin} wss://${api.host}${google}`,
    `frame-src 'self'${google}`,
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    'upgrade-insecure-requests',
  ].join('; ');
}

/** A Vite plugin for production builds: the policy and the referrer policy go into every page, right after the charset. */
export const policyInPages = (policy: string) => ({
  name: 'ebru-policy',
  apply: 'build' as const,
  transformIndexHtml: (html: string) =>
    html.replace(/(<meta charset=[^>]*>)/i, `$1\n    <meta http-equiv="Content-Security-Policy" content="${policy}" />\n    <meta name="referrer" content="strict-origin-when-cross-origin" />`),
});
