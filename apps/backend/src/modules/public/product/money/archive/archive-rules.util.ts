/**
 * Rules the services behind an archive restore enforce on a row, as pure functions, so the
 * dry run (which writes nothing) refuses exactly what the real run would. Each mirrors a
 * service rule and throws the same i18n key; the real run additionally sits in one
 * transaction (`ArchiveService.restore`), so anything this file cannot see still rolls back.
 */

import { AccountKind, Cadence } from '@rumtelo/contracts';
import { dueMonthMaxForCadence, normalizeDueMonth } from '@rumtelo/utils';

import { apiBadRequest } from '../../../../../common/errors/api-user-error';

/** `PartyService` stores names trimmed with inner whitespace collapsed; dedupe on the same form. */
export function normalizeArchiveName(value: string): string {
    return value.trim().replaceAll(/\s+/g, ' ');
}

/**
 * Mirrors `assertDueMonthForCadence` in `DebtService` / `FixedCostService`: a quarterly or
 * yearly row needs a due month that fits its cadence (an unusable value counts as missing).
 */
export function assertDueMonthFits(
    cadence: Cadence | undefined,
    dueMonth: number | null | undefined
): void {
    const effective = cadence ?? Cadence.MONTHLY;
    if (dueMonthMaxForCadence(effective) === null) return;
    if (normalizeDueMonth(dueMonth, effective) === null) throw apiBadRequest('due_month_required');
}

/**
 * Mirrors `BankAccountService.resolveSettlement`: a credit card settles from another
 * checking or savings account, never from itself.
 */
export function assertSettlementTarget(
    accountName: string,
    target: { name: string; kind: AccountKind }
): void {
    const isSelf = target.name.trim().toLowerCase() === accountName.trim().toLowerCase();
    const isSeat = target.kind === AccountKind.CHECKING || target.kind === AccountKind.SAVINGS;
    if (isSelf || !isSeat) throw apiBadRequest('settlement_account_invalid');
}
