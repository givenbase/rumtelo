import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { CAPABILITIES, HouseholdPermissionSection } from '@rumtelo/contracts';

import { capabilityKeyForPathname } from './capability-access';
import { ROUTE_CAPABILITIES, routeAccessForPath } from './route-capabilities';

const HOUSEHOLD_DIR = join(
    dirname(fileURLToPath(import.meta.url)),
    '..',
    '(routes)',
    '[locale]',
    '(app)',
    '(household)'
);

/** `(household)/product/money/debt/update/[id]/page.tsx` → `/product/money/debt/update/x`. */
function urlForPageFile(file: string): string {
    const segments = relative(HOUSEHOLD_DIR, file)
        .split(sep)
        .slice(0, -1) // drop page.tsx
        .filter(segment => !(segment.startsWith('(') && segment.endsWith(')'))) // route groups
        .filter(segment => !segment.startsWith('@')) // parallel slots
        .map(segment => segment.replace(/^\(\.{1,3}\)+/, '')) // intercepting markers
        .map(segment => (segment.startsWith('[') ? 'x' : segment));
    return `/${segments.join('/')}`;
}

function pageFiles(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true, recursive: true })
        .filter(entry => entry.isFile() && entry.name === 'page.tsx')
        .map(entry => join(entry.parentPath, entry.name));
}

test('every page under /product resolves to a capability (no ungated route)', () => {
    const files = pageFiles(join(HOUSEHOLD_DIR, 'product'));
    assert.ok(files.length > 20, 'the page glob found the product routes');
    const ungated = files.map(urlForPageFile).filter(url => routeAccessForPath(url) === null);
    assert.deepEqual(ungated, []);
});

test('the home page is gated by homeOverview', () => {
    assert.equal(routeAccessForPath('/')?.capabilityKey, CAPABILITIES.homeOverview);
});

test('Debt, Net worth and Learn keep their gates without the nav', () => {
    assert.equal(capabilityKeyForPathname('/product/money/debt'), CAPABILITIES.moneyDebt);
    assert.equal(capabilityKeyForPathname('/product/money/debt/create'), CAPABILITIES.moneyDebt);
    assert.equal(capabilityKeyForPathname('/product/money/net-worth'), CAPABILITIES.growthNetWorth);
    assert.equal(capabilityKeyForPathname('/product/growth/learn'), CAPABILITIES.growthLearn);
    assert.equal(
        capabilityKeyForPathname('/product/growth/learn/library'),
        CAPABILITIES.growthLearn
    );
});

test('longest prefix wins: import is moneyImport, the Inbox stays moneySpending', () => {
    assert.equal(
        capabilityKeyForPathname('/product/money/transactions/import'),
        CAPABILITIES.moneyImport
    );
    assert.equal(
        capabilityKeyForPathname('/product/money/transactions'),
        CAPABILITIES.moneySpending
    );
    assert.equal(
        capabilityKeyForPathname('/product/money/transactions/create'),
        CAPABILITIES.moneySpending
    );
});

test('Course is gated by growthCourse and Growth goals by growthGoals', () => {
    assert.equal(capabilityKeyForPathname('/product/growth/course'), CAPABILITIES.growthCourse);
    assert.equal(
        capabilityKeyForPathname('/product/growth/course/2026-W47'),
        CAPABILITIES.growthCourse
    );
    assert.equal(capabilityKeyForPathname('/product/growth/goals'), CAPABILITIES.growthGoals);
});

test('Income keeps growthIncome and the Growth role section under Money and under the old path', () => {
    for (const path of ['/product/money/income', '/product/growth/income']) {
        const access = routeAccessForPath(`${path}/create`);
        assert.equal(access?.capabilityKey, CAPABILITIES.growthIncome);
        assert.equal(access?.section, HouseholdPermissionSection.GROWTH);
    }
});

test('Coach is the COACH section; Why stays HOME (a VIEWER may open it)', () => {
    assert.equal(routeAccessForPath('/product/coach')?.section, HouseholdPermissionSection.COACH);
    assert.equal(routeAccessForPath('/product/why')?.section, HouseholdPermissionSection.HOME);
});

test('a locale prefix and a query string do not change the match', () => {
    assert.equal(
        routeAccessForPath('/nl/product/money/debt?x=1')?.capabilityKey,
        CAPABILITIES.moneyDebt
    );
});

test('settings are not in the table (they gate themselves)', () => {
    assert.equal(routeAccessForPath('/settings/general/plan'), null);
});

test('every prefix is unique', () => {
    const prefixes = ROUTE_CAPABILITIES.map(entry => entry.prefix);
    assert.equal(new Set(prefixes).size, prefixes.length);
});

test('route access is plan and role only: a deferred page opens at any board stage', () => {
    // The ladder (CL-12) decides what the menu shows up front, never what may be opened.
    assert.equal(routeAccessForPath.length, 1);
    assert.ok(routeAccessForPath('/product/money/debt'));
    assert.ok(routeAccessForPath('/product/coach'));
});
