import { Suspense } from 'react';

import { StatusPage } from '@rumtelo/ui';

import { isRegistrationOpen } from '@/lib/maintenance';
import { appSignInUrl } from '@/lib/portal-urls';

import { SignUpForm } from './_components/sign-up-form';

export const metadata = { title: 'Create account' };

function ComingSoon() {
    return (
        <StatusPage
            type="maintenance"
            title="Coming soon"
            description="New accounts open shortly. If you already have access, sign in to continue."
            homeHref="/"
            homeLabel="Back to home"
            statusCode={503}
        />
    );
}

export default function SignUpPage() {
    if (!isRegistrationOpen()) {
        return (
            <div className="relative min-h-dvh">
                <ComingSoon />
                <div className="pointer-events-none fixed inset-x-0 bottom-8 z-10 flex justify-center px-4">
                    <a
                        href={appSignInUrl()}
                        className="pointer-events-auto rounded-full bg-accent px-5 py-2.5 text-xs font-semibold text-on-accent shadow-md transition hover:brightness-110">
                        Sign in
                    </a>
                </div>
            </div>
        );
    }

    return (
        <Suspense fallback={null}>
            <SignUpForm />
        </Suspense>
    );
}
