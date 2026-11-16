import { describe, expect, it } from 'vitest';

import { GoalKind, GoalStatus, JarKey, type Goal as GoalDto } from '@rumtelo/contracts';

import { toGoalSummary, unlinkedGoals } from './course-goal-summary.util';

function goal(partial: Partial<GoalDto>): GoalDto {
    return {
        id: 'goal-1',
        householdId: 'household-1',
        kind: GoalKind.SAVE,
        jarId: 'jar-1',
        name: 'Emergency fund',
        icon: null,
        target: 500_000,
        saved: 120_000,
        monthlyContribution: 25_000,
        targetOn: null,
        status: GoalStatus.ACTIVE,
        why: null,
        cause: null,
        givingOrganizationKey: null,
        fulfilledOn: null,
        sortOrder: 0,
        ...partial,
    };
}

describe('toGoalSummary', () => {
    it('adds the jar and the landing date', () => {
        const summary = toGoalSummary(
            goal({}),
            { id: 'jar-1', key: JarKey.LONG_TERM_SAVINGS, name: 'Long-term savings' },
            { projectedDate: '2027-06-01' }
        );
        expect(summary).toMatchObject({
            id: 'goal-1',
            target: 500_000,
            saved: 120_000,
            jarId: 'jar-1',
            jarKey: JarKey.LONG_TERM_SAVINGS,
            jarName: 'Long-term savings',
            projectedDate: '2027-06-01',
        });
    });

    it('leaves jar and date empty when unknown (EARN goal, no projection)', () => {
        const summary = toGoalSummary(
            goal({ kind: GoalKind.EARN, jarId: null }),
            undefined,
            undefined
        );
        expect(summary).toMatchObject({ jarId: null, jarKey: null, jarName: null });
        expect(summary.projectedDate).toBeNull();
    });
});

describe('unlinkedGoals', () => {
    const goals = [
        goal({ id: 'a' }),
        goal({ id: 'b' }),
        goal({ id: 'c', status: GoalStatus.REACHED }),
        goal({ id: 'd', status: GoalStatus.ACTIVE }),
    ];

    it('keeps active goals nothing links to', () => {
        expect(unlinkedGoals(goals, new Set(['a'])).map(row => row.id)).toEqual(['b', 'd']);
    });

    it('returns everything active when nothing is linked', () => {
        expect(unlinkedGoals(goals, new Set()).map(row => row.id)).toEqual(['a', 'b', 'd']);
    });
});
