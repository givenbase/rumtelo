import { WeekCheckStage } from '@rumtelo/contracts';

export type StepKey =
    | 'LOOK'
    | 'REDIRECT'
    | 'INTEND'
    | 'COURSE_BACK'
    | 'COURSE_ROUTINES'
    | 'COURSE_AHEAD';

export type StepGroup = 'money' | 'course';

export type WeekCheckStep = { key: StepKey; group: StepGroup };

const COURSE_STEPS: readonly WeekCheckStep[] = [
    { key: 'COURSE_BACK', group: 'course' },
    { key: 'COURSE_ROUTINES', group: 'course' },
    { key: 'COURSE_AHEAD', group: 'course' },
];

/**
 * The stages of one week check: Money (Look, Redirect when there is surplus, Intend), then
 * the three Course stages when the caller has Course. Done is not a step.
 */
export function buildWeekCheckSteps({
    hasSurplus,
    hasCourse,
}: {
    hasSurplus: boolean;
    hasCourse: boolean;
}): readonly WeekCheckStep[] {
    const money: WeekCheckStep[] = [{ key: 'LOOK', group: 'money' }];
    if (hasSurplus) money.push({ key: 'REDIRECT', group: 'money' });
    money.push({ key: 'INTEND', group: 'money' });
    return hasCourse ? [...money, ...COURSE_STEPS] : money;
}

/**
 * Where to resume. `LOOK` and `REDIRECT` reopen that stage; `INTEND` means the intention is
 * saved, so Plus and Max go on to Course (Basic reopens Intend). `fromCourse` jumps to the
 * first Course stage once the Money stages are at `INTEND` or later.
 */
export function resumeIndex({
    steps,
    moneyStage,
    fromCourse,
}: {
    steps: readonly WeekCheckStep[];
    moneyStage: WeekCheckStage | null | undefined;
    fromCourse: boolean;
}): number {
    const firstCourse = steps.findIndex(step => step.group === 'course');
    const atIntendOrLater =
        moneyStage === WeekCheckStage.INTEND || moneyStage === WeekCheckStage.DONE;

    if (
        firstCourse !== -1 &&
        atIntendOrLater &&
        (fromCourse || moneyStage === WeekCheckStage.INTEND)
    ) {
        return firstCourse;
    }
    const target: StepKey =
        moneyStage === WeekCheckStage.REDIRECT ? 'REDIRECT' : atIntendOrLater ? 'INTEND' : 'LOOK';
    const index = steps.findIndex(step => step.key === target);
    if (index !== -1) return index;
    // Redirect is skipped (no surplus): land on Intend.
    const intend = steps.findIndex(step => step.key === 'INTEND');
    return Math.max(0, intend);
}

export { resolveMoneyWeek, type WeekCheckFacts } from '@/app/_lib/week-check-week';
