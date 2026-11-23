'use client';

import { useEffect, useRef } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import { CourseScope, GoalKind, type Jar } from '@rumtelo/contracts';
import { useTranslations } from '@rumtelo/i18n';
import {
    Button,
    Field,
    FormControl,
    FormField,
    FormItem,
    FormMessage,
    Input,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Textarea,
    Toggle,
} from '@rumtelo/ui';

import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';
import { useJarName } from '@/app/_lib/use-jar-name';

import { PLAN_AMOUNT_KINDS, type PlanFormValues } from '../_utils/plan-form';
import { monthlyShareFor, parseMinorUnits } from '../_utils/plan-year';
import { PlanChip } from './plan-parts';

const SCOPES = [CourseScope.PERSONAL, CourseScope.BUSINESS] as const;

/**
 * The inline editor of one goal in step 3: name, done-when, scope and, when there is an
 * amount, the amount, the jar and what it comes to per month. Everything starts filled
 * from the preset and stays editable.
 */
export function PlanGoalEditor({
    index,
    uid,
    shouldFocus,
    jars,
    canAmounts,
    month,
    onRemove,
}: {
    index: number;
    uid: string;
    /** Move focus to the name when this editor was just added. */
    shouldFocus: boolean;
    jars: readonly Jar[];
    canAmounts: boolean;
    /** The `YYYY-MM` the saving starts in. */
    month: string;
    onRemove: () => void;
}) {
    const t = useTranslations('features.growth.course.plan');
    const tScope = useTranslations('features.growth.course.goal');
    const jarName = useJarName();
    const { control, setValue } = useFormContext<PlanFormValues>();
    const { symbol, formatMoney } = useHouseholdCurrency();
    const root = useRef<HTMLElement>(null);

    const goal = useWatch({ control, name: `goals.${index}` });
    const hasAmount = goal?.hasAmount ?? false;
    const amountKind = goal?.amountKind ?? GoalKind.SAVE;
    const minor = hasAmount ? parseMinorUnits(goal?.amount ?? '') : null;
    const isSave = amountKind === GoalKind.SAVE;

    useEffect(() => {
        if (shouldFocus)
            root.current?.querySelector<HTMLInputElement>('input[name$=".name"]')?.focus();
    }, [shouldFocus]);

    const id = (field: string) => `plan-goal-${uid}-${field}`;

    return (
        <article
            ref={root}
            aria-label={goal?.name || t('own')}
            className="grid gap-4 rounded-3xl border border-line-strong bg-card p-4 sm:p-5">
            <FormField
                control={control}
                name={`goals.${index}.name`}
                render={({ field }) => (
                    <FormItem>
                        <Field label={t('editor_name')} htmlFor={id('name')}>
                            <FormControl>
                                <Input
                                    id={id('name')}
                                    {...field}
                                    autoComplete="off"
                                    maxLength={140}
                                />
                            </FormControl>
                        </Field>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={control}
                name={`goals.${index}.doneWhen`}
                render={({ field }) => (
                    <FormItem>
                        <Field
                            label={t('editor_done_when')}
                            hint={t('editor_done_when_hint')}
                            htmlFor={id('done')}>
                            <FormControl>
                                <Textarea
                                    id={id('done')}
                                    {...field}
                                    rows={2}
                                    autoComplete="off"
                                    maxLength={280}
                                />
                            </FormControl>
                        </Field>
                    </FormItem>
                )}
            />

            <div role="group" aria-labelledby={id('scope')} className="grid gap-1.5">
                <p id={id('scope')} className="text-sm font-medium text-fg">
                    {t('editor_scope')}
                </p>
                <div className="flex flex-wrap gap-2">
                    {SCOPES.map(scope => (
                        <PlanChip
                            key={scope}
                            label={tScope(`scope_${scope}`)}
                            selected={goal?.scope === scope}
                            onClick={() =>
                                setValue(`goals.${index}.scope`, scope, { shouldDirty: true })
                            }
                        />
                    ))}
                </div>
            </div>

            {canAmounts ? (
                <div className="grid gap-3 border-t border-line pt-2">
                    <Toggle
                        checked={hasAmount}
                        label={t('amount_toggle')}
                        hint={t('amount_toggle_hint')}
                        onCheckedChange={next =>
                            setValue(`goals.${index}.hasAmount`, next, { shouldDirty: true })
                        }
                    />
                    {hasAmount ? (
                        <div className="grid gap-4">
                            <div
                                role="group"
                                aria-label={t('amount_kind_aria')}
                                className="flex flex-wrap gap-2">
                                {PLAN_AMOUNT_KINDS.map(kind => (
                                    <PlanChip
                                        key={kind}
                                        label={t(`amount_kind_${kind}`)}
                                        selected={amountKind === kind}
                                        onClick={() =>
                                            setValue(`goals.${index}.amountKind`, kind, {
                                                shouldDirty: true,
                                            })
                                        }
                                    />
                                ))}
                            </div>

                            <FormField
                                control={control}
                                name={`goals.${index}.amount`}
                                render={({ field }) => (
                                    <FormItem>
                                        <Field
                                            label={t(isSave ? 'amount_save' : 'amount_earn')}
                                            hint={
                                                isSave
                                                    ? minor !== null && minor > 0
                                                        ? t('per_month', {
                                                              amount: formatMoney(
                                                                  monthlyShareFor(minor, month)
                                                              ),
                                                          })
                                                        : t('amount_save_hint')
                                                    : t('amount_earn_hint')
                                            }
                                            htmlFor={id('amount')}>
                                            <FormControl>
                                                <Input
                                                    id={id('amount')}
                                                    {...field}
                                                    startAffix={symbol}
                                                    inputMode="decimal"
                                                    autoComplete="off"
                                                    maxLength={14}
                                                    placeholder="0"
                                                    className="max-w-48"
                                                />
                                            </FormControl>
                                        </Field>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {isSave ? (
                                <FormField
                                    control={control}
                                    name={`goals.${index}.jarId`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <Field label={t('jar')} hint={t('jar_hint')}>
                                                <Select
                                                    value={field.value}
                                                    onValueChange={field.onChange}>
                                                    <FormControl>
                                                        <SelectTrigger aria-label={t('jar')}>
                                                            <SelectValue
                                                                placeholder={t('jar_placeholder')}
                                                            />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent position="popper">
                                                        {jars.map(jar => (
                                                            <SelectItem key={jar.id} value={jar.id}>
                                                                {jarName(jar)}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </Field>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            ) : null}
                            <p className="text-sm text-fg-muted">{t('shared_note')}</p>
                        </div>
                    ) : null}
                </div>
            ) : (
                <p className="border-t border-line pt-3 text-sm text-fg-muted">
                    {t('amount_locked')}
                </p>
            )}

            <div>
                <Button type="button" size="sm" variant="ghost" onClick={onRemove}>
                    {t('remove_goal')}
                </Button>
            </div>
        </article>
    );
}
