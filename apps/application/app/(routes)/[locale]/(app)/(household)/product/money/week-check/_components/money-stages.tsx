'use client';

import Link from 'next/link';
import type { Ref } from 'react';
import { useFormContext } from 'react-hook-form';

import { JarKey, type JarBalance } from '@rumtelo/contracts';
import { useTranslations } from '@rumtelo/i18n';
import {
    EmptyState,
    Eyebrow,
    FormControl,
    FormField,
    FormItem,
    FormMessage,
    Textarea,
    Typography,
} from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { CREATE_HREF } from '@/app/_lib/create-routes';
import { jarChrome } from '@/app/_lib/jar-meta';
import { moneyPath } from '@/app/_lib/routes';
import { useJarName } from '@/app/_lib/use-jar-name';
import type { WeekCheckIntendSchemaValues } from '@/components/features/forms/form-zod';
import { JarProgressBar } from '@/components/features/money/jar-progress-bar';

export type StageJar = Pick<
    JarBalance,
    | 'id'
    | 'key'
    | 'name'
    | 'icon'
    | 'allocated'
    | 'spent'
    | 'credited'
    | 'committedOut'
    | 'available'
    | 'overspent'
>;

/** Stage title: focus lands here when the step changes (`tabIndex={-1}`). */
export function StageHeading({
    eyebrow,
    title,
    lead,
    headingRef,
}: {
    eyebrow?: string;
    title: string;
    lead?: string;
    headingRef?: Ref<HTMLHeadingElement>;
}) {
    return (
        <div>
            {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
            <Typography
                as="h2"
                ref={headingRef}
                tabIndex={-1}
                className={cn('outline-none', eyebrow && 'mt-1.5')}>
                {title}
            </Typography>
            {lead ? (
                <Typography as="p" size="sm" color="muted" className="mt-1">
                    {lead}
                </Typography>
            ) : null}
        </div>
    );
}

/** Look: one read-only meter per jar. An overspent jar is a full red meter and one move. */
export function LookStage({
    jars,
    canAct,
    formatMoney,
    headingRef,
}: {
    jars: readonly StageJar[];
    canAct: boolean;
    formatMoney: (minor: number) => string;
    headingRef?: Ref<HTMLHeadingElement>;
}) {
    const t = useTranslations('features.money.week_check');
    const jarName = useJarName();
    const noIncome = jars.length > 0 && jars.every(jar => jar.allocated === 0);

    return (
        <div className="grid gap-5">
            <StageHeading
                eyebrow={t('look_eyebrow')}
                title={t('look_title')}
                lead={t('look_lead')}
                headingRef={headingRef}
            />
            {noIncome ? (
                <EmptyState
                    variant="compact"
                    title={t('look_no_income')}
                    action={
                        canAct ? (
                            <Link
                                href={moneyPath('income')}
                                className="inline-flex min-h-11 items-center text-sm font-semibold text-accent hover:underline">
                                {t('look_add_income')}
                            </Link>
                        ) : undefined
                    }
                />
            ) : (
                <ul className="grid gap-2">
                    {jars.map(jar => (
                        <li
                            key={jar.id}
                            className="grid gap-2 rounded-xl border border-line bg-raised px-4 py-3">
                            <div className="flex min-w-0 items-center justify-between gap-3">
                                <span className="flex min-w-0 items-center gap-2.5 text-sm text-fg">
                                    <span aria-hidden className="text-base">
                                        {jar.icon ?? '✦'}
                                    </span>
                                    <span className="min-w-0 text-pretty">{jarName(jar)}</span>
                                </span>
                                <span className="shrink-0 font-mono text-sm text-fg tabular-nums">
                                    {formatMoney(jar.available)}
                                </span>
                            </div>
                            <JarProgressBar
                                allocated={jar.allocated}
                                spent={jar.spent}
                                credited={jar.credited}
                                committedOut={jar.committedOut}
                                colorClass={jarChrome(jar.key).color}
                                hideWhenEmpty={false}
                            />
                            {jar.overspent ? (
                                <p className="text-sm text-fg-muted">
                                    {t('look_over_by', {
                                        amount: formatMoney(Math.abs(jar.available)),
                                    })}
                                    {canAct ? (
                                        <>
                                            {' · '}
                                            <Link
                                                href={CREATE_HREF.move}
                                                className="inline-flex min-h-11 items-center font-semibold text-accent hover:underline">
                                                {t('look_move')} →
                                            </Link>
                                        </>
                                    ) : null}
                                </p>
                            ) : null}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

/** Redirect: pick one jar for the surplus. A radio group, so the choice is not colour-only. */
export function RedirectStage({
    jars,
    surplus,
    selectedJarId,
    onSelect,
    formatMoney,
    headingRef,
}: {
    jars: readonly StageJar[];
    surplus: number;
    selectedJarId: string | null;
    onSelect: (jarId: string) => void;
    formatMoney: (minor: number) => string;
    headingRef?: Ref<HTMLHeadingElement>;
}) {
    const t = useTranslations('features.money.week_check');
    const tForm = useTranslations('ui.form');
    const jarName = useJarName();
    const options = jars.filter(jar => jar.key !== JarKey.NECESSITIES);

    return (
        <div className="grid gap-5">
            <StageHeading
                eyebrow={t('direct_eyebrow')}
                title={t('direct_title')}
                lead={t('direct_surplus', { amount: formatMoney(surplus) })}
                headingRef={headingRef}
            />
            <div role="radiogroup" aria-label={t('direct_title')} className="grid gap-2">
                {options.map(jar => {
                    const selected = selectedJarId === jar.id;
                    return (
                        <div
                            key={jar.id}
                            className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-line bg-raised px-4 py-3">
                            <span className="flex min-w-0 items-center gap-2.5 text-sm text-fg">
                                <span aria-hidden className="text-base">
                                    {jar.icon ?? '✦'}
                                </span>
                                <span className="min-w-0 text-pretty">{jarName(jar)}</span>
                            </span>
                            <button
                                type="button"
                                role="radio"
                                aria-checked={selected}
                                onClick={() => onSelect(jar.id)}
                                className={cn(
                                    'min-h-11 shrink-0 rounded-full border px-4 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                                    selected
                                        ? 'border-accent bg-accent text-on-accent'
                                        : 'border-line-strong bg-surface text-fg hover:border-accent'
                                )}>
                                {selected ? tForm('selected') : t('send_here')}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/** Intend: one sentence. The parent owns the `useForm` (zod: `createWeekCheckIntendSchema`). */
export function IntendStage({
    intentionText,
    headingRef,
}: {
    intentionText: string;
    headingRef?: Ref<HTMLHeadingElement>;
}) {
    const t = useTranslations('features.money.week_check');
    const { control, formState } = useFormContext<WeekCheckIntendSchemaValues>();

    return (
        <div className="grid gap-5">
            <StageHeading
                eyebrow={t('intend_eyebrow')}
                title={t('intend_title')}
                lead={t('intend_lead')}
                headingRef={headingRef}
            />
            <FormField
                control={control}
                name="intention"
                render={({ field }) => (
                    <FormItem>
                        <FormControl>
                            <Textarea
                                rows={4}
                                maxLength={280}
                                placeholder={t('intend_placeholder')}
                                aria-label={t('intend_aria')}
                                className="bg-raised"
                                {...field}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            {intentionText.trim().length > 0 && !formState.errors.intention ? (
                <Typography as="p" size="xs" color="muted">
                    {t('intend_encourage')}
                </Typography>
            ) : null}
        </div>
    );
}
