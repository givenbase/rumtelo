import type { ArchiveRestoreResult } from '@rumtelo/contracts';

/** One entry of `ArchiveRestoreResult.warnings` (the contract types it as a plain string). */
export type ArchiveWarning = ArchiveRestoreResult['warnings'][number];

const COPY_PREFIX = 'pages.settings.panels.import.warnings';

/**
 * Warning ids the archive restore returns today (`archive.service.ts`). The backend can add
 * ids later; anything not listed here renders the generic line instead of a raw id.
 */
export const KNOWN_ARCHIVE_WARNINGS: ReadonlySet<string> = new Set([
    'jar_split_incomplete',
    'jar_split_not_100',
    'account_reconnect_needed',
    'settlement_account_missing',
    'asset_link_unmapped',
    'debts_skipped_plan',
    'fixed_cost_jar_unmapped',
    'goals_skipped_plan',
    'goals_limit_reached',
    'goal_give_pot_missing',
    'household_settings_skipped_role',
    'personal_direction_skipped',
]);

/** `bank_unknown_key:<bank key>` carries the bank the file named. */
const BANK_UNKNOWN_PREFIX = 'bank_unknown_key:';
const BANK_NAME_MAX = 40;

export type ArchiveWarningCopy = {
    /** Translation key under `pages.settings.panels.import.warnings`. */
    key: string;
    /** ICU values for that key. */
    values: Record<string, string>;
};

/** Maps a restore warning to its copy key; unknown ids fall back to the generic line. */
export function archiveWarningCopy(warning: ArchiveWarning): ArchiveWarningCopy {
    if (warning.startsWith(BANK_UNKNOWN_PREFIX)) {
        const bank = warning.slice(BANK_UNKNOWN_PREFIX.length).trim().slice(0, BANK_NAME_MAX);
        return bank
            ? { key: `${COPY_PREFIX}.bank_unknown_key`, values: { bank } }
            : { key: `${COPY_PREFIX}.bank_unknown`, values: {} };
    }
    if (KNOWN_ARCHIVE_WARNINGS.has(warning)) {
        return { key: `${COPY_PREFIX}.${warning}`, values: {} };
    }
    return { key: `${COPY_PREFIX}.generic`, values: {} };
}

/** Distinct copy keys in first-seen order, so two unknown ids show the generic line once. */
export function archiveWarningLines(warnings: readonly ArchiveWarning[]): ArchiveWarningCopy[] {
    const seen = new Set<string>();
    const lines: ArchiveWarningCopy[] = [];
    for (const warning of warnings) {
        const copy = archiveWarningCopy(warning);
        const identity = `${copy.key}|${JSON.stringify(copy.values)}`;
        if (seen.has(identity)) continue;
        seen.add(identity);
        lines.push(copy);
    }
    return lines;
}

/** Most warning lines the panel prints; a crafted file can name hundreds of banks. */
export const ARCHIVE_WARNING_LINE_CAP = 10;

/** The first `max` lines, and how many were left out (shown as one "and N more" line). */
export function capArchiveWarningLines(
    lines: readonly ArchiveWarningCopy[],
    max: number = ARCHIVE_WARNING_LINE_CAP
): { shown: ArchiveWarningCopy[]; hidden: number } {
    return { shown: lines.slice(0, max), hidden: Math.max(0, lines.length - max) };
}

const RESTORE_ERROR_PREFIX = 'pages.settings.panels.import.errors';

/**
 * API errors the restore can throw whose standard copy points at a form this screen does not
 * have ("pick a month", "choose an account"). Here they get a line about the file instead.
 */
const RESTORE_ERROR_KEYS = new Set([
    'invalid_iban',
    'due_month_required',
    'settlement_account_invalid',
]);

/** Import-screen copy key for an API error key, or null to use the standard message. */
export function archiveRestoreErrorCopyKey(apiErrorKey: string | null): string | null {
    return apiErrorKey && RESTORE_ERROR_KEYS.has(apiErrorKey)
        ? `${RESTORE_ERROR_PREFIX}.${apiErrorKey}`
        : null;
}
