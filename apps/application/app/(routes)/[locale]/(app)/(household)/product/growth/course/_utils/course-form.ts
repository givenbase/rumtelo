import { VisibilityChoice } from '@rumtelo/contracts';
import { z } from 'zod';

/** Select value for "no parent" / "no money goal" — Radix Select has no empty value. */
export const NONE = 'none';

/** One schema for the Course item form — UI and resolver share it. */
export const courseItemFormSchema = z.object({
    name: z.string().trim().min(1).max(140),
    doneWhen: z.string().trim().max(280),
    parentId: z.string(),
    visibility: z.enum(VisibilityChoice),
    goalId: z.string(),
    /** Month / quarter counter as typed ("12"); empty = no counter. */
    targetCount: z
        .string()
        .trim()
        .regex(/^([1-9]\d?)?$/),
});

export type CourseItemFormValues = z.infer<typeof courseItemFormSchema>;

export function optionalId(value: string): string | null {
    return value === NONE ? null : value;
}

/** "12" → 12, "" → null. */
export function optionalCount(value: string): number | null {
    return value.trim() === '' ? null : Number(value);
}
