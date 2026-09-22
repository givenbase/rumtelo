import { getTranslations } from '@rumtelo/i18n';
import { Suspense } from 'react';

import { ResetPasswordForm } from './_components/reset-password-form';

export async function generateMetadata() {
    const t = await getTranslations('pages.meta');
    return { title: t('reset_password') };
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={null}>
            <ResetPasswordForm />
        </Suspense>
    );
}
