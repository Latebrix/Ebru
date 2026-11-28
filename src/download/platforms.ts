import { LINKS } from '../links.ts';

/** Where ebru runs. The web app works today; each store link is set for a build once it exists, never invented. */
export type Platform = 'android' | 'ios' | 'mac' | 'windows' | 'web';

const env: Record<string, string | undefined> = import.meta.env ?? {};
const url = (key: string) => {
  const value = env[key]?.trim();
  return value && /^https:\/\//.test(value) ? value : null;
};

/** The link for each platform, or null while it is not out yet ("coming soon"). */
export const LINKS_BY_PLATFORM: Record<Platform, string | null> = {
  // the Google Play testing track: people join the test, then install from Play
  android: url('VITE_PLAY_TESTING_URL'),
  // iPhone and iPad install only from the App Store
  ios: url('VITE_APP_STORE_URL'),
  // a Mac app outside the Mac App Store needs Developer ID signing and notarization
  mac: url('VITE_MAC_DOWNLOAD_URL'),
  windows: url('VITE_WINDOWS_DOWNLOAD_URL'),
  web: LINKS.app,
};

/** The visitor's own platform, so their download comes first. */
export function detect(): Platform {
  const ua = navigator.userAgent;
  const hint = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ?? '';
  if (/android/i.test(ua) || /android/i.test(hint)) return 'android';
  // iPadOS asks for the desktop site and says it is a Mac; its touch screen gives it away
  if (/iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) return 'ios';
  if (/mac/i.test(hint) || /macintosh|mac os x/i.test(ua)) return 'mac';
  if (/windows/i.test(hint) || /windows/i.test(ua)) return 'windows';
  return 'web';
}

export const ORDER: Platform[] = ['android', 'ios', 'windows', 'mac', 'web'];
