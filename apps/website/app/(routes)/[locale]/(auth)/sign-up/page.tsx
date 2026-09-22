import { getTranslations } from '@rumtelo/i18n';
import { Suspense } from 'react';

import { StatusPage } from '@rumtelo/ui';

import { isRegistrationOpen } from '@/lib/maintenance';
import { appSignInUrl } from '@/lib/portal-urls';

import { SignUpForm } from './_components/sign-up-form';

export async function generateMetadata() {
    const t = await getTranslations('pages.meta');
    return { title: t('create_account') };
}

async function ComingSoon() {
    const t = await getTranslations('pages.meta');
    const tStatus = await getTranslations('ui.statusPage');
    const tHeader = await getTranslations('pages.landing.header');
    return (
        <div className="relative min-h-dvh">
            <StatusPage
                type="maintenance"
                title={t('coming_soon_title')}
                description={t('coming_soon_body')}
                homeHref="/"
                homeLabel={tStatus('back_home')}
                goBackLabel={tStatus('go_back')}
                statusCode={503}
            />
            <div className="pointer-events-none fixed inset-x-0 bottom-8 z-10 flex justify-center px-4">
                <a
                    href={appSignInUrl()}
                    className="pointer-events-auto rounded-full bg-accent px-5 py-2.5 text-xs font-semibold text-on-accent shadow-md transition hover:brightness-110">
                    {tHeader('sign_in')}
                </a>
            </div>
        </div>
    );
}

export default async function SignUpPage() {
    if (!isRegistrationOpen()) {
        return <ComingSoon />;
    }

    return (
        <Suspense fallback={null}>
            <SignUpForm />
        </Suspense>
    );
}
