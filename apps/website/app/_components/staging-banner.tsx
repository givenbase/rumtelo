import { getTranslations } from '@rumtelo/i18n';
import { StagingEnvironmentBanner } from '@rumtelo/ui';
import { shouldShowStagingBanner } from '@rumtelo/utils';

import { StagingBannerOffset } from './staging-banner-offset';

/** Fixed top strip when `NODE_ENV=staging`. Hidden for development and production. */
export async function StagingBanner() {
    if (!shouldShowStagingBanner({ nodeEnv: process.env.NODE_ENV })) return null;

    const t = await getTranslations();

    return (
        <>
            <StagingBannerOffset />
            <StagingEnvironmentBanner
                badge={t('pages.landing.header.staging_banner_badge')}
                message={t('pages.landing.header.staging_banner')}
                ariaLabel={t('pages.landing.header.staging_banner_aria')}
            />
        </>
    );
}
