'use client';

import { useTranslations } from '@rumtelo/i18n';

import { PointChip } from '../onboarding-shared';

export function WelcomeStep() {
    const t = useTranslations('pages.onboarding');

    return (
        <div className="mt-5 flex flex-wrap gap-2">
            <PointChip icon="target" label={t('welcome_points.jars')} />
            <PointChip icon="eye" label={t('welcome_points.overview')} />
            <PointChip icon="sparkles" label={t('welcome_points.coach')} />
        </div>
    );
}
