import { isYearMonthBefore, parsePeriodKey, toPeriodKey, type YearMonth } from '@rumtelo/utils';

export type BoardPeriod = YearMonth;

function storageKey(householdId: string): string {
    return `rumtelo:board-period:${householdId}`;
}

/** Calendar month “now” — default when nothing is stored. */
export function currentBoardPeriod(date = new Date()): BoardPeriod {
    return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

let memory: { householdId: string; period: BoardPeriod } | null = null;

function readStored(householdId: string): BoardPeriod | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = sessionStorage.getItem(storageKey(householdId));
        if (!raw) return null;
        const parsed = parsePeriodKey(raw);
        if (
            !Number.isFinite(parsed.year) ||
            !Number.isFinite(parsed.month) ||
            parsed.month < 1 ||
            parsed.month > 12
        ) {
            return null;
        }
        return { year: parsed.year, month: parsed.month };
    } catch {
        return null;
    }
}

/**
 * Session-scoped board month for a household.
 * Survives Suspense remounts (in-memory) and soft reloads (sessionStorage).
 */
export function getBoardPeriod(householdId: string | null | undefined): BoardPeriod {
    if (!householdId) return currentBoardPeriod();
    if (memory?.householdId === householdId) return memory.period;
    const stored = readStored(householdId) ?? currentBoardPeriod();
    memory = { householdId, period: stored };
    return stored;
}

export function setBoardPeriod(householdId: string | null | undefined, period: BoardPeriod): void {
    if (!householdId) return;
    memory = { householdId, period };
    if (typeof window === 'undefined') return;
    try {
        sessionStorage.setItem(storageKey(householdId), toPeriodKey(period.year, period.month));
    } catch {
        /* private mode / quota — ignore */
    }
}

/** Clamp below the household travel floor; persists when adjusted. */
export function clampBoardPeriod(
    householdId: string | null | undefined,
    period: BoardPeriod,
    floor: BoardPeriod | null
): BoardPeriod {
    if (!floor || !isYearMonthBefore(period, floor)) return period;
    setBoardPeriod(householdId, floor);
    return floor;
}
