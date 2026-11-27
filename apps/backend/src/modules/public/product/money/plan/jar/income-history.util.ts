import type { Cadence } from '@rumtelo/contracts';
import type { IncomeSourceForNet } from '@rumtelo/utils';

/** One `money_income_source` row as the raw query returns it. */
export type IncomeSourceRow = {
    id: string;
    amount: string;
    cadence: Cadence;
    is_active: boolean;
    started_on: string | null;
    ends_on: string | null;
};

/** One `money_income_amount_period` row as the raw query returns it. */
export type IncomeAmountPeriodRow = {
    income_source_id: string;
    amount: string;
    effective_on: string;
};

/**
 * Raw income rows to the shape `monthlyNetAsOf` takes. The single mapping behind both
 * `JarService.monthlyNetIncome` (one date) and the pot history (every month), so the current
 * month is the same figure on both paths.
 */
export function toIncomeSources(
    sourceRows: readonly IncomeSourceRow[],
    periodRows: readonly IncomeAmountPeriodRow[]
): IncomeSourceForNet[] {
    const periodsBySource = new Map<string, { amount: number; effectiveOn: string }[]>();
    for (const row of periodRows) {
        const list = periodsBySource.get(row.income_source_id) ?? [];
        list.push({ amount: Number(row.amount), effectiveOn: row.effective_on });
        periodsBySource.set(row.income_source_id, list);
    }
    return sourceRows.map(row => ({
        amount: Number(row.amount),
        cadence: row.cadence,
        isActive: row.is_active,
        startedOn: row.started_on,
        endsOn: row.ends_on,
        periods: periodsBySource.get(row.id) ?? [],
    }));
}

/**
 * The months where the household's monthly net income can change: for every date on an income
 * source (start, end, an amount taking effect) the month of that date and the month after it.
 *
 * Net income is read as of the LAST day of a month, and every rule in `monthlyNetAsOf` compares
 * that day with one of these dates (`>= date` or `> date`). Such a comparison flips in the
 * date's own month, or one month later when the date is the month's last day, so these two
 * months cover every flip. Between two listed months the income is constant, which lets the
 * pot history evaluate a stretch of months once instead of once per month.
 */
export function incomeChangePeriods(sources: readonly IncomeSourceForNet[]): string[] {
    const periods = new Set<string>();
    const add = (date: string | null | undefined) => {
        if (!date || date.length < 7) return;
        const year = Number(date.slice(0, 4));
        const month = Number(date.slice(5, 7));
        if (!Number.isInteger(year) || !Number.isInteger(month)) return;
        periods.add(`${year}-${String(month).padStart(2, '0')}`);
        const next = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
        periods.add(`${next.year}-${String(next.month).padStart(2, '0')}`);
    };
    for (const source of sources) {
        add(source.startedOn);
        add(source.endsOn);
        for (const period of source.periods ?? []) add(period.effectiveOn);
    }
    return [...periods].sort();
}
