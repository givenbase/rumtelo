import {
    GoalStatus,
    type Goal as GoalDto,
    type GoalProjection,
    type GoalSummary,
    type Jar as JarDto,
} from '@rumtelo/contracts';

/** One Money goal in one line, with its jar and landing date (both optional). */
export function toGoalSummary(
    goal: GoalDto,
    jar: Pick<JarDto, 'id' | 'key' | 'name'> | undefined,
    projection: Pick<GoalProjection, 'projectedDate'> | undefined
): GoalSummary {
    return {
        id: goal.id,
        kind: goal.kind,
        name: goal.name,
        icon: goal.icon,
        status: goal.status,
        target: goal.target,
        saved: goal.saved,
        targetOn: goal.targetOn,
        jarId: goal.jarId,
        jarKey: jar?.key ?? null,
        jarName: jar?.name ?? null,
        projectedDate: projection?.projectedDate ?? null,
    };
}

/**
 * Active Money goals that no course item links to. `linkedGoalIds` comes from every
 * item, hidden ones included: a goal behind a private item is linked, just not to you.
 */
export function unlinkedGoals(
    goals: readonly GoalDto[],
    linkedGoalIds: ReadonlySet<string>
): GoalDto[] {
    return goals.filter(goal => goal.status === GoalStatus.ACTIVE && !linkedGoalIds.has(goal.id));
}
