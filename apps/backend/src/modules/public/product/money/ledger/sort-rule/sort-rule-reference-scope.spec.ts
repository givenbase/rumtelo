import { describe, expect, it, vi } from 'vitest';

import {
    asOwnerOf,
    fakeHouseholdEm,
    HOUSEHOLD_A,
    notFound,
    type Row,
} from '../../fake-household-em.testing';
import { SortRule } from './sort-rule.entity';
import { SortRuleService } from './sort-rule.service';

/**
 * A rule points at a pot and a category the client names. Both must be this household's:
 * a foreign id is refused and the rule is neither created nor changed.
 */

function ruleRow(overrides: Partial<Row> = {}): Row {
    return {
        id: 'rule-a1',
        household: HOUSEHOLD_A,
        field: 'COUNTERPARTY',
        matcher: 'CONTAINS',
        matchValue: 'albert',
        jar: { id: 'jar-a-necessities' },
        category: null,
        priority: 100,
        isActive: true,
        hitCount: 0,
        ...overrides,
    };
}

function setup(rules: Row[] = []) {
    const em = fakeHouseholdEm();
    em.tables.set(SortRule, rules);
    const service = new SortRuleService(
        em as never,
        { listActive: vi.fn<() => Promise<never[]>>(async () => []) } as never
    );
    return { em, service };
}

const input = (overrides: Record<string, unknown>) => ({
    field: 'COUNTERPARTY',
    matcher: 'CONTAINS',
    matchValue: 'coffee',
    jarId: 'jar-a-play',
    ...overrides,
});

describe('SortRuleService.create', () => {
    it.each([
        ['jar', { jarId: 'jar-b-play' }, 'jar_not_found'],
        ['category', { categoryId: 'category-b' }, 'category_not_found'],
    ])('refuses a foreign %s and writes nothing', async (_label, ids, key) => {
        const { em, service } = setup();

        await expect(asOwnerOf(HOUSEHOLD_A, () => service.create(input(ids)))).rejects.toEqual(
            notFound(key)
        );

        expect(em.create).not.toHaveBeenCalled();
        expect(em.flush).not.toHaveBeenCalled();
        expect(em.getReference).not.toHaveBeenCalled();
    });

    it('creates a rule on the own pot and category', async () => {
        const { em, service } = setup();

        const rule = await asOwnerOf(HOUSEHOLD_A, () =>
            service.create(input({ categoryId: 'category-a-play' }))
        );

        expect(rule).toMatchObject({ jarId: 'jar-a-play', categoryId: 'category-a-play' });
        expect(em.flush).toHaveBeenCalled();
    });
});

describe('SortRuleService.update', () => {
    it.each([
        ['jar', { jarId: 'jar-b-play' }, 'jar_not_found'],
        ['category', { categoryId: 'category-b' }, 'category_not_found'],
    ])('refuses a foreign %s and leaves the rule as it was', async (_label, patch, key) => {
        const row = ruleRow();
        const { em, service } = setup([row]);

        await expect(
            asOwnerOf(HOUSEHOLD_A, () =>
                service.update(row.id, { matchValue: 'changed', ...patch })
            )
        ).rejects.toEqual(notFound(key));

        expect(row).toMatchObject({
            matchValue: 'albert',
            jar: { id: 'jar-a-necessities' },
            category: null,
        });
        expect(em.flush).not.toHaveBeenCalled();
    });

    it('moves the rule to the own pot and category', async () => {
        const row = ruleRow();
        const { service } = setup([row]);

        const rule = await asOwnerOf(HOUSEHOLD_A, () =>
            service.update(row.id, { jarId: 'jar-a-play', categoryId: 'category-a-play' })
        );

        expect(rule).toMatchObject({ jarId: 'jar-a-play', categoryId: 'category-a-play' });
    });
});

