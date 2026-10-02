'use client';

import { useState } from 'react';
import Link from 'next/link';

import { HouseholdAnswerKey, JarExperience } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { useTranslations } from '@rumtelo/i18n';
import { BrandLoader } from '@rumtelo/ui';

import { apiQuery } from '@/app/_lib/api-hooks';
import { useAuth } from '@/components/features/shell/auth-provider';
import { OnboardingFlow, type JarBankSetupParams } from './_components/onboarding-flow';
import { JarBankSetupFlow } from './_components/jar-bank-setup-flow';

/**
 * Onboarding UI only — no redirects.
 * Proxy + `app/_lib/onboarding-gate.ts` own all board/onboarding navigation.
 *
 * Phase A (no household): questionnaire.
 * Phase B (has household, setup not marked done): bank + jar map.
 * Flows call `router.replace('/')` once when done; proxy then allows the board.
 */
export default function OnboardingPage() {
    const t = useTranslations();
    const { session, isPending, householdId, householdReady } = useAuth();
    const [jarBankParams, setJarBankParams] = useState<JarBankSetupParams | null>(null);

    const settingsQuery = useLiveQuery(
        apiQuery.household.settings.queryOptions({ input: { householdId: householdId! } }),
        null,
        Boolean(householdId)
    );

    const answers = settingsQuery.data?.answers;
    const jarBankDone = answers?.[HouseholdAnswerKey.JAR_BANK_SETUP_DONE];

    if (isPending || !householdReady) {
        return <BrandLoader fullScreen label={t('ui.statusPage.loading')} />;
    }

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

    // Phase B: any household on this route means jar-bank setup unless explicitly done.
    // (Proxy already decided boardReady === false — do not soft-lock on missing answers.)
    if (householdId && jarBankDone !== true) {
        const experience =
            jarBankParams?.experience ??
            (answers?.[HouseholdAnswerKey.JAR_EXPERIENCE] as JarExperience | undefined) ??
            JarExperience.NEW;

        return <JarBankSetupFlow experience={experience} />;
    }

    if (householdId) {
        // Setup marked done — wait for next navigation; proxy owns the bounce home.
        return <BrandLoader fullScreen label={t('ui.statusPage.loading')} />;
    }

    return <OnboardingFlow onHouseholdReady={setJarBankParams} />;
}
