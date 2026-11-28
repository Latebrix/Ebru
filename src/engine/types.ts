/**
 * Domain model shared by the product prototype, the presentation and the
 * FairProof / FairGuard engines. Plain data only: no framework types here.
 */

export type Skill =
  | 'design'
  | 'research'
  | 'frontend'
  | 'backend'
  | 'mobile'
  | 'data'
  | 'qa'
  | 'devops';

export interface Member {
  id: string;
  name: string;
  first: string;
  role: string;
  skills: Skill[];
  /** Sustainable effort points per working day, learned from past velocity. */
  capacity: number;
  /** Identity colour used for charts and avatars (CSS colour). */
  color: string;
  /** Soft tint used for cards and highlights. */
  tint: string;
  /** Public path of the portrait, if one exists. */
  avatar?: string;
}

export type TaskStatus = 'backlog' | 'todo' | 'doing' | 'review' | 'done';

export type EvidenceKind =
  | 'commit'
  | 'pull'
  | 'design'
  | 'doc'
  | 'file'
  | 'screenshot'
  | 'link'
  | 'review'
  | 'test';

export interface Evidence {
  id: string;
  kind: EvidenceKind;
  title: string;
  /** Where it came from, e.g. GitHub, Figma, Drive, Upload. */
  source: string;
  author: string;
  at: string;
  /** 0..1 — how well the artifact matches what the task asked for (AI check). */
  relevance: number;
  /**
   * What Kalem saw when it read the proof (real projects only): 'reading' until it has, or why it did not read it (Kalem
   * is off for the project, its author has no AI, or reading failed).
   */
  seen?: EvidenceSeen | 'reading' | { unread: 'kalem_off' | 'ai_off' | 'failed' };
  /** The stored file, for a real project's upload (opens in a new tab). */
  file?: string;
  /** The link, for proof that is a link. */
  url?: string;
}

export interface EvidenceSeen {
  summary: string;
  shows: string[];
  missing: string[];
  /** How Kalem read it: image, file, text, link (only the words about it) or none. */
  how: 'image' | 'file' | 'text' | 'link' | 'none';
}

export interface Assignment {
  member: string;
  /** Fraction of the task owned by this member (all shares sum to 1). */
  share: number;
}

export interface Execution {
  reviewedBy?: string;
  merged?: boolean;
  accepted?: boolean;
}

export interface DifficultyFactor {
  label: string;
  /** Contribution in points to the estimate. */
  value: number;
}

/** Kalem's estimate of a task in a real project: difficulty apart from effort, the hours it means, and why. */
export interface TaskEstimate {
  /** 1 routine … 5 very hard. */
  difficulty: number;
  /** Focused hours for one student, low and high. */
  hours: [number, number];
  confidence: 'low' | 'medium' | 'high';
  why: string;
  /** How to split it, for 8 points or more. */
  split?: string;
}

export interface Task {
  id: string;
  title: string;
  epic: string;
  skills: Skill[];
  status: TaskStatus;
  /** AI-estimated effort points (Fibonacci scale), calibrated by the team. */
  points: number;
  difficulty?: DifficultyFactor[];
  /**
   * Kalem's estimate (real projects): the estimate, or that Kalem is still estimating, could not (failed), or did not
   * because Kalem or the AI is off for whoever made the task (off).
   */
  estimate?: TaskEstimate | 'estimating' | 'failed' | 'off';
  /** Who made the task (real projects): they may give it to someone while nobody owns it. */
  createdBy?: string;
  /** What the teammate who checked the work asked to change, when they sent it back. */
  reviewNote?: string;
  assignees: Assignment[];
  /** ISO date (YYYY-MM-DD). */
  due: string;
  /** Work cannot start before this ISO date. */
  start?: string;
  completedAt?: string;
  /** 0..1 progress for work in flight. */
  progress?: number;
  evidence: Evidence[];
  execution: Execution;
  /** In-flight work FairGuard may split but never move. */
  locked?: boolean;
  dependsOn?: string[];
  description?: string;
}

export interface Team {
  id: string;
  name: string;
  project: string;
  members: Member[];
  /** ISO date treated as "today" by the demo. */
  today: string;
  /** Final project deadline (ISO date). */
  deadline: string;
  /** Week days off, 0 = Sunday. */
  weekend: number[];
}
