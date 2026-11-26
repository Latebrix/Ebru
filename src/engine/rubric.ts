/**
 * Rubric check: reads the criteria out of a brief, and finds the work on the board that answers
 * each of them. Only proven work counts; marks that people award on the day are never estimated.
 */
import { evidenceConfidence, proveTask } from './fairproof.ts';
import type { Task } from './types.ts';

export interface Criterion {
  id: string;
  name: string;
  marks: number;
  asks: string;
  /** People award these marks on the day, so nothing is estimated. */
  live: boolean;
  /** Words that connect this criterion to work on the board. */
  words: string[];
  /** A first task, for when the board has nothing at all. */
  start: string;
}

export interface Check {
  criterion: Criterion;
  /** Share of the marks that has evidence behind it, 0..1. */
  cover: number;
  found: { id: string; title: string; proven: number }[];
  missing: { id: string; title: string; why: string }[];
}

/** What a rubric calls something, what a board calls the same thing, and a first task for it. */
const FAMILY: [RegExp, string[], string][] = [
  [/existing|competitor|state of the art|literature|background/i, ['comparison', 'competitor', 'existing', 'literature', 'benchmark'], 'Compare three existing products'],
  [/problem|user|interview|needs?\b/i, ['interview', 'user research', 'usability', 'persona'], 'Interview five users'],
  [/apa|referenc|integrity|citation|sources/i, ['source', 'reference', 'citation', 'apa', 'disclosure'], 'List the sources in APA 7'],
  [/innovat|feasib|technical design|architecture|material|cost/i, ['architecture', 'api', 'service', 'data model', 'pipeline', 'engine'], 'Write down the design and its cost'],
  [/prototype|test|build|implement|function/i, ['prototype', 'flow', 'test', 'accessibility', 'screen', 'app scaffold', 'web app'], 'Test one core function'],
  [/present|teamwork|collab|pitch/i, ['pitch', 'demo', 'handoff', 'rehears'], 'Rehearse with everybody speaking'],
  [/design|interface|visual|usab/i, ['design', 'ui', 'screens', 'icon'], 'Design the main screen'],
  [/document|report|written/i, ['doc', 'report', 'guidelines', 'dictionary'], 'Start the report'],
];
const LIVE = /english|language|pronunciation|fluency|speaking|delivery|q ?& ?a/i;
const STOP = new Set(['and', 'the', 'for', 'with', 'from', 'that', 'this', 'are', 'was', 'marks', 'mark', 'points', 'point', 'total', 'criteria', 'criterion', 'least', 'clear', 'appropriate', 'demonstrable', 'correct', 'accurate', 'original', 'team', 'effective']);

export function makeCriterion(name: string, marks: number, asks = '', index = 0): Criterion {
  const own = name
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length > 3 && !STOP.has(w));
  const family = FAMILY.find(([re]) => re.test(name));
  return { id: `c${index}`, name, marks, asks, live: LIVE.test(name), words: family?.[1] ?? own, start: family?.[2] ?? `Start: ${name}` };
}

/** The rubric of this course's midterm: names and marks as the brief gives them. */
export const SAMPLE_RUBRIC = {
  name: 'Midterm rubric',
  sample: true,
  criteria: [
    makeCriterion('Problem and user research', 5, 'A clear problem, real users, and interviews or observations behind it.', 0),
    makeCriterion('Research on existing solutions', 3, 'What already exists, and the gap it leaves.', 1),
    makeCriterion('Innovation and feasibility', 5, 'A new idea that could really be built, with materials and cost.', 2),
    makeCriterion('Prototype and testing', 6, 'A working prototype, a test method, results and user feedback.', 3),
    makeCriterion('Technical English', 6, 'Clear, accurate technical English from every member.', 4),
    makeCriterion('Presentation and teamwork', 4, 'Everybody speaks, and the work was really shared.', 5),
    makeCriterion('APA 7 and academic integrity', 1, 'Sources in APA 7, and an honest note on how AI was used.', 6),
  ],
};

const mentions = (task: Task, words: string[]) => {
  const text = `${task.title} ${task.epic} ${task.description ?? ''} ${task.skills.join(' ')} ${task.evidence.map((e) => e.title).join(' ')}`.toLowerCase();
  return words.filter((w) => new RegExp(`\\b${w}`).test(text)).length;
};

/** Reads every criterion against the board: proven work counts, open work is what is missing. */
export function checkRubric(criteria: Criterion[], tasks: Task[]): Check[] {
  return criteria.map((criterion) => {
    if (criterion.live) return { criterion, cover: 0, found: [], missing: [] };
    const related = tasks
      .filter((t) => t.status !== 'backlog')
      .map((t) => ({ t, hits: mentions(t, criterion.words) }))
      .filter((x) => x.hits > 0)
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 7)
      .map((x) => x.t);
    const want = related.reduce((s, t) => s + t.points, 0);
    const have = related.reduce((s, t) => s + (t.status === 'done' ? proveTask(t).verified : 0), 0);
    const found = related
      .filter((t) => t.status === 'done' && proveTask(t).verified > 0)
      .map((t) => ({ id: t.id, title: t.title, proven: proveTask(t).verified }));
    const missing = related
      .filter((t) => t.status !== 'done' || proveTask(t).pending)
      .map((t) => ({
        id: t.id,
        title: t.title,
        why: t.status === 'done' ? 'done, but without proof' : evidenceConfidence(t) > 0 ? 'in progress, some proof already' : t.status === 'todo' ? 'not started' : 'in progress',
      }));
    return { criterion, cover: want > 0 ? Math.min(1, have / want) : 0, found, missing };
  });
}

