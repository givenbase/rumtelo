import { getTranslations } from '@rumtelo/i18n';
import { IncomePageClient } from './_components/income-page';

export async function generateMetadata() {
    const t = await getTranslations('pages.meta');
    return { title: t('income') };
}

export default function IncomePage() {
    return <IncomePageClient />;
}
