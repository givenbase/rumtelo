import { getTranslations } from '@rumtelo/i18n';

import { BankOauthCallback } from './_components/bank-oauth-callback';

export async function generateMetadata() {
    const t = await getTranslations('pages.meta');
    return { title: t('banking_callback') };
}

export default function BankOauthCallbackPage() {
    return <BankOauthCallback />;
}
