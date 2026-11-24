import {
    ACCOUNT_DIRECTION_MAX_LENGTH,
    AccountDirectionText,
    YearIntention,
    type AccountSettings,
} from '@rumtelo/contracts';
import { z } from 'zod';

/** Longest direction and why, from the contract (the server trims and caps at the same number). */
export const DIRECTION_MAX_LENGTH = ACCOUNT_DIRECTION_MAX_LENGTH;

/** The four year intentions, in the order the Course wizard offers them. */
export const YEAR_INTENTIONS = [
    YearIntention.CALM,
    YearIntention.GROW,
    YearIntention.BUILD,
    YearIntention.RECOVER,
] as const;

/**
 * One schema for the form and its resolver. Every field is optional in practice: an empty
 * text clears it. The text rules come from the contract so the limit can never drift.
 */
export const directionFormSchema = z.object({
    direction: AccountDirectionText,
    directionWhy: AccountDirectionText,
    yearIntention: z.enum(YearIntention).nullable(),
});

export type DirectionFormValues = z.infer<typeof directionFormSchema>;

/** Form values for what the server holds (null text is an empty field). */
export function directionFormValues(
    settings: Pick<AccountSettings, 'direction' | 'directionWhy' | 'yearIntention'> | null
): DirectionFormValues {
    return {
        direction: settings?.direction ?? '',
        directionWhy: settings?.directionWhy ?? '',
        yearIntention: settings?.yearIntention ?? null,
    };
}

/**
 * The `account.updateSettings` body: every field is sent, so what is on screen is what is
 * stored. Empty text goes as null (clears it); the server trims as well.
 */
export function directionPatch(values: DirectionFormValues): {
    direction: string | null;
    directionWhy: string | null;
    yearIntention: YearIntention | null;
} {
    return {
        direction: values.direction.trim() || null,
        directionWhy: values.directionWhy.trim() || null,
        yearIntention: values.yearIntention,
    };
}

/** True when a counter should be read out: close to the limit, never on every keystroke. */
export function isNearLimit(length: number, max: number = DIRECTION_MAX_LENGTH): boolean {
    return max - length <= 20;
}
