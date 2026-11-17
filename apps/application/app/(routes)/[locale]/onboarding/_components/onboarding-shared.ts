import { Currency, JarKey } from '@rumtelo/contracts';
import { z } from 'zod';

import { parseLocaleAmount, type LocaleAmountError } from '@/app/_lib/money-input';

export const ONBOARDING_CURRENCIES = [
    { code: Currency.EUR },
    { code: Currency.USD },
    { code: Currency.GBP },
] as const;

export type OnboardingScreen = 'income' | 'split';

/** Value of the `step` search param on the second screen (a history entry, so Back works). */
export const SPLIT_STEP_PARAM = 'split';

export const JAR_NAME_KEYS: Record<
    JarKey,
    | 'features.brand.auth_manifesto.jars.necessity.name'
    | 'features.brand.auth_manifesto.jars.freedom.name'
    | 'features.brand.auth_manifesto.jars.savings.name'
    | 'features.brand.auth_manifesto.jars.education.name'
    | 'features.brand.auth_manifesto.jars.play.name'
    | 'features.brand.auth_manifesto.jars.give.name'
> = {
    [JarKey.NECESSITIES]: 'features.brand.auth_manifesto.jars.necessity.name',
    [JarKey.FINANCIAL_FREEDOM]: 'features.brand.auth_manifesto.jars.freedom.name',
    [JarKey.LONG_TERM_SAVINGS]: 'features.brand.auth_manifesto.jars.savings.name',
    [JarKey.EDUCATION]: 'features.brand.auth_manifesto.jars.education.name',
    [JarKey.PLAY]: 'features.brand.auth_manifesto.jars.play.name',
    [JarKey.GIVE]: 'features.brand.auth_manifesto.jars.give.name',
};

/** Message key (under `pages.onboarding`) for each way an income string can be wrong. */
export const INCOME_ERROR_KEYS: Record<LocaleAmountError, string> = {
    empty: 'income_error_empty',
    not_a_number: 'income_error_nan',
    negative: 'income_error_negative',
    too_many_decimals: 'income_error_decimals',
    too_large: 'income_error_large',
};

/**
 * Screen 1 values. The income stays a string: `parseLocaleAmount` (by app locale) turns it
 * into minor units, and a wrong or ambiguous input is an inline field error.
 */
export function createOnboardingSchema(locale: string, errorText: (key: string) => string) {
    return z
        .object({
            currency: z.enum(Currency),
            monthlyIncome: z.string(),
        })
        .superRefine((values, ctx) => {
            const parsed = parseLocaleAmount(values.monthlyIncome, locale);
            if (!parsed.ok) {
                ctx.addIssue({
                    code: 'custom',
                    path: ['monthlyIncome'],
                    message: errorText(INCOME_ERROR_KEYS[parsed.reason]),
                });
            }
        });
}

export type OnboardingValues = z.infer<ReturnType<typeof createOnboardingSchema>>;
