import { tasks } from '../../data/atlas.ts';
import { checkRubric, SAMPLE_RUBRIC } from '../../engine/rubric.ts';
import { plan } from '../data.ts';

/**
 * The real rubric of this midterm (30 marks), checked against the fictional Team Atlas by the same
 * engine the board uses. Marks that people award on the day are never estimated.
 */
export interface Criterion {
  id: string;
  name: string;
  marks: number;
  /** Marks awarded live by the examiners; nothing to check beforehand. */
  live: number;
  /** Share of the checkable marks that has evidence on the board. */
  cover: number;
  asks: string;
  found: string[];
  missing: string | null;
  /** The task that would close the gap, and how much of it. */
  task?: { title: string; gain: number };
}

const tidy = (title: string) => title.replace(' — ', ', ');

export const CRITERIA: Criterion[] = checkRubric(SAMPLE_RUBRIC.criteria, tasks).map(({ criterion: c, cover, found, missing }) => {
  const next = missing[0];
  const task = c.live ? undefined : next ? { title: tidy(next.title), gain: 1 - cover } : cover === 0 ? { title: c.start, gain: 1 } : undefined;
  return {
    id: c.id,
    name: c.name,
    marks: c.marks,
    live: c.live ? c.marks : 0,
    cover,
    asks: c.asks,
    found: found.slice(0, 4).map((f) => `${tidy(f.title)}, ${f.proven.toFixed(1)} points proven`),
    missing: c.live ? null : next ? `${tidy(next.title)}: ${next.why}.` : cover === 0 ? 'Nobody has started on this one.' : null,
    task,
  };
});

export const TOTAL = CRITERIA.reduce((s, c) => s + c.marks, 0);
export const LIVE = CRITERIA.reduce((s, c) => s + c.live, 0);
export const CHECKABLE = TOTAL - LIVE;

/** The teammate with the most room this week, straight from the forecast. */
const calm = [...plan.before.members].sort((a, b) => a.peak.ratio - b.peak.ratio)[0];
export const HELPER = { id: calm.member.id, first: calm.member.first, load: Math.round(calm.peak.ratio * 100) };
