/**
 * FairProof — evidence-based contribution.
 *
 * verified effort (task) = effort points × evidence confidence × execution factor
 * Verified Contribution Score (member) = Σ verified effort × the member's share of each task
 *
 * Every number carries its reasons so the UI can always answer "why this score?".
 */
import type { EvidenceKind, Member, Task, Team } from './types.ts';

/** How much each kind of artifact can prove on its own, before the AI relevance check. */
export const EVIDENCE_WEIGHT: Record<EvidenceKind, number> = {
  pull: 0.45,
  design: 0.5,
  doc: 0.4,
  commit: 0.35,
  test: 0.35,
  file: 0.3,
  review: 0.3,
  screenshot: 0.2,
  link: 0.15,
};

export const EVIDENCE_LABEL: Record<EvidenceKind, string> = {
  pull: 'Pull request',
  design: 'Design file',
  doc: 'Document',
  commit: 'Commit',
  test: 'Test run',
  file: 'File',
  review: 'Peer review',
  screenshot: 'Screenshot',
  link: 'Link',
};

/** Below this, a closed task is treated as "waiting for evidence" and earns nothing yet. */
export const PENDING_THRESHOLD = 0.3;

export function evidenceConfidence(task: Task): number {
  const raw = task.evidence.reduce((sum, e) => sum + EVIDENCE_WEIGHT[e.kind] * e.relevance, 0);
  return Math.min(1, raw);
}

export function executionFactor(task: Task): number {
  if (task.status !== 'done') return 0;
  if (task.execution.accepted) return 1;
  if (task.execution.reviewedBy) return 0.85;
  return 0.6;
}

export function executionLabel(task: Task): string {
  if (task.status !== 'done') return 'Not delivered yet';
  if (task.execution.accepted) return 'Delivered · accepted';
  if (task.execution.reviewedBy) return 'Delivered · reviewed';
  return 'Delivered · awaiting review';
}

export interface TaskProof {
  task: Task;
  confidence: number;
  execution: number;
  /** points × confidence × execution, before splitting between assignees */
  verified: number;
  pending: boolean;
}

export function proveTask(task: Task): TaskProof {
  const confidence = evidenceConfidence(task);
  const execution = executionFactor(task);
  const pending = task.status === 'done' && confidence < PENDING_THRESHOLD;
  const verified = pending ? 0 : task.points * confidence * execution;
  return { task, confidence, execution, verified, pending };
}

export interface ContributionLine {
  taskId: string;
  title: string;
  points: number;
  share: number;
  claimed: number;
  verified: number;
  confidence: number;
  execution: number;
  pending: boolean;
}

export interface MemberContribution {
  member: Member;
  tasksClosed: number;
  claimed: number;
  /** Verified Contribution Score in verified effort points. */
  vcs: number;
  /** Share of the team's verified work (0..1). */
  share: number;
  /** Share of the team's claimed (unverified) points. */
  claimedShare: number;
  fairShare: number;
  /** Points-weighted evidence confidence of this member's closed work. */
  confidence: number;
  pendingTasks: number;
  lines: ContributionLine[];
}

export interface ContributionReport {
  members: MemberContribution[];
  totalVerified: number;
  totalClaimed: number;
  tasksClosed: number;
}

export function contributionReport(team: Team, tasks: Task[]): ContributionReport {
  const proofs = tasks.filter((t) => t.status === 'done').map(proveTask);
  const byMember = team.members.map((member) => {
    const lines: ContributionLine[] = [];
    for (const proof of proofs) {
      const assignment = proof.task.assignees.find((a) => a.member === member.id);
      if (!assignment) continue;
      lines.push({
        taskId: proof.task.id,
        title: proof.task.title,
        points: proof.task.points,
        share: assignment.share,
        claimed: proof.task.points * assignment.share,
        verified: proof.verified * assignment.share,
        confidence: proof.confidence,
        execution: proof.execution,
        pending: proof.pending,
      });
    }
    lines.sort((a, b) => b.verified - a.verified);
    const claimed = sum(lines.map((l) => l.claimed));
    const vcs = sum(lines.map((l) => l.verified));
    const weighted = sum(lines.map((l) => l.claimed * l.confidence));
    return {
      member,
      tasksClosed: lines.length,
      claimed,
      vcs,
      share: 0,
      claimedShare: 0,
      fairShare: 1 / team.members.length,
      confidence: claimed > 0 ? weighted / claimed : 0,
      pendingTasks: lines.filter((l) => l.pending).length,
      lines,
    } satisfies MemberContribution;
  });
  const totalVerified = sum(byMember.map((m) => m.vcs));
  const totalClaimed = sum(byMember.map((m) => m.claimed));
  for (const m of byMember) {
    m.share = totalVerified > 0 ? m.vcs / totalVerified : 0;
    m.claimedShare = totalClaimed > 0 ? m.claimed / totalClaimed : 0;
  }
  return { members: byMember, totalVerified, totalClaimed, tasksClosed: proofs.length };
}

/** Human-readable reasons behind a member's score, strongest first. */
export function explainContribution(c: MemberContribution): string[] {
  const reasons: string[] = [];
  const top = c.lines.filter((l) => !l.pending).slice(0, 2);
  for (const l of top) {
    reasons.push(`${l.title}: ${round1(l.verified)} verified pts of ${round1(l.claimed)} claimed`);
  }
  if (c.pendingTasks > 0) {
    reasons.push(
      `${c.pendingTasks} closed ${c.pendingTasks === 1 ? 'task has' : 'tasks have'} no evidence yet — not counted until verified`,
    );
  }
  const weak = c.lines.filter((l) => !l.pending && l.confidence < 0.6);
  if (weak.length > 0) {
    reasons.push(`${weak.length} ${weak.length === 1 ? 'task is' : 'tasks are'} only partly proven (confidence under 60%)`);
  }
  if (c.confidence >= 0.9 && c.pendingTasks === 0) reasons.push('Every closed task is fully proven');
  return reasons;
}

function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
