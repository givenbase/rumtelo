'use client';

import { useFormContext, useWatch } from 'react-hook-form';

import { CourseScope } from '@rumtelo/contracts';
import { useTranslations } from '@rumtelo/i18n';

import type { PlanFormValues } from '../_utils/plan-form';
import { planAreasOfScope, type PlanAreaKey } from '../_utils/plan-year';
import { PlanChip, PlanGroup } from './plan-parts';

const SCOPES = [CourseScope.PERSONAL, CourseScope.BUSINESS] as const;

/**
 * Step 2 · Areas: two groups of chips, as many as you like. A chip only decides which
 * ideas show up in step 3 — nothing is created from it.
 */
export function PlanStepAreas() {
    const t = useTranslations('features.growth.course.plan');
    const { control, setValue } = useFormContext<PlanFormValues>();
    const areas = useWatch({ control, name: 'areas' });

    const toggle = (key: PlanAreaKey) =>
        setValue(
            'areas',
            areas.includes(key) ? areas.filter(item => item !== key) : [...areas, key],
            {
                shouldDirty: true,
            }
        );

    return (
        <div className="grid gap-8">
            {SCOPES.map(scope => (
                <PlanGroup
                    key={scope}
                    id={`plan-areas-${scope}`}
                    label={t(`group_${scope}`)}
                    hint={t(`group_${scope}_hint`)}>
                    <div className="flex flex-wrap gap-2">
                        {planAreasOfScope(scope).map(area => (
                            <PlanChip
                                key={area.key}
                                label={t(`area_${area.key}`)}
                                selected={areas.includes(area.key)}
                                onClick={() => toggle(area.key)}
                            />
                        ))}
                    </div>
                </PlanGroup>
            ))}
            {areas.length === 0 ? <p className="text-sm text-fg-muted">{t('areas_none')}</p> : null}
        </div>
    );
}
