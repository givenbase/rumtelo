import { getTranslations } from '@rumtelo/i18n';
import { StagingEnvironmentBanner } from '@rumtelo/ui';
import { shouldShowStagingBanner } from '@rumtelo/utils';

import { StagingBannerOffset } from './staging-banner-offset';

/**
 * Fixed top strip when `NODE_ENV=staging`.
 * Server-read so runtime NODE_ENV is not baked as `production` by the client build.
 */
export async function StagingBanner() {
    if (!shouldShowStagingBanner({ nodeEnv: process.env.NODE_ENV })) return null;

    const t = await getTranslations();

    return (
        <>
            <StagingBannerOffset />
            <StagingEnvironmentBanner
                badge={t('pages.shell.gates.staging_banner_badge')}
                message={t('pages.shell.gates.staging_banner')}
                ariaLabel={t('pages.shell.gates.staging_banner_aria')}
            />
        </>
    );
}
