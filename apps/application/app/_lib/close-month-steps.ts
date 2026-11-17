/**
 * Close-month flow: which step applies to a month (G-1).
 *
 * The server enforces every rule (`monthScore.close` rejects out-of-order closes, a
 * non-empty Inbox and undecided bills). This resolver only decides what the sheet says
 * and offers first, in the order a person must act: earlier month, then Inbox, then bills.
 */
import type { MonthCloseDueBill, MonthScore } from '@rumtelo/contracts';

export type CloseStep =
    | { kind: 'ALREADY_CLOSED' }
    | { kind: 'PRIOR_FIRST'; prior: string }
    | { kind: 'INBOX_FIRST'; count: number }
    | { kind: 'BILLS'; bills: MonthCloseDueBill[] }
    | { kind: 'CONFIRM' };

export function resolveCloseStep(
    score: Pick<MonthScore, 'isClosed' | 'priorOpenPeriod' | 'closeBlockers'>
): CloseStep {
    if (score.isClosed) return { kind: 'ALREADY_CLOSED' };
    if (score.priorOpenPeriod) return { kind: 'PRIOR_FIRST', prior: score.priorOpenPeriod };
    const blockers = score.closeBlockers;
    if (blockers && blockers.inboxCount > 0) {
        return { kind: 'INBOX_FIRST', count: blockers.inboxCount };
    }
    if (blockers && blockers.dueBills.length > 0) {
        return { kind: 'BILLS', bills: blockers.dueBills };
    }
    return { kind: 'CONFIRM' };
}
