import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    ArchiveAccountSettings,
    Locale,
    SpendingStyle,
    Theme,
    WorkSituation,
    YearIntention,
    type AccountSettings,
} from '@rumtelo/contracts';

import { archivePayloadFromCsvSheets } from './archive-from-csv-zip';
import {
    buildExportSheets,
    portableAccountSettings,
    type HouseholdExportBundle,
} from './household-export';

const ANSWERED = {
    locale: Locale.NL,
    theme: Theme.DARK,
    spendingStyle: SpendingStyle.SAVER,
    workSituation: WorkSituation.SELF_EMPLOYED,
    yearIntention: YearIntention.BUILD,
    direction: 'A calm home, debt-free.',
    directionWhy: 'Peace of mind.',
} as AccountSettings;

test('the export carries the work situation, year intention and direction of the person', () => {
    const portable = portableAccountSettings(ANSWERED);
    assert.equal(portable.workSituation, WorkSituation.SELF_EMPLOYED);
    assert.equal(portable.yearIntention, YearIntention.BUILD);
    assert.equal(portable.direction, 'A calm home, debt-free.');
    assert.equal(portable.directionWhy, 'Peace of mind.');
    // Still a valid archive block, so the same file can be restored.
    assert.deepEqual(ArchiveAccountSettings.parse(portable), portable);
});

test('an unanswered person exports explicit nulls, and the block stays valid', () => {
    const portable = portableAccountSettings({
        ...ANSWERED,
        workSituation: null,
        yearIntention: null,
        direction: null,
        directionWhy: null,
    });
    assert.equal(portable.workSituation, null);
    assert.equal(portable.direction, null);
    assert.deepEqual(ArchiveAccountSettings.parse(portable), portable);
});

function bundleWith(accountSettings: HouseholdExportBundle['accountSettings']) {
    return {
        accountSettings,
        settings: {},
        access: { includeDebts: false, includeGoals: false },
        assets: [],
        income: [],
        parties: [],
        accounts: [],
        fixedCosts: [],
        debts: [],
        goals: [],
        rules: [],
        transactions: [],
        jars: [],
    } as unknown as HouseholdExportBundle;
}

test('the Account settings sheet lists the new columns, empty when unanswered', () => {
    const sheet = (settings: AccountSettings) =>
        buildExportSheets(bundleWith(portableAccountSettings(settings))).find(
            row => row.name === 'Account settings'
        )?.rows[0];
    assert.deepEqual(sheet(ANSWERED), {
        locale: Locale.NL,
        theme: Theme.DARK,
        spendingStyle: SpendingStyle.SAVER,
        workSituation: WorkSituation.SELF_EMPLOYED,
        yearIntention: YearIntention.BUILD,
        direction: 'A calm home, debt-free.',
        directionWhy: 'Peace of mind.',
    });
    const empty = sheet({
        ...ANSWERED,
        workSituation: null,
        yearIntention: null,
        direction: null,
        directionWhy: null,
    });
    assert.equal(empty?.workSituation, '');
    assert.equal(empty?.direction, '');
});

test('the CSV zip round-trips the new columns back into an archive payload', () => {
    const sheet = buildExportSheets(bundleWith(portableAccountSettings(ANSWERED))).find(
        row => row.name === 'Account settings'
    )!.rows[0]!;
    const header = Object.keys(sheet).join(',');
    const line = Object.values(sheet)
        .map(value => `"${String(value)}"`)
        .join(',');
    const payload = archivePayloadFromCsvSheets(
        new Map([['account-settings.csv', `${header}\n${line}`]])
    );
    assert.equal(payload.accountSettings?.workSituation, WorkSituation.SELF_EMPLOYED);
    assert.equal(payload.accountSettings?.yearIntention, YearIntention.BUILD);
    assert.equal(payload.accountSettings?.direction, 'A calm home, debt-free.');
    assert.equal(payload.accountSettings?.directionWhy, 'Peace of mind.');
});
