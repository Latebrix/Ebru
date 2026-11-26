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

export interface Task {
  id: string;
  title: string;
  epic: string;
  skills: Skill[];
  status: TaskStatus;
  /** AI-estimated effort points (Fibonacci scale), calibrated by the team. */
  points: number;
  difficulty?: DifficultyFactor[];
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
