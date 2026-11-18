import {
    CourseArea,
    CourseRhythmCadence,
    CourseRhythmKind,
    CourseScope,
    GoalKind,
    WorkSituation,
    YearIntention,
    isRhythmTargetValid,
} from '@rumtelo/contracts';
import { z } from 'zod';

import { PLAN_AMOUNT_MAX_MINOR, PLAN_AREA_KEYS, PLAN_NO_JAR, parseMinorUnits } from './plan-year';

/** Codes the schema reports; the UI turns them into copy (`features.growth.course.plan.error.*`). */
export type PlanErrorCode =
    | 'name_required'
    | 'amount_invalid'
    | 'jar_required'
    | 'target_invalid'
    | 'routine_name_required';

export type PlanMessage = (code: PlanErrorCode) => string;

/** Money goal kinds "Plan your year" can create: a total to save or a monthly income to reach. */
export const PLAN_AMOUNT_KINDS = [GoalKind.SAVE, GoalKind.EARN] as const;

/**
 * One schema for the whole "Plan your year" draft — every step reads and writes the same
 * form, so back and next never lose what was typed. Amounts and counts are typed text
 * ("12,50", "3") and parsed once, in the chain builder.
 */
export function createPlanFormSchema(msg: PlanMessage) {
    const goal = z
        .object({
            /** Local identity of the draft; never sent to the API. */
            uid: z.string().min(1),
            areaKey: z.enum(PLAN_AREA_KEYS),
            /** The preset this started from; empty for "write my own". */
            presetKey: z.string(),
            name: z.string().trim().min(1, msg('name_required')).max(140),
            doneWhen: z.string().trim().max(280),
            scope: z.enum(CourseScope),
            hasAmount: z.boolean(),
            amountKind: z.enum(PLAN_AMOUNT_KINDS),
            amount: z.string().trim(),
            jarId: z.string(),
            step: z.string().trim().max(140),
            routineOn: z.boolean(),
            routineName: z.string().trim().max(140),
            routineKind: z.enum(CourseRhythmKind),
            routineCadence: z.enum(CourseRhythmCadence),
            routineTarget: z.string().trim(),
            routineArea: z.enum(CourseArea),
        })
        .superRefine((value, ctx) => {
            if (value.hasAmount) {
                const minor = parseMinorUnits(value.amount);
                if (minor === null || minor <= 0 || minor > PLAN_AMOUNT_MAX_MINOR) {
                    ctx.addIssue({
                        code: 'custom',
                        path: ['amount'],
                        message: msg('amount_invalid'),
                    });
                }
                if (value.amountKind === GoalKind.SAVE && value.jarId === PLAN_NO_JAR) {
                    ctx.addIssue({
                        code: 'custom',
                        path: ['jarId'],
                        message: msg('jar_required'),
                    });
                }
            }
            if (value.routineOn) {
                if (!value.routineName) {
                    ctx.addIssue({
                        code: 'custom',
                        path: ['routineName'],
                        message: msg('routine_name_required'),
                    });
                }
                if (!isRhythmTargetValid(value.routineCadence, Number(value.routineTarget))) {
                    ctx.addIssue({
                        code: 'custom',
                        path: ['routineTarget'],
                        message: msg('target_invalid'),
                    });
                }
            }
        });

    return z.object({
        workSituation: z.enum(WorkSituation).nullable(),
        yearIntention: z.enum(YearIntention).nullable(),
        areas: z.array(z.enum(PLAN_AREA_KEYS)),
        goals: z.array(goal),
    });
}

export type PlanFormValues = z.infer<ReturnType<typeof createPlanFormSchema>>;
export type PlanGoalDraft = PlanFormValues['goals'][number];
