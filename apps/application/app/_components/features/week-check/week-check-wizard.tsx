'use client';

import { useMemo, useState } from 'react';

import type { JarBalance } from '@rumtelo/contracts';
import { WeekCheckStage } from '@rumtelo/contracts';
import { useTranslations } from '@rumtelo/i18n';
import { Button, Eyebrow, Typography } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';

type WizardJar = Pick<JarBalance, 'id' | 'key' | 'name' | 'icon' | 'available' | 'overspent'>;

/**
 * Three-step WEEKTELLING wizard (design: `week-check`).
 *
 * Step 1 — Kijken: show week recap per jar (available vs plan).
 * Step 2 — Richten: show surplus amount and let user redirect it to jars.
 * Step 3 — Intentie: free-text intention for the coming week.
 *
 * Step dots at the top double as navigation so users can jump between steps.
 */
export function WeekCheckWizard({
    jars,
    surplus,
    initialStage,
    onStepComplete,
}: {
    jars: readonly WizardJar[];
    surplus: number;
    initialStage?: WeekCheckStage;
    onStepComplete?: (
        stage: WeekCheckStage,
        payload?: {
            intention?: string;
            allocations?: { jarId: string; amount: number }[];
        }
    ) => Promise<unknown>;
}) {
    const t = useTranslations('features.money.week_check');
    const tForm = useTranslations('ui.form');
    const { formatMoney } = useHouseholdCurrency();

    const steps = useMemo(
        () =>
            [
                {
                    key: WeekCheckStage.LOOK,
                    label: t('look_label'),
                    sub: t('look_sub'),
                },
                {
                    key: WeekCheckStage.REDIRECT,
                    label: t('direct_label'),
                    sub: t('direct_sub'),
                },
                {
                    key: WeekCheckStage.INTEND,
                    label: t('intend_label'),
                    sub: t('intend_sub'),
                },
            ] as const,
        [t]
    );

    const stageIndex =
        initialStage && initialStage !== WeekCheckStage.DONE
            ? steps.findIndex(stageItem => stageItem.key === initialStage)
            : 0;
    const [step, setStep] = useState(Math.max(0, stageIndex));
    const [intent, setIntent] = useState('');
    const [redirectJarId, setRedirectJarId] = useState<string | null>(null);

    const current = steps[step]!;

    async function goNext() {
        if (onStepComplete) {
            const payload =
                current.key === WeekCheckStage.REDIRECT && redirectJarId && surplus > 0
                    ? { allocations: [{ jarId: redirectJarId, amount: surplus }] }
                    : current.key === WeekCheckStage.INTEND
                      ? { intention: intent }
                      : undefined;
            await onStepComplete(current.key, payload);
        }
        if (step < steps.length - 1) setStep(previous => previous + 1);
    }

    async function finish() {
        if (onStepComplete) {
            await onStepComplete(WeekCheckStage.DONE, { intention: intent || undefined });
        }
    }

    return (
        <div className="grid gap-6">
            {/* Step indicator strip */}
            <div className="flex items-stretch overflow-hidden rounded-2xl border border-line bg-surface shadow-md">
                {steps.map((stageItem, i) => (
                    <button
                        key={stageItem.key}
                        type="button"
                        onClick={() => setStep(i)}
                        className={cn(
                            'flex flex-1 flex-col gap-1 border-r border-line px-5 py-4 text-left transition-colors last:border-r-0',
                            i === step
                                ? 'bg-accent-soft'
                                : i < step
                                  ? 'hover:bg-raised'
                                  : 'hover:bg-raised'
                        )}>
                        <Typography
                            as="span"
                            variant="eyebrow"
                            weight="semibold"
                            color={i === step ? 'primary' : 'muted'}
                            className={i === step ? undefined : 'text-fg-faint'}>
                            {t('step', { n: i + 1 })}
                        </Typography>
                        <Typography
                            as="h4"
                            weight="semibold"
                            color={i === step ? 'default' : 'secondary'}
                            className="text-sm">
                            {stageItem.label}
                        </Typography>
                        <Typography
                            as="span"
                            size="xs"
                            color="muted"
                            className="leading-tight text-fg-faint">
                            {stageItem.sub}
                        </Typography>
                        {/* Progress pip */}
                        <span
                            className={cn(
                                'mt-2 h-0.5 rounded-full transition-colors',
                                i === step ? 'bg-accent' : i < step ? 'bg-success' : 'bg-sunken'
                            )}
                        />
                    </button>
                ))}
            </div>

            {/* Step content */}
            <div className="animate-rise rounded-2xl border border-line bg-surface p-6 shadow-md">
                {/* ── Step 1: Look ─────────────────────────────────────────── */}
                {current.key === WeekCheckStage.LOOK && (
                    <div className="grid gap-5">
                        <div>
                            <Eyebrow>{t('look_eyebrow')}</Eyebrow>
                            <Typography as="h2" className="mt-1.5">
                                {t('look_title')}
                            </Typography>
                            <Typography as="p" size="sm" color="muted" className="mt-1">
                                {t('look_lead')}
                            </Typography>
                        </div>
                        <div className="grid gap-2">
                            {jars.map(jar => (
                                <div
                                    key={jar.id}
                                    className="flex items-center justify-between gap-3 rounded-xl border border-line bg-raised px-4 py-3">
                                    <span className="flex items-center gap-2.5 text-sm text-fg">
                                        <span aria-hidden className="text-base">
                                            {jar.icon}
                                        </span>
                                        {jar.name}
                                    </span>
                                    <span
                                        className={cn(
                                            'font-mono text-sm',
                                            jar.overspent ? 'text-danger' : 'text-success'
                                        )}>
                                        {formatMoney(jar.available, { signed: true })}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Step 2: Direct ────────────────────────────────────────── */}
                {current.key === WeekCheckStage.REDIRECT && (
                    <div className="grid gap-5">
                        <div>
                            <Eyebrow>{t('direct_eyebrow')}</Eyebrow>
                            <Typography as="h2" className="mt-1.5">
                                {t('direct_title')}
                            </Typography>
                            <Typography as="p" size="sm" color="muted" className="mt-1">
                                {surplus > 0
                                    ? t('direct_surplus', { amount: formatMoney(surplus) })
                                    : t('direct_none')}
                            </Typography>
                        </div>
                        {surplus > 0 ? (
                            <div className="grid gap-2">
                                {jars
                                    .filter(j => j.key !== 'NECESSITIES')
                                    .map(jar => (
                                        <div
                                            key={jar.id}
                                            className="flex items-center justify-between gap-3 rounded-xl border border-line bg-raised px-4 py-3">
                                            <span className="flex items-center gap-2.5 text-sm text-fg">
                                                <span aria-hidden className="text-base">
                                                    {jar.icon}
                                                </span>
                                                {jar.name}
                                            </span>
                                            <Button
                                                variant={
                                                    redirectJarId === jar.id
                                                        ? 'primary'
                                                        : 'secondary'
                                                }
                                                size="sm"
                                                className="h-8 px-3 text-xs"
                                                onClick={() => setRedirectJarId(jar.id)}>
                                                {redirectJarId === jar.id
                                                    ? tForm('selected')
                                                    : t('send_here')}
                                            </Button>
                                        </div>
                                    ))}
                            </div>
                        ) : null}
                    </div>
                )}

                {/* ── Step 3: Intend ───────────────────────────────────────── */}
                {current.key === WeekCheckStage.INTEND && (
                    <div className="grid gap-5">
                        <div>
                            <Eyebrow>{t('intend_eyebrow')}</Eyebrow>
                            <Typography as="h2" className="mt-1.5">
                                {t('intend_title')}
                            </Typography>
                            <Typography as="p" size="sm" color="muted" className="mt-1">
                                {t('intend_lead')}
                            </Typography>
                        </div>
                        <textarea
                            rows={4}
                            value={intent}
                            onChange={event => setIntent(event.target.value)}
                            placeholder={t('intend_placeholder')}
                            className="w-full resize-none rounded-xl border border-line bg-raised px-4 py-3 text-sm text-fg transition-colors placeholder:text-fg-faint focus:border-accent focus:outline-none"
                            aria-label={t('intend_aria')}
                        />
                        {intent.trim().length > 0 && (
                            <Typography as="p" size="xs" color="muted">
                                {t('intend_encourage')}
                            </Typography>
                        )}
                    </div>
                )}
            </div>

            {/* Navigation row */}
            <div className="flex items-center justify-between gap-3">
                {step > 0 ? (
                    <Button variant="ghost" onClick={() => setStep(previous => previous - 1)}>
                        {t('back')}
                    </Button>
                ) : (
                    <span />
                )}

                {step < steps.length - 1 ? (
                    <Button onClick={() => void goNext()}>{t('next')}</Button>
                ) : (
                    <Button onClick={() => void finish()}>{t('complete')}</Button>
                )}
            </div>
        </div>
    );
}
