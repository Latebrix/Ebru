/**
 * The student survey, word for word. One source for the page that asks (ebru.ink/survey) and for the
 * slides and reports that count the answers (copied to the Presentation repo by `npm run sync`).
 * Keys match the columns of the Appwrite table research/survey; change them only together.
 */

/** Raised whenever a question or an option changes, so old and new answers are never mixed up. */
export const SURVEY_VERSION = 1;

export interface Choice {
  key: string;
  label: string;
}

interface Base {
  /** The column this answer is saved in. */
  id: string;
  /** The number the student sees. */
  n: number;
  ask: string;
  /** The question can be left out. */
  optional?: boolean;
}

export interface OneQuestion extends Base {
  kind: 'one';
  choices: Choice[];
}

export interface ManyQuestion extends Base {
  kind: 'many';
  choices: Choice[];
  /** A choice that cannot be combined with the others ("None of these"). */
  alone?: string;
  /** A choice that opens a short text field, saved in `${id}_other`. */
  other?: string;
}

export interface ScaleQuestion extends Base {
  kind: 'scale';
  low: string;
  high: string;
}

export interface TextQuestion extends Base {
  kind: 'text';
  /** Most letters the column keeps. */
  max: number;
}

export type Question = OneQuestion | ManyQuestion | ScaleQuestion | TextQuestion;

export const INTRO = {
  title: 'Group projects: how is the work shared?',
  lines: [
    'We are Foundation Year Engineering students at NOVA University Lisbon (Cairo Branch). This survey is part of our Technical English project.',
    'It takes about 3 minutes and it is anonymous: please do not write any names.',
    'Taking part is voluntary and has no effect on any grade. We will use the answers only for this project.',
  ],
  consent: 'Do you agree to take part?',
};

/** Shown before the questions about the most recent project. */
export const PROJECT_FRAME = 'Your most recent group project with 3 or more students';

/** Shown before question 10, so every student judges the same idea. */
export const IDEA =
  'ebru is a shared board for group projects. It shows each member’s tasks and hours, keeps proof of finished work, and warns the team early when one person has too much work.';

export const PART_A: Question[] = [
  {
    id: 'programme',
    n: 1,
    kind: 'one',
    ask: 'Which programme are you in?',
    choices: [
      { key: 'foundation-engineering', label: 'Foundation Year Engineering' },
      { key: 'foundation-other', label: 'Another Foundation Year programme' },
      { key: 'year-one-plus', label: 'Year 1 or above' },
    ],
  },
  {
    id: 'projects',
    n: 2,
    kind: 'one',
    ask: 'Since September 2026, how many university group projects with 3 or more students have you worked on?',
    choices: [
      { key: 'none', label: '0' },
      { key: 'one', label: '1' },
      { key: 'two-three', label: '2 or 3' },
      { key: 'four-plus', label: '4 or more' },
    ],
  },
];

export const PART_B: Question[] = [
  {
    id: 'team_size',
    n: 3,
    kind: 'one',
    ask: 'How many students were in that team?',
    choices: [
      { key: 'three', label: '3' },
      { key: 'four', label: '4' },
      { key: 'five', label: '5' },
      { key: 'six-plus', label: '6 or more' },
    ],
  },
  {
    id: 'share',
    n: 4,
    kind: 'one',
    ask: 'Which sentence best describes how the work was shared?',
    choices: [
      { key: 'equal', label: 'Everybody did about the same amount.' },
      { key: 'one-two-less', label: 'Most did their part, but one or two did less.' },
      { key: 'one-two-most', label: 'One or two people did most of the work.' },
      { key: 'one-almost-all', label: 'One person did almost all of the work.' },
    ],
  },
  {
    id: 'noticed',
    n: 5,
    kind: 'one',
    ask: 'When did your team first notice that the work was not shared evenly?',
    choices: [
      { key: 'first-week', label: 'In the first week of the project' },
      { key: 'middle', label: 'In the middle of the project' },
      { key: 'last-three-days', label: 'In the last 3 days before the deadline' },
      { key: 'after-submit', label: 'After we submitted the work' },
      { key: 'even', label: 'The work was shared evenly' },
    ],
  },
  {
    id: 'clarity',
    n: 6,
    kind: 'scale',
    ask: 'How clearly could you see who was working on which task?',
    low: 'Not clear at all',
    high: 'Very clear',
  },
  {
    id: 'tools',
    n: 7,
    kind: 'many',
    ask: 'What did your team use to plan and track tasks?',
    alone: 'nothing',
    other: 'other',
    choices: [
      { key: 'chat', label: 'A chat group (for example, WhatsApp)' },
      { key: 'document', label: 'A shared document (for example, Google Docs)' },
      { key: 'spreadsheet', label: 'A spreadsheet (for example, Google Sheets or Excel)' },
      { key: 'task-board', label: 'A task board (for example, Trello or Notion)' },
      { key: 'nothing', label: 'Nothing: we did not plan the tasks' },
      { key: 'other', label: 'Other' },
    ],
  },
  {
    id: 'problems',
    n: 8,
    kind: 'many',
    ask: 'Which of these happened in that project?',
    alone: 'none',
    choices: [
      { key: 'owner-unclear', label: 'Nobody was sure who owned a task.' },
      { key: 'forgotten', label: 'A task was forgotten until the last days.' },
      { key: 'overloaded', label: 'One member had much more work than the others.' },
      { key: 'messages-lost', label: 'Important messages were lost in the chat.' },
      { key: 'late', label: 'A member delivered their part late.' },
      { key: 'disagreed', label: 'The team disagreed about who did what.' },
      { key: 'none', label: 'None of these' },
    ],
  },
  {
    id: 'satisfaction',
    n: 9,
    kind: 'scale',
    ask: 'How satisfied were you with the way the work was shared?',
    low: 'Not satisfied at all',
    high: 'Very satisfied',
  },
];

export const PART_C: Question[] = [
  {
    id: 'useful',
    n: 10,
    kind: 'scale',
    ask: 'How useful would this board be for your next group project?',
    low: 'Not useful at all',
    high: 'Very useful',
  },
  {
    id: 'feature',
    n: 11,
    kind: 'one',
    ask: 'Which feature would help your team most?',
    choices: [
      { key: 'hours', label: 'Seeing each member’s workload in hours' },
      { key: 'warning', label: 'An early warning when one member has too much work' },
      { key: 'proof', label: 'Proof attached to every finished task' },
      { key: 'rubric', label: 'A check of our work against the marking rubric' },
      { key: 'fair-split', label: 'A suggestion for a fairer way to share the tasks' },
    ],
  },
  {
    id: 'would_use',
    n: 12,
    kind: 'one',
    ask: 'Would you use it in your next group project?',
    choices: [
      { key: 'yes', label: 'Yes' },
      { key: 'maybe', label: 'Maybe' },
      { key: 'no', label: 'No' },
    ],
  },
  {
    id: 'comment',
    n: 13,
    kind: 'text',
    optional: true,
    max: 400,
    ask: 'In one or two sentences, what should a tool like this do to make group work easier for you?',
  },
];

export const QUESTIONS: Question[] = [...PART_A, ...PART_B, ...PART_C];
export const LAST = QUESTIONS.length;

/** The label a student saw for a saved key. */
export function labelOf(id: string, key: string): string {
  const q = QUESTIONS.find((x) => x.id === id);
  if (!q || (q.kind !== 'one' && q.kind !== 'many')) return key;
  return q.choices.find((c) => c.key === key)?.label ?? key;
}
