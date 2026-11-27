import assert from 'node:assert/strict';
import { test } from 'node:test';

import settings from '@rumtelo/i18n/translations/pages/settings';

import {
    ARCHIVE_WARNING_LINE_CAP,
    archiveRestoreErrorCopyKey,
    archiveWarningCopy,
    archiveWarningLines,
    capArchiveWarningLines,
    KNOWN_ARCHIVE_WARNINGS,
} from './archive-warning-copy';

const P = 'pages.settings.panels.import.warnings';

test('a known id maps to its own line', () => {
    assert.deepEqual(archiveWarningCopy('fixed_cost_jar_unmapped'), {
        key: `${P}.fixed_cost_jar_unmapped`,
        values: {},
    });
    assert.equal(archiveWarningCopy('goal_give_pot_missing').key, `${P}.goal_give_pot_missing`);
});

test('the bank id carries the bank name into the line', () => {
    assert.deepEqual(archiveWarningCopy('bank_unknown_key:ing'), {
        key: `${P}.bank_unknown_key`,
        values: { bank: 'ing' },
    });
    assert.equal(archiveWarningCopy('bank_unknown_key:').key, `${P}.bank_unknown`);
});

test('a long bank name is cut so one line cannot flood the panel', () => {
    const copy = archiveWarningCopy(`bank_unknown_key:${'x'.repeat(200)}`);
    assert.equal(copy.values.bank?.length, 40);
});

test('an id the app does not know falls back to the generic line', () => {
    assert.equal(archiveWarningCopy('something_new').key, `${P}.generic`);
    assert.equal(archiveWarningCopy('').key, `${P}.generic`);
});

test('lines are distinct and keep the order they arrived in', () => {
    const lines = archiveWarningLines([
        'b_new',
        'debts_skipped_plan',
        'a_new',
        'bank_unknown_key:x',
    ]);
    assert.deepEqual(
        lines.map(line => line.key),
        [`${P}.generic`, `${P}.debts_skipped_plan`, `${P}.bank_unknown_key`]
    );
});

test('every known id, the bank lines and the generic line have English copy', () => {
    const copy = settings.panels.import.warnings as Record<string, string>;
    const keys = [...KNOWN_ARCHIVE_WARNINGS, 'generic', 'bank_unknown_key', 'bank_unknown'];
    for (const key of keys) {
        assert.ok(copy[key], `missing pages.settings.panels.import.warnings.${key}`);
    }
});

test('hundreds of bank warnings are capped at ten lines plus a count', () => {
    const warnings = Array.from({ length: 300 }, (_, index) => `bank_unknown_key:bank-${index}`);
    const lines = archiveWarningLines(warnings);
    assert.equal(lines.length, 300);
    const { shown, hidden } = capArchiveWarningLines(lines);
    assert.equal(ARCHIVE_WARNING_LINE_CAP, 10);
    assert.equal(shown.length, 10);
    assert.equal(hidden, 290);
    assert.deepEqual(shown, lines.slice(0, 10));
});

test('ten lines or fewer are all shown with nothing hidden', () => {
    const lines = archiveWarningLines(
        Array.from({ length: 10 }, (_, index) => `bank_unknown_key:b${index}`)
    );
    assert.deepEqual(capArchiveWarningLines(lines), { shown: lines, hidden: 0 });
    assert.deepEqual(capArchiveWarningLines([]), { shown: [], hidden: 0 });
});

test('restore errors with a file-specific line map to the import copy, others do not', () => {
    for (const key of ['invalid_iban', 'due_month_required', 'settlement_account_invalid']) {
        const copyKey = archiveRestoreErrorCopyKey(key);
        assert.equal(copyKey, `pages.settings.panels.import.errors.${key}`);
        const errors = settings.panels.import.errors as Record<string, string>;
        assert.ok(errors[key], `EN copy for ${key}`);
    }
    assert.equal(archiveRestoreErrorCopyKey('category_not_found'), null);
    assert.equal(archiveRestoreErrorCopyKey(null), null);
});
