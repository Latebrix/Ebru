/**
 * FairGuard — predictive auto-rebalancing.
 *
 * Load model: for every working day D from today to the deadline,
 *   load(D) = remaining work due on or before D ÷ capacity available until D.
 * A load above 100% means at least one deadline up to D cannot be met at a
 * sustainable pace. A member's pressure is the peak of that curve.
 *
 * Team balance = 100 × (1 − coefficient of variation of members' peak loads).
 * 100 means everyone carries the same pressure relative to their capacity.
 *
 * The optimiser greedily searches single moves and 50/50 splits that respect
 * skills and locks, keeps only those that never create a new overload, and
 * stops as soon as the gain becomes marginal — the fewest moves that restore balance.
 */
import { toDay, toIso, weekdayName, workingDays } from './calendar.ts';
import type { Member, Task, Team } from './types.ts';

export const OVERLOAD = 1;
export const WARNING = 0.85;

export interface LoadPoint {
  day: string;
  demand: number;
  capacity: number;
  ratio: number;
}

export interface MemberForecast {
  member: Member;
  points: LoadPoint[];
  peak: LoadPoint;
  /** Open tasks whose due date falls on an overloaded day. */
  atRisk: string[];
  remaining: number;
}

export interface Forecast {
  members: MemberForecast[];
  balance: number;
  tasksAtRisk: number;
  days: string[];
}

export function remainingEffort(task: Task): number {
  if (task.status === 'done') return 0;
  const progress = task.progress ?? 0;
  return task.points * (1 - progress);
}

export function forecast(team: Team, tasks: Task[]): Forecast {
  const days = workingDays(team.today, team.deadline, team.weekend);
  const todayDay = toDay(team.today);
  const open = tasks.filter((t) => t.status !== 'done' && t.status !== 'backlog');

  const members = team.members.map((member) => {
    const owned = open
      .map((task) => ({ task, share: task.assignees.find((a) => a.member === member.id)?.share ?? 0 }))
      .filter((x) => x.share > 0);
    const points: LoadPoint[] = days.map((day, index) => {
      const demand = owned
        .filter(({ task }) => Math.max(toDay(task.due), todayDay) <= day)
        .reduce((total, { task, share }) => total + remainingEffort(task) * share, 0);
      const capacity = member.capacity * (index + 1);
      return { day: toIso(day), demand, capacity, ratio: demand / capacity };
    });
    const peak = points.reduce((best, p) => (p.ratio > best.ratio ? p : best), points[0]);
    // A task is at risk when the load on its own deadline exceeds capacity:
    // the work due by then cannot all be finished at a sustainable pace.
    const ratioOn = (dayNumber: number) => {
      const index = days.findIndex((d) => d >= dayNumber);
      return index === -1 ? points[points.length - 1].ratio : points[index].ratio;
    };
    const atRisk = owned
      .filter(({ task }) => ratioOn(Math.max(toDay(task.due), todayDay)) > OVERLOAD)
      .map(({ task }) => task.id);
    const remaining = owned.reduce((total, { task, share }) => total + remainingEffort(task) * share, 0);
    return { member, points, peak, atRisk, remaining } satisfies MemberForecast;
  });

  return {
    members,
    balance: balanceScore(members.map((m) => m.peak.ratio)),
    tasksAtRisk: new Set(members.flatMap((m) => m.atRisk)).size,
    days: days.map(toIso),
  };
}

export function balanceScore(loads: number[]): number {
  const mean = loads.reduce((a, b) => a + b, 0) / loads.length;
  if (mean === 0) return 100;
  const variance = loads.reduce((acc, l) => acc + (l - mean) ** 2, 0) / loads.length;
  const cv = Math.sqrt(variance) / mean;
  return Math.round(100 * Math.max(0, 1 - cv));
}

export interface Alert {
  member: Member;
  ratio: number;
  day: string;
  weekday: string;
  /** The least-loaded teammate, for context. */
  roomWith: Member;
  roomRatio: number;
}

export function alerts(f: Forecast): Alert[] {
  const calmest = [...f.members].sort((a, b) => a.peak.ratio - b.peak.ratio)[0];
  return f.members
    .filter((m) => m.peak.ratio > OVERLOAD)
    .sort((a, b) => b.peak.ratio - a.peak.ratio)
    .map((m) => ({
      member: m.member,
      ratio: m.peak.ratio,
      day: m.peak.day,
      weekday: weekdayName(m.peak.day),
      roomWith: calmest.member,
      roomRatio: calmest.peak.ratio,
    }));
}

export interface Suggestion {
  kind: 'move' | 'split';
  taskId: string;
  taskTitle: string;
  from: string;
  to: string;
  /** Share handed to `to` (1 for a move). */
  share: number;
  points: number;
  balanceBefore: number;
  balanceAfter: number;
  reasons: string[];
}

export interface Plan {
  before: Forecast;
  after: Forecast;
  suggestions: Suggestion[];
  tasks: Task[];
}

/** People approve every move, so there are few of them, and each has to be worth it. */
const MIN_GAIN = 3;
const MAX_MOVES = 3;

