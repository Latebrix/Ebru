/**
 * Everything the page says about the sample team comes from the same engines the product runs.
 * Team Atlas is fictional.
 */
import { C, MEMBER_INK, type InkName } from '../brand/palette.ts';
import { tasks, team } from '../data/atlas.ts';
import { contributionReport, round1, type MemberContribution } from '../engine/fairproof.ts';
import { planRebalance } from '../engine/fairguard.ts';

export const report = contributionReport(team, tasks);
export const plan = planRebalance(team, tasks);

export const contributionOf = (id: string): MemberContribution => report.members.find((m) => m.member.id === id)!;

/** Short names for tight places; the full titles stay in the data. */
const SHORT: Record<string, string> = {
  'ATL-02': 'API architecture',
  'ATL-03': 'Event data model',
  'ATL-04': 'Twelve interviews',
  'ATL-05': 'University sign-in',
  'ATL-06': 'Mobile app scaffold',
  'ATL-07': 'Design system',
  'ATL-08': 'Web app shell',
  'ATL-09': 'Rooms API',
  'ATL-10': 'Campus map',
  'ATL-11': 'Booking prototype',
  'ATL-12': 'Booking flow',
  'ATL-13': 'CI pipeline',
  'ATL-14': 'Login screen',
  'ATL-15': 'Onboarding screens',
  'ATL-16': 'Accessibility pass',
  'ATL-17': 'Splash and icon',
  'ATL-18': 'Push service',
  'ATL-19': 'Settings screen',
  'ATL-20': 'Dark mode',
  'ATL-21': 'Offline timetable',
  'ATL-22': 'Form validation',
  'ATL-23': 'Push handling',
  'ATL-24': 'Seed data',
  'ATL-26': 'Event suggestions',
  'ATL-27': 'Payment API',
  'ATL-28': 'UI polish',
};

export const shortTitle = (id: string, fallback = '') => SHORT[id] ?? fallback;

export interface DropStory {
  ink: InkName;
  who: string;
  what: string;
  note: string;
  proven: boolean;
}

const byInk = new Map<number, DropStory[]>();
const open: DropStory[] = [];
for (const m of report.members) {
  const ink = MEMBER_INK[m.member.id];
  const stories: DropStory[] = [];
  for (const line of m.lines) {
    const story: DropStory = {
      ink: line.pending ? 'bone' : ink,
      who: m.member.first,
      what: shortTitle(line.taskId, line.title),
      note: line.pending ? 'claimed, no proof yet' : `${round1(line.verified)} points proven`,
      proven: !line.pending,
    };
    (line.pending ? open : stories).push(story);
  }
  byInk.set(C[ink], stories);
}
byInk.set(C.bone, open);

/** The story behind the n-th drop of a given ink, so every drop on screen answers for itself. */
export function dropStory(color: number, n: number): DropStory | null {
  const list = byInk.get(color);
  return list && list.length > 0 ? list[n % list.length] : null;
}

export { round1 };
