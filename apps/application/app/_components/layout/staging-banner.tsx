'use client';

import { useEffect, useState } from 'react';

import { useTranslations } from '@rumtelo/i18n';
import { StagingEnvironmentBanner } from '@rumtelo/ui';
import { shouldShowStagingBanner } from '@rumtelo/utils';

import { env } from '@/app/_utils/get-env';

const BANNER_HEIGHT_PX = 40;

/**
 * Fixed top strip on staging only (Railway env name or `dev-*` host).
 * Hidden for local development and production.
 */
export function StagingBanner() {
    const t = useTranslations();
    const [hostname] = useState<string | null>(() =>
        typeof window !== 'undefined' ? window.location.hostname : null
    );

    const show = shouldShowStagingBanner({
        nodeEnv: process.env.NODE_ENV,
        railwayEnvironmentName: env.NEXT_PUBLIC_RAILWAY_ENVIRONMENT_NAME,
        hostname,
    });

    useEffect(() => {
        const root = document.documentElement;
        if (show) {
            root.dataset.stagingBanner = 'true';
            root.style.setProperty('--staging-banner-h', `${BANNER_HEIGHT_PX}px`);
        } else {
            delete root.dataset.stagingBanner;
            root.style.removeProperty('--staging-banner-h');
        }
        return () => {
            delete root.dataset.stagingBanner;
            root.style.removeProperty('--staging-banner-h');
        };
    }, [show]);

    if (!show) return null;

    return (
        <StagingEnvironmentBanner
            badge={t('pages.shell.gates.staging_banner_badge')}
            message={t('pages.shell.gates.staging_banner')}
            ariaLabel={t('pages.shell.gates.staging_banner_aria')}
        />
    );
}
