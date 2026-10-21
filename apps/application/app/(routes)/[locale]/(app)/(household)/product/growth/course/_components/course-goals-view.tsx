'use client';

import { CourseHorizon } from '@rumtelo/contracts';
import { useLocale, useTranslations } from '@rumtelo/i18n';

import { periodLabel } from '../_utils/course-route';
import { isCurrentStep, quarterOfMonth } from '../_utils/course-view';
import { CourseLayerSection } from './course-layer-section';

/**
 * Course › Goals: where the weeks lead. Your goals for the year with this month's
 * steps under each, the quarter when it is switched on, and every milestone of the
 * month — linked to a goal or not. The month follows the period picker in the shell.
 */
export function CourseGoalsView({
    month,
    accountId,
    isQuartersEnabled,
}: {
    month: string;
    accountId: string | undefined;
    isQuartersEnabled: boolean;
}) {
    const t = useTranslations('features.growth.course');
    const locale = useLocale();
    const year = month.slice(0, 4);
    const quarter = isQuartersEnabled ? quarterOfMonth(month) : null;
    const short = {
        quarter: (value: string) => t('quarter_short', { quarter: value }),
        week: (value: string) => t('week_short', { week: value }),
    };

    return (
        <div className="grid gap-8">
            <CourseLayerSection
                horizon={CourseHorizon.YEAR}
                period={year}
                accountId={accountId}
                title={t('goals_year', { year })}
                lead={t('lead_year')}
                isLeftoverShown={false}
                childFilter={child => isCurrentStep(child, month, quarter)}
            />
            {quarter ? (
                <CourseLayerSection
                    horizon={CourseHorizon.QUARTER}
                    period={quarter}
                    accountId={accountId}
                    title={periodLabel(CourseHorizon.QUARTER, quarter, locale, short)}
                    lead={t('lead_quarter')}
                    childFilter={child => isCurrentStep(child, month, null)}
                />
            ) : null}
            <CourseLayerSection
                horizon={CourseHorizon.MONTH}
                period={month}
                accountId={accountId}
                title={t('goals_month', {
                    month: periodLabel(CourseHorizon.MONTH, month, locale, short),
                })}
                lead={t('lead_month')}
            />
        </div>
    );
}
