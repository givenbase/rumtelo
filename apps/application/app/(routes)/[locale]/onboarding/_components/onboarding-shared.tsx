'use client';

import { BankAccountCount, Currency, JarKey } from '@rumtelo/contracts';
import { Icon, Typography, type IconName } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';
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
    bankAccountCount: z.enum(BankAccountCount),
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

export function ChoiceCard({
    selected,
    icon,
    label,
    hint,
    onClick,
}: {
    selected: boolean;
    icon: IconName;
    label: string;
    hint?: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            aria-pressed={selected}
            onClick={onClick}
            className={cn(
                'flex items-center gap-2.5 rounded-xl border px-3 py-3 text-left transition-all',
                selected
                    ? 'border-accent bg-accent-soft shadow-[inset_0_0_0_1px] shadow-accent/30'
                    : 'border-line bg-raised hover:border-accent hover:bg-card'
            )}>
            <span
                className={cn(
                    'grid size-9 shrink-0 place-items-center rounded-lg border',
                    selected
                        ? 'border-accent bg-surface text-accent'
                        : 'border-line bg-surface text-fg-muted'
                )}>
                <Icon name={icon} size="sm" color="inherit" />
            </span>
            <span className="grid min-w-0 flex-1 gap-0.5">
                <span className={cn('text-sm font-semibold', selected ? 'text-accent' : 'text-fg')}>
                    {label}
                </span>
                {hint ? <span className="text-xs font-medium text-fg-muted">{hint}</span> : null}
            </span>
            {selected ? (
                <Icon name="circle-check" size="sm" className="shrink-0 text-accent" />
            ) : null}
        </button>
    );
}

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
