import { getTranslations } from '@rumtelo/i18n';
import { Suspense } from 'react';

import { VerifyPanel } from './_components/verify-panel';

export async function generateMetadata() {
    const t = await getTranslations('pages.meta');
    return { title: t('verify_email') };
}

export default function VerifyPage() {
    return (
        <Suspense fallback={null}>
            <VerifyPanel />
        </Suspense>
    );
}
