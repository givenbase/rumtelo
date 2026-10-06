import { getTranslations } from '@rumtelo/i18n';

import { GrowthPortalHubClient } from '@/components/features/home/growth-portal-hub';

import { GrowthGoalsStatus } from './_components/growth-goals-status';

export async function generateMetadata() {
    const t = await getTranslations('pages.meta');
    return { title: t('growth') };
}

/** Overview = status. Goals pill = add and edit. */
export default function GrowthPage() {
    return (
        <div className="grid gap-8">
            <GrowthPortalHubClient />
            <GrowthGoalsStatus />
        </div>
    );
}
