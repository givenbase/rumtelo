import { getTranslations } from '@rumtelo/i18n';
import { NetWorthPageClient } from './_components/net-worth-page';

export async function generateMetadata() {
    const t = await getTranslations('pages.meta');
    return { title: t('net_worth') };
}

export default function NetWorthPage() {
    return <NetWorthPageClient />;
}