interface Row {
  name: string;
  marks: number;
  asks: string;
}

const clean = (s: string) =>
  s
    .replace(/^[\d.)\-–•\s]+/, '')
    .replace(/[\s:–\-(|,/]+$/, '')
    .trim();

const sound = (name: string, marks: number) => name.length >= 4 && name.length <= 70 && /[a-z]{3}/i.test(name) && marks >= 1 && marks <= 60 && !/^(total|sum|page|slide|week|day|step)\b/i.test(name);

/** A header or a footer that comes back on every page is not part of the brief. */
function withoutRunners(lines: string[]): string[] {
  const key = (l: string) => l.replace(/[^a-z]+/gi, ' ').trim().toLowerCase();
  const seen = new Map<string, number>();
  for (const l of lines) seen.set(key(l), (seen.get(key(l)) ?? 0) + 1);
  return lines.filter((l) => key(l).length < 14 || (seen.get(key(l)) ?? 0) < 3);
}

const marksOf = (rows: Row[]) => rows.reduce((s, r) => s + r.marks, 0);

/** Rows of a real table: a name first, its marks last, and whatever is asked for in between. */
function tableRows(lines: string[]): Row[] {
  const heads = lines.map((l, i) => ({ l, i })).filter(({ l }) => /criteri|assess|rubric/i.test(l) && /marks?\b|points?\b|weight|score/i.test(l));
  let best: Row[] = [];
  let sure = false;
  for (const at of heads.length ? heads.map((h) => h.i) : [-1]) {
    const rows: Row[] = [];
    let adds = false;
    for (let i = at + 1; i < lines.length && rows.length < 12; i += 1) {
      if (/^total\b/i.test(lines[i])) {
        // Rows that add up to the sum the table states are certain.
        adds = rows.length > 1 && Number(/(\d{1,3})\D*$/.exec(lines[i])?.[1]) === marksOf(rows);
        break;
      }
      const cells = lines[i]
        .split('\t')
        .map((c) => c.trim())
        .filter(Boolean);
      const last = /^(\d{1,2})(?:\s*(?:marks?|points?|pts|%))?$/i.exec(cells[cells.length - 1] ?? '');
      const row = rows[rows.length - 1];
      if (cells.length >= 2 && last && sound(clean(cells[0]), Number(last[1]))) rows.push({ name: clean(cells[0]), marks: Number(last[1]), asks: cells.slice(1, -1).join(' ') });
      // The rest of a cell that needed a second line
      else if (row?.asks && cells.length > 0 && !last && lines[i].length < 130) row.asks += ` ${cells.join(' ')}`;
    }
    if ((adds && !sure) || (adds === sure && rows.length > best.length)) {
      best = rows;
      sure = adds;
    }
  }
  return best;
}

/** Plain lines: "Prototype and testing 6", "6 marks Prototype", or a name with its marks below it. */
function looseRows(lines: string[]): Row[] {
  const out: Row[] = [];
  for (let i = 0; i < lines.length && out.length < 12; i += 1) {
    const line = lines[i].replace(/\t/g, ' ');
    const after = /^(.*?)[\s:|–\-(]+(\d{1,2})(?:\s*(?:\/\s*\d+)?\s*(?:marks?|points?|pts|%)?\)?)$/i.exec(line);
    const before = /^(\d{1,2})\s*(?:marks?|points?|pts|%)\s+(.*)$/i.exec(line);
    if (after && sound(clean(after[1]), Number(after[2]))) out.push({ name: clean(after[1]), marks: Number(after[2]), asks: '' });
    else if (before && sound(clean(before[2]), Number(before[1]))) out.push({ name: clean(before[2]).slice(0, 70), marks: Number(before[1]), asks: '' });
    else if (/^\d{1,2}$/.test(line) && i > 0 && sound(clean(lines[i - 1]), Number(line)) && !out.some((o) => o.name === clean(lines[i - 1]))) out.push({ name: clean(lines[i - 1]), marks: Number(line), asks: '' });
  }
  return out;
}

/** Finds the criteria in the text of a rubric, or of a whole brief that has one inside. */
export function parseRubric(text: string): Criterion[] {
  const lines = text
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) =>
      l
        .replace(/[•·▪◦*]/g, ' ')
        .replace(/[^\S\t]+/g, ' ')
        .trim(),
    )
    .filter(Boolean);
  const own = withoutRunners(lines);
  const table = tableRows(own);
  const rows = table.length >= 2 ? table : looseRows(own);
  const seen = new Set<string>();
  return rows
    .filter((o) => {
      const key = o.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((o, i) => makeCriterion(o.name, o.marks, o.asks.slice(0, 220), i));
}