describe('SortRuleService.upsertPayeeHint', () => {
    const hint = (overrides: Record<string, unknown>) => ({
        field: 'COUNTERPARTY' as const,
        matchValue: 'albert',
        jarId: 'jar-a-play',
        explicit: true,
        ...overrides,
    });

    it('refuses a foreign pot on an existing payee rule and leaves it untouched', async () => {
        const row = ruleRow();
        const { em, service } = setup([row]);

        await expect(
            asOwnerOf(HOUSEHOLD_A, () => service.upsertPayeeHint(hint({ jarId: 'jar-b-play' })))
        ).rejects.toEqual(notFound('jar_not_found'));

        expect(row.jar).toEqual({ id: 'jar-a-necessities' });
        expect(em.flush).not.toHaveBeenCalled();
    });

    it('refuses a foreign pot when it would create the payee rule', async () => {
        const { em, service } = setup();

        await expect(
            asOwnerOf(HOUSEHOLD_A, () => service.upsertPayeeHint(hint({ jarId: 'jar-b-play' })))
        ).rejects.toEqual(notFound('jar_not_found'));

        expect(em.create).not.toHaveBeenCalled();
    });

    it('re-points an existing payee rule to the own pot', async () => {
        const row = ruleRow();
        const { service } = setup([row]);

        const rule = await asOwnerOf(HOUSEHOLD_A, () => service.upsertPayeeHint(hint({})));

        expect(rule).toMatchObject({ jarId: 'jar-a-play' });
    });
});

/**
 * A category is a line inside one pot: a rule that names a pot and a category of another pot
 * (own household) is refused with "pick another category". `category-a` sits in the Basics
 * main pot, `category-a-play` in Play.
 */
describe('SortRuleService refuses a category that belongs to another pot', () => {
    const badRequest = (key: string) =>
        expect.objectContaining({ response: expect.objectContaining({ message: key }) });

    it('create: writes nothing', async () => {
        const { em, service } = setup();

        await expect(
            asOwnerOf(HOUSEHOLD_A, () => service.create(input({ categoryId: 'category-a' })))
        ).rejects.toEqual(badRequest('category_not_found'));

        expect(em.create).not.toHaveBeenCalled();
        expect(em.flush).not.toHaveBeenCalled();
    });

    it("update: a new category must sit in the rule's current pot when the pot is not changed", async () => {
        const row = ruleRow();
        const { em, service } = setup([row]);

        await expect(
            asOwnerOf(HOUSEHOLD_A, () => service.update(row.id, { categoryId: 'category-a-play' }))
        ).rejects.toEqual(badRequest('category_not_found'));

        expect(row.category).toBeNull();
        expect(em.flush).not.toHaveBeenCalled();
    });

    it('update: moving the pot while keeping the old category is refused; clearing it works', async () => {
        const row = ruleRow({ category: { id: 'category-a' } });
        const { em, service } = setup([row]);

        await expect(
            asOwnerOf(HOUSEHOLD_A, () => service.update(row.id, { jarId: 'jar-a-play' }))
        ).rejects.toEqual(badRequest('category_not_found'));
        expect(row.jar).toEqual({ id: 'jar-a-necessities' });
        expect(em.flush).not.toHaveBeenCalled();

        const moved = await asOwnerOf(HOUSEHOLD_A, () =>
            service.update(row.id, { jarId: 'jar-a-play', categoryId: null })
        );
        expect(moved).toMatchObject({ jarId: 'jar-a-play', categoryId: null });
    });

    it('update: an edit that touches neither pot nor category is not re-judged', async () => {
        // A legacy rule whose category sits in another pot still saves a priority change.
        const row = ruleRow({ category: { id: 'category-a-play' } });
        const { service } = setup([row]);

        const rule = await asOwnerOf(HOUSEHOLD_A, () => service.update(row.id, { priority: 50 }));

        expect(rule).toMatchObject({ priority: 50, categoryId: 'category-a-play' });
    });

    it('upsertPayeeHint: refuses it for a new and for an existing payee rule', async () => {
        const hint = {
            field: 'COUNTERPARTY' as const,
            jarId: 'jar-a-play',
            categoryId: 'category-a',
            explicit: true,
        };
        const fresh = setup();
        await expect(
            asOwnerOf(HOUSEHOLD_A, () =>
                fresh.service.upsertPayeeHint({ ...hint, matchValue: 'coffee' })
            )
        ).rejects.toEqual(badRequest('category_not_found'));
        expect(fresh.em.create).not.toHaveBeenCalled();

        const row = ruleRow();
        const existing = setup([row]);
        await expect(
            asOwnerOf(HOUSEHOLD_A, () =>
                existing.service.upsertPayeeHint({ ...hint, matchValue: 'albert' })
            )
        ).rejects.toEqual(badRequest('category_not_found'));
        expect(row.jar).toEqual({ id: 'jar-a-necessities' });
        expect(existing.em.flush).not.toHaveBeenCalled();
    });
});
