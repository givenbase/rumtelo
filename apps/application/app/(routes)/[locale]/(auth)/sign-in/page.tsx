import { getTranslations } from '@rumtelo/i18n';
import { Suspense } from 'react';

import { SignInForm } from './_components/sign-in-form';

export async function generateMetadata() {
    const t = await getTranslations('pages.meta');
    return { title: t('sign_in') };
}

export default function SignInPage() {
    return (
        <Suspense fallback={null}>
            <SignInForm />
        </Suspense>
    );
}