export function planRebalance(team: Team, tasks: Task[], { moves = MAX_MOVES, gain: least = MIN_GAIN, everybody = false } = {}): Plan {
  const before = forecast(team, tasks);
  let current = tasks;
  let currentForecast = before;
  const suggestions: Suggestion[] = [];

  for (let step = 0; step < moves; step += 1) {
    const ranked = [...currentForecast.members].sort((a, b) => b.peak.ratio - a.peak.ratio);
    const target = ranked[0];
    const anyOverload = ranked.some((m) => m.peak.ratio > OVERLOAD);

    let best: { suggestion: Suggestion; tasks: Task[]; forecast: Forecast } | null = null;
    // Usually only the busiest person is relieved; a first draft of a plan looks at everybody.
    const givers = everybody ? ranked : [target];
    for (const candidate of givers.flatMap((giver) => candidateMoves(team, current, giver))) {
      const nextTasks = applySuggestion(current, candidate);
      const next = forecast(team, nextTasks);
      const was = new Map(currentForecast.members.map((m) => [m.member.id, m.peak.ratio]));
      const createsOverload = next.members.some(
        (m) => m.member.id !== target.member.id && m.peak.ratio > OVERLOAD && m.peak.ratio > was.get(m.member.id)! + 1e-9,
      );
      if (createsOverload) continue;
      if (!best || next.balance > best.forecast.balance) {
        best = {
          suggestion: { ...candidate, balanceBefore: currentForecast.balance, balanceAfter: next.balance },
          tasks: nextTasks,
          forecast: next,
        };
      }
    }
    if (!best) break;
    const gain = best.forecast.balance - currentForecast.balance;
    if (gain < least && !anyOverload) break;
    best.suggestion.reasons = explainMove(team, best.suggestion, currentForecast, best.forecast);
    suggestions.push(best.suggestion);
    current = best.tasks;
    currentForecast = best.forecast;
  }

  return { before, after: currentForecast, suggestions, tasks: current };
}

export interface OwnerIdea {
  taskId: string;
  taskTitle: string;
  member: string;
  reasons: string[];
}

/** An owner for every open task that has none: somebody with the skills, and with the most room. */
export function planOwners(team: Team, tasks: Task[]): { ideas: OwnerIdea[]; tasks: Task[] } {
  const ideas: OwnerIdea[] = [];
  let current = tasks;
  // The heaviest task first, so the light ones can fill what is left.
  const orphans = tasks
    .filter((t) => t.status !== 'done' && t.status !== 'backlog' && t.assignees.length === 0)
    .sort((a, b) => b.points - a.points || a.due.localeCompare(b.due) || a.id.localeCompare(b.id));
  for (const task of orphans) {
    const able = team.members.filter((m) => task.skills.every((s) => m.skills.includes(s)));
    const before = forecast(team, current);
    const ranked = (able.length ? able : team.members)
      .map((member) => {
        const next = current.map((t) => (t.id === task.id ? { ...t, assignees: [{ member: member.id, share: 1 }] } : t));
        const f = forecast(team, next);
        return { member, next, peak: f.members.find((m) => m.member.id === member.id)!.peak.ratio, balance: f.balance };
      })
      .sort((a, b) => a.peak - b.peak || b.balance - a.balance);
    const best = ranked[0];
    const was = before.members.find((m) => m.member.id === best.member.id)!.peak.ratio;
    ideas.push({
      taskId: task.id,
      taskTitle: task.title,
      member: best.member.id,
      reasons: [able.length ? `${best.member.first} has the skills` : `Nobody has all the skills; ${best.member.first} has the most room`, `${pct(was)} to ${pct(best.peak)} peak load`],
    });
    current = best.next;
  }
  return { ideas, tasks: current };
}

function candidateMoves(team: Team, tasks: Task[], target: MemberForecast): Suggestion[] {
  const out: Suggestion[] = [];
  const owned = tasks.filter(
    (t) =>
      t.status !== 'done' &&
      t.status !== 'backlog' &&
      t.assignees.length === 1 &&
      t.assignees[0].member === target.member.id,
  );
  for (const task of owned) {
    for (const mate of team.members) {
      if (mate.id === target.member.id) continue;
      if (!task.skills.every((s) => mate.skills.includes(s))) continue;
      const base = {
        taskId: task.id,
        taskTitle: task.title,
        from: target.member.id,
        to: mate.id,
        points: task.points,
        balanceBefore: 0,
        balanceAfter: 0,
        reasons: [] as string[],
      };
      if (!task.locked && task.status === 'todo') out.push({ ...base, kind: 'move', share: 1 });
      if (task.points >= 3) out.push({ ...base, kind: 'split', share: 0.5 });
    }
  }
  return out;
}

export function applySuggestion(tasks: Task[], s: Suggestion): Task[] {
  return tasks.map((task) => {
    if (task.id !== s.taskId) return task;
    if (s.kind === 'move') return { ...task, assignees: [{ member: s.to, share: 1 }] };
    return {
      ...task,
      assignees: [
        { member: s.from, share: 1 - s.share },
        { member: s.to, share: s.share },
      ],
    };
  });
}

function explainMove(team: Team, s: Suggestion, before: Forecast, after: Forecast): string[] {
  const name = (id: string) => team.members.find((m) => m.id === id)?.first ?? id;
  const peakOf = (f: Forecast, id: string) => f.members.find((m) => m.member.id === id)!.peak.ratio;
  const task = s.taskTitle;
  const skill = s.kind === 'move' ? `${name(s.to)} has the skills for ${task}` : `${name(s.to)} can pair on ${task}`;
  return [
    skill,
    `${name(s.from)}: ${pct(peakOf(before, s.from))} → ${pct(peakOf(after, s.from))} peak load`,
    `${name(s.to)}: ${pct(peakOf(before, s.to))} → ${pct(peakOf(after, s.to))} peak load`,
  ];
}

export function pct(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}
