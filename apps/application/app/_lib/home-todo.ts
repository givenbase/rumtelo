/**
 * Home's "To do" card, built from plain facts. Pure: no hooks, no I/O.
 * Row one is the next move (`resolveNextMove`); a few smaller rows follow in priority order,
 * never repeating what row one already says. Nothing left → the calm state.
 */
import { moneyPath } from './routes';
import {
    isWeekCheckDue,
    resolveNextMove,
    CLOSE_MONTH_WINDOW_DAYS,
    type NextMove,
    type NextMoveInput,
    type Weekday,
} from './next-move';

/** Smaller rows under the next move. Past this the card stops being a glance. */
export const MAX_TODO_ROWS = 3;
/** Bill names spelled out on the bills row; the rest stay in Fixed costs. */
export const MAX_TODO_BILL_NAMES = 2;

export type TodoFirst = Exclude<NextMove, { kind: 'CALM' }>;

export type TodoRow =
    | { kind: 'inbox'; count: number; href: string | null }
    | { kind: 'week_check'; href: string | null }
    | { kind: 'bills'; count: number; names: string[]; href: string | null }
    | { kind: 'close_month'; month: string; daysLeft: number }
    /** The top Coach tip. Its text and move come from the Coach line, not from here. */
    | { kind: 'coach' };

export type HomeTodoInput = NextMoveInput & {
    /** Writer (OWNER / MEMBER) and not a Practice preview. Others get text rows, no links. */
    canAct: boolean;
    /** Unpaid bills blocking this period's close; `null` when unknown. */
    closeBlockers: { dueBillCount: number; dueBillNames: readonly string[] } | null;
    /** A Coach tip is on screen (on, not hidden, has a move). */
    hasCoachTip: boolean;
};

export type HomeTodo = {
    /** The next move as the big first item; `null` when it is the calm state. */
    first: TodoFirst | null;
    rows: TodoRow[];
    /** Items shown: the first item plus the rows. */
    count: number;
    /** Nothing to do: show "All done for now". */
    isEmpty: boolean;
    /** Day of the next week check, for the calm line. */
    nextCheckDay: Weekday | null;
};

export function buildHomeTodo(input: HomeTodoInput): HomeTodo {
    const move = resolveNextMove(input);
    const first: TodoFirst | null = move.kind === 'CALM' ? null : move;
    const { canAct, monthScore, progress } = input;
    const link = (href: string) => (canAct ? href : null);
    const firstKind = first?.kind ?? null;

    const rows: TodoRow[] = [];

    // Sorting comes first; row one already covers it when it is the next move.
    if (input.inboxCount > 0 && firstKind !== 'INBOX' && firstKind !== 'NO_TRANSACTIONS') {
        rows.push({
            kind: 'inbox',
            count: input.inboxCount,
            href: link(moneyPath('transactions')),
        });
    }

    // The week check waits until everything is sorted, same as the next move.
    if (
        firstKind !== 'WEEK_CHECK' &&
        progress.hasTransactions &&
        input.inboxCount === 0 &&
        !progress.weekCheckDoneThisWeek &&
        isWeekCheckDue(input.today, input.reminderDay, input.weekCheckGraceOpen)
    ) {
        rows.push({ kind: 'week_check', href: link(moneyPath('week-check')) });
    }

    const bills = input.closeBlockers;
    if (bills && bills.dueBillCount > 0 && !monthScore.isClosed) {
        rows.push({
            kind: 'bills',
            count: bills.dueBillCount,
            names: bills.dueBillNames.slice(0, MAX_TODO_BILL_NAMES),
            href: link(moneyPath('fixed-costs')),
        });
    }

    // A later month cannot close before the earlier one, so it is not a second row then.
    if (
        firstKind !== 'CLOSE_MONTH' &&
        firstKind !== 'CLOSE_PRIOR' &&
        !monthScore.isClosed &&
        monthScore.daysLeft <= CLOSE_MONTH_WINDOW_DAYS
    ) {
        rows.push({ kind: 'close_month', month: monthScore.period, daysLeft: monthScore.daysLeft });
    }

    if (input.hasCoachTip) rows.push({ kind: 'coach' });

    const shown = rows.slice(0, MAX_TODO_ROWS);
    const count = shown.length + (first ? 1 : 0);
    const nextCheckDay = move.kind === 'CALM' ? move.nextCheckDay : null;
    return { first, rows: shown, count, isEmpty: count === 0, nextCheckDay };
}
