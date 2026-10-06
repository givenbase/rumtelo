import { getTranslations } from '@rumtelo/i18n';

import { MoneyPortalHubClient } from '@/components/features/home/money-portal-hub';

import { JarsPageClient } from './jars/_components/jars-page';

export async function generateMetadata() {
    const t = await getTranslations('pages.meta');
    return { title: t('money') };
}

/** Overview = Money hub + the six jars (one screen, no extra Jars pill). */
export default function MoneyPage() {
    return (
        <div className="grid gap-8">
            <MoneyPortalHubClient />
            <JarsPageClient embed />
        </div>
    );
}
