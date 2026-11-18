'use client';

import { useTranslations } from '@rumtelo/i18n';
import { signUpAudienceQuery } from '@rumtelo/utils';

import { useMarketingSession } from '@/app/_components/marketing-session-provider';
import { Cta } from '@/components/landing/landing-primitives';
import { isRegistrationOpen } from '@/lib/maintenance';
import { appPracticeUrl, appSignInUrl, webSignUpPath } from '@/lib/portal-urls';

/**
 * One CTA for every spot on `/practices`.
 * Guests start a practice through sign-up (`?as=practice`); signed-in visitors open the desk,
 * whose overview offers "Create a practice" when there is none yet. Registration closed → sign in.
 */
export function PracticeCta({ className }: { className?: string }) {
    const tPractice = useTranslations('pages.landing.practice_plan');
    const tPricing = useTranslations('pages.landing.pricing_section');
    const { isAuthenticated } = useMarketingSession();

    const action = isAuthenticated
        ? { href: appPracticeUrl(), label: tPractice('cta_open') }
        : isRegistrationOpen()
          ? { href: webSignUpPath(signUpAudienceQuery('practice')), label: tPractice('cta') }
          : { href: appSignInUrl(), label: tPricing('cta_sign_in') };

    return (
        <Cta href={action.href} size="lg" className={className}>
            {action.label}
        </Cta>
    );
}
