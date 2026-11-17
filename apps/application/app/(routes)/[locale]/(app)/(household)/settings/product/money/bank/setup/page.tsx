import { getTranslations } from '@rumtelo/i18n';

import { BankSetupPage } from './_components/bank-setup-page';

export async function generateMetadata() {
    const t = await getTranslations('pages.meta');
    return { title: t('settings_bank') };
}

export default function BankSetupRoute() {
    return <BankSetupPage />;
}
