'use client';

import { useFormContext, useWatch } from 'react-hook-form';

import { WorkSituation, YearIntention } from '@rumtelo/contracts';
import { useTranslations } from '@rumtelo/i18n';

import type { PlanFormValues } from '../_utils/plan-form';
import { PlanChoiceCard, PlanGroup } from './plan-parts';

const SITUATIONS = [
    WorkSituation.EMPLOYED,
    WorkSituation.SELF_EMPLOYED,
    WorkSituation.BOTH,
    WorkSituation.STUDENT,
    WorkSituation.SEEKING,
] as const;

const INTENTIONS = [
    YearIntention.CALM,
    YearIntention.GROW,
    YearIntention.BUILD,
    YearIntention.RECOVER,
] as const;

/**
 * Step 1 · You now: how you earn a living and what you want from the year. Two questions,
 * large cards, both optional. Picking a card again clears it.
 */
export function PlanStepNow({ year }: { year: string }) {
    const t = useTranslations('features.growth.course.plan');
    const { control, setValue } = useFormContext<PlanFormValues>();
    const situation = useWatch({ control, name: 'workSituation' });
    const intention = useWatch({ control, name: 'yearIntention' });

    return (
        <div className="grid gap-8">
            <PlanGroup id="plan-work-label" label={t('work_title')} hint={t('work_hint')}>
                <div className="grid gap-3 sm:grid-cols-2">
                    {SITUATIONS.map(option => (
                        <PlanChoiceCard
                            key={option}
                            title={t(`work_${option}`)}
                            hint={t(`work_${option}_hint`)}
                            selected={situation === option}
                            onClick={() =>
                                setValue('workSituation', situation === option ? null : option, {
                                    shouldDirty: true,
                                })
                            }
                        />
                    ))}
                </div>
            </PlanGroup>

            <PlanGroup
                id="plan-intention-label"
                label={t('intention_title', { year })}
                hint={t('intention_hint')}>
                <div className="grid gap-3 sm:grid-cols-2">
                    {INTENTIONS.map(option => (
                        <PlanChoiceCard
                            key={option}
                            title={t(`intention_${option}`)}
                            hint={t(`intention_${option}_hint`)}
                            selected={intention === option}
                            onClick={() =>
                                setValue('yearIntention', intention === option ? null : option, {
                                    shouldDirty: true,
                                })
                            }
                        />
                    ))}
                </div>
            </PlanGroup>
        </div>
    );
}
