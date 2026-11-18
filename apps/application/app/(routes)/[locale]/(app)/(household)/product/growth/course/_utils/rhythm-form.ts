import {
    CourseRhythmCadence,
    CourseRhythmKind,
    VisibilityChoice,
    isRhythmTargetValid,
    rhythmShapeFor,
} from '@rumtelo/contracts';
import { z } from 'zod';

/** One schema for the routine form — UI and resolver share it. */
export const rhythmFormSchema = z
    .object({
        name: z.string().trim().min(1).max(140),
        kind: z.enum(CourseRhythmKind),
        cadence: z.enum(CourseRhythmCadence),
        /** Times per cadence as typed; DAILY ignores it (always 1). */
        target: z
            .string()
            .trim()
            .regex(/^\d{1,2}$/),
        weekdays: z.array(z.int().min(1).max(7)),
        parentId: z.string(),
        visibility: z.enum(VisibilityChoice),
    })
    .refine(
        values =>
            values.kind === CourseRhythmKind.HABIT ||
            values.cadence === CourseRhythmCadence.DAILY ||
            isRhythmTargetValid(values.cadence, Number(values.target)),
        { path: ['target'], message: 'target_range' }
    );

export type RhythmFormValues = z.infer<typeof rhythmFormSchema>;

/** Cadence and target sent to the API: a habit is daily, DAILY is always 1. */
export function rhythmShapeOf(values: Pick<RhythmFormValues, 'kind' | 'cadence' | 'target'>): {
    cadence: CourseRhythmCadence;
    target: number;
} {
    const target = values.cadence === CourseRhythmCadence.DAILY ? 1 : Number(values.target);
    return rhythmShapeFor(values.kind, values.cadence, target);
}
