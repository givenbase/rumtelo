'use client';

import { Currency, JarKey } from '@rumtelo/contracts';
import { Icon, Typography, type IconName } from '@rumtelo/ui';
import { z } from 'zod';

export const ONBOARDING_CURRENCIES = [
    { code: Currency.EUR },
    { code: Currency.USD },
    { code: Currency.GBP },
] as const;

export const STEP_KEYS = ['welcome', 'income', 'jars', 'why'] as const;

export type OnboardingStepKey = (typeof STEP_KEYS)[number];

export const STEP_ICONS: Record<OnboardingStepKey, IconName> = {
    welcome: 'sparkles',
    income: 'wallet',
    jars: 'target',
    why: 'flag',
};

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

export const onboardingSchema = z.object({
    householdName: z.string().min(1).max(120),
    currency: z.enum(Currency),
    monthlyIncome: z.string().min(1),
    why: z.string().max(500),
});

export type OnboardingValues = z.infer<typeof onboardingSchema>;

export type DisplayJar = {
    key: JarKey;
    name: string;
    icon: string;
    pct: number;
    subtitle: string;
    note: string;
    text: string;
};

export function PointChip({ icon, label }: { icon: IconName; label: string }) {
    return (
        <span className="inline-flex items-center gap-2 rounded-full border border-line bg-raised px-3 py-1.5">
            <Icon name={icon} size="sm" color="primary" />
            <Typography as="span" size="sm" weight="medium">
                {label}
            </Typography>
        </span>
    );
}
