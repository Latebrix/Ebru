import { team } from '../../data/atlas.ts';
import { toDay, weekdayName } from '../../engine/calendar.ts';
import { alerts, forecast, type Alert } from '../../engine/fairguard.ts';
import type { Task } from '../../engine/types.ts';
import { people } from '../people.ts';

/** What one person carries on their hardest day; 1 is all that one person can carry. */
export interface Load {
  id: string;
  ratio: number;
}

export interface Week {
  loads: Load[];
  balance: number;
  worst: Alert | undefined;
}

export function weekOf(tasks: Task[]): Week {
  const f = forecast(team, tasks);
  return {
    loads: people.map((p) => ({ id: p.id, ratio: f.members.find((m) => m.member.id === p.id)!.peak.ratio })),
    balance: f.balance,
    worst: alerts(f)[0],
  };
}

export const isOpen = (t: Task) => t.status !== 'done' && t.status !== 'backlog';

/** Open work in the order in which it has to be ready. */
export function nextUp(tasks: Task[], who: string | null): Task[] {
  return tasks
    .filter((t) => isOpen(t) && (!who || t.assignees.some((a) => a.member === who)))
    .sort((a, b) => toDay(a.due) - toDay(b.due) || b.points - a.points || a.id.localeCompare(b.id));
}

export const shortTitle = (t: Task) => t.title.replace(' — ', ', ');
export const dayOf = (t: Task) => `${weekdayName(t.due, 'short')} ${Number(t.due.slice(8))}`;

/** How far a task is, in a word or two. */
export function stateOf(t: Task): string {
  if (t.status === 'review') return 'in review';
  if (t.status === 'doing') return `${Math.round((t.progress ?? 0) * 100)}% done`;
  return 'not started';
}

/** How a load feels, in a word or two. */
export function feel(ratio: number): string {
  if (ratio > 1) return `${Math.round((ratio - 1) * 100)}% too much`;
  if (ratio > 0.85) return 'a full week';
  if (ratio < 0.5) return 'has room';
  return 'all right';
}
