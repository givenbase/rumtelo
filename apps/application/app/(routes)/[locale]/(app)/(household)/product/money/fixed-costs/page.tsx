import { getTranslations } from '@rumtelo/i18n';
import { FixedCostsPageClient } from './_components/fixed-costs-page';

export async function generateMetadata() {
    const t = await getTranslations('pages.meta');
    return { title: t('fixed_costs') };
}

export default function FixedCostsPage() {
    return <FixedCostsPageClient />;
}
