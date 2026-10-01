'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { type BankAccountCount, HouseholdAnswerKey, type JarExperience } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { useTranslations } from '@rumtelo/i18n';
import { BrandLoader } from '@rumtelo/ui';

import { apiQuery } from '@/app/_lib/api-hooks';
import { practicePath } from '@/app/_lib/routes';
import { useAuth } from '@/components/features/shell/auth-provider';
import { OnboardingFlow, type JarBankSetupParams } from './_components/onboarding-flow';
import { JarBankSetupFlow } from './_components/jar-bank-setup-flow';

/**
 * Onboarding page — proxy gates users here when `account.boardReady` is false.
 *
 * Phase A (no householdId): shows the onboarding questionnaire (OnboardingFlow).
 * Phase B (householdId && jar_bank_setup_done === false): shows the bank + jar mapping wizard.
 *
 * On completion the flows call router.replace('/'); proxy allows through when boardReady is true.
 * Do NOT add redirect logic here for the proxy gate — proxy.ts owns it.
 */
export default function OnboardingPage() {
    const t = useTranslations();
    const router = useRouter();
    const { session, isPending, householdId, householdReady } = useAuth();
    const [jarBankParams, setJarBankParams] = useState<JarBankSetupParams | null>(null);

    const practiceListQuery = useLiveQuery(
        apiQuery.practice.list.queryOptions(),
        [],
        Boolean(session)
    );
    const hasPractice = (practiceListQuery.data?.length ?? 0) > 0;
    const practiceListKnown = practiceListQuery.isFetched || practiceListQuery.isError;

    const settingsQuery = useLiveQuery(
        apiQuery.household.settings.queryOptions({ input: { householdId: householdId! } }),
        null,
        Boolean(householdId)
    );

    // Auth or household context loading
    if (isPending || !householdReady) {
        return <BrandLoader fullScreen label={t('ui.statusPage.loading')} />;
    }

    // Not signed in — proxy normally handles this; soft fallback link
    if (!session) {
        return (
            <div className="flex flex-col items-center gap-4 py-12 text-center">
                <p className="text-sm text-fg-muted">{t('ui.statusPage.loading')}</p>
                <Link href="/sign-in" className="text-sm font-semibold text-accent hover:underline">
                    {t('pages.auth.sign_in.submit')}
                </Link>
            </div>
        );
    }

    // Phase B: household known
    if (householdId) {
        // Settings still loading
        if (!settingsQuery.isFetched) {
            return <BrandLoader fullScreen label={t('ui.statusPage.loading')} />;
        }

        const done = settingsQuery.data?.answers?.[HouseholdAnswerKey.JAR_BANK_SETUP_DONE];

        // jar_bank_setup_done === false → bank + jar mapping wizard
        if (done === false) {
            const experience = (jarBankParams?.experience ??
                settingsQuery.data?.answers?.[HouseholdAnswerKey.JAR_EXPERIENCE]) as
                | JarExperience
                | undefined;
            const accountCount = (jarBankParams?.accountCount ??
                settingsQuery.data?.answers?.[HouseholdAnswerKey.BANK_ACCOUNT_COUNT]) as
                | BankAccountCount
                | undefined;

            // Fallback if answers aren't recorded yet
            if (!experience || !accountCount) {
                return <BrandLoader fullScreen label={t('ui.statusPage.loading')} />;
            }

            return <JarBankSetupFlow experience={experience} accountCount={accountCount} />;
        }

        // done !== false → proxy will let through; navigate to home
        router.replace('/');
        return <BrandLoader fullScreen label={t('ui.statusPage.loading')} />;
    }

    // Practice-only (no household, has practice) → redirect to practice
    if (hasPractice && practiceListKnown) {
        router.replace(practicePath());
        return <BrandLoader fullScreen label={t('ui.statusPage.loading')} />;
    }

    // Practice-only redirect in flight or list still loading
    if (!practiceListKnown) {
        return <BrandLoader fullScreen label={t('ui.statusPage.loading')} />;
    }

    // Phase A: no household → onboarding questionnaire
    return <OnboardingFlow onHouseholdReady={setJarBankParams} />;
}
