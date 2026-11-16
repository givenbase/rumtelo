'use client';

import { useState } from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';

import { coursePresetCopyKey, type Jar, type JarKey } from '@rumtelo/contracts';
import { useTranslations } from '@rumtelo/i18n';

import type { PlanFormValues } from '../_utils/plan-form';
import {
    blankDraft,
    draftFromPreset,
    PLAN_AREAS,
    presetsForArea,
    type PlanArea,
} from '../_utils/plan-year';
import { PlanGoalEditor } from './plan-goal-editor';
import { PlanChoiceCard } from './plan-parts';

/**
 * Step 3 · Goals: for each chosen area, "what do you want to see different by the end of
 * the year?". Preset suggestions fitting the work situation, plus "write my own". Picking
 * one opens its editor right under the cards. No limit on goals.
 */
export function PlanStepGoals({
    year,
    month,
    jars,
    canAmounts,
}: {
    year: string;
    month: string;
    jars: readonly Jar[];
    canAmounts: boolean;
}) {
    const t = useTranslations('features.growth.course.plan');
    const tRoot = useTranslations();
    const { control } = useFormContext<PlanFormValues>();
    const areas = useWatch({ control, name: 'areas' });
    const situation = useWatch({ control, name: 'workSituation' });
    const intention = useWatch({ control, name: 'yearIntention' });
    const { fields, append, remove } = useFieldArray({ control, name: 'goals' });
    // UI-only: the editor that was just added takes focus once.
    const [justAdded, setJustAdded] = useState<string | null>(null);

    const jarIdOf = (key: JarKey) => jars.find(jar => jar.key === key)?.id ?? null;
    const chosen: PlanArea[] = PLAN_AREAS.filter(area => areas.includes(area.key));

    const add = (draft: PlanFormValues['goals'][number]) => {
        append(draft);
        setJustAdded(draft.uid);
    };

    return (
        <div className="grid gap-8">
            {intention ? (
                <p className="rounded-2xl bg-accent-soft px-4 py-3 text-sm text-fg-secondary">
                    {t(`intention_${intention}_goals`)}
                </p>
            ) : null}

            {chosen.map(area => {
                const presets = presetsForArea(area, situation);
                const goalsHere = fields
                    .map((field, index) => ({ field, index }))
                    .filter(({ field }) => field.areaKey === area.key);
                return (
                    <section
                        key={area.key}
                        aria-labelledby={`plan-goals-${area.key}`}
                        className="grid gap-4">
                        <div className="grid gap-1">
                            <h3
                                id={`plan-goals-${area.key}`}
                                className="text-lg font-semibold text-fg">
                                {t(`area_${area.key}`)}
                            </h3>
                            <p className="text-sm text-fg-muted">{t('goals_prompt', { year })}</p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            {presets.map(preset => {
                                const existing = goalsHere.find(
                                    ({ field }) => field.presetKey === preset.key
                                );
                                return (
                                    <PlanChoiceCard
                                        key={preset.key}
                                        title={tRoot(coursePresetCopyKey(preset.key, 'name'))}
                                        hint={tRoot(coursePresetCopyKey(preset.key, 'doneWhen'))}
                                        selected={existing !== undefined}
                                        onClick={() => {
                                            // A picked card lets go of its goal again.
                                            if (existing) {
                                                remove(existing.index);
                                                return;
                                            }
                                            add(
                                                draftFromPreset({
                                                    id: crypto.randomUUID(),
                                                    area,
                                                    preset,
                                                    jarIdOf,
                                                    canHaveAmount: canAmounts,
                                                    copy: {
                                                        name: tRoot(
                                                            coursePresetCopyKey(preset.key, 'name')
                                                        ),
                                                        doneWhen: tRoot(
                                                            coursePresetCopyKey(
                                                                preset.key,
                                                                'doneWhen'
                                                            )
                                                        ),
                                                        firstStep: tRoot(preset.firstStepKey),
                                                        rhythmName: preset.rhythm
                                                            ? tRoot(preset.rhythm.nameKey)
                                                            : '',
                                                    },
                                                })
                                            );
                                        }}
                                    />
                                );
                            })}
                            <PlanChoiceCard
                                dashed
                                title={t('own')}
                                hint={t('own_hint')}
                                selected={false}
                                onClick={() => add(blankDraft({ id: crypto.randomUUID(), area }))}
                            />
                        </div>

                        {goalsHere.map(({ field, index }) => (
                            <PlanGoalEditor
                                key={field.id}
                                index={index}
                                uid={field.uid}
                                shouldFocus={justAdded === field.uid}
                                jars={jars}
                                canAmounts={canAmounts}
                                month={month}
                                onRemove={() => remove(index)}
                            />
                        ))}
                    </section>
                );
            })}
        </div>
    );
}
