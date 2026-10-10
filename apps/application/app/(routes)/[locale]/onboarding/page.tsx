'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { HouseholdAnswerKey, HouseholdRole, JarExperience } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { useTranslations } from '@rumtelo/i18n';
import { BrandLoader } from '@rumtelo/ui';
import { householdInvitePath } from '@rumtelo/utils';

import { apiQuery } from '@/app/_lib/api-hooks';
import { useAuth } from '@/components/features/shell/auth-provider';
import { useOptionalHouseholdInvite } from '@/components/features/shell/household-invite-provider';
import { OnboardingFlow, type JarBankSetupParams } from './_components/onboarding-flow';
import { JarBankSetupFlow } from './_components/jar-bank-setup-flow';

/**
 * Onboarding UI for household creators only.
 * Proxy + `boardReady` (+ invitePath) own navigation for invitees.
 *
 * Phase A (no household): questionnaire for new household creators.
 * Phase B (OWNER, setup not done): bank + jar map.
 * Invitees (VIEWER / MEMBER / ADMIN) never see this UI.
 */
export default function OnboardingPage() {
    const t = useTranslations();
    const router = useRouter();
    const { session, isPending, householdId, householdReady, userId } = useAuth();
    const householdInvite = useOptionalHouseholdInvite();
    const [jarBankParams, setJarBankParams] = useState<JarBankSetupParams | null>(null);
    const pendingInviteId = householdInvite?.invitationId ?? null;

    const settingsQuery = useLiveQuery(
        apiQuery.household.settings.queryOptions({ input: { householdId: householdId! } }),
        null,
        Boolean(householdId)
    );

    const membersQuery = useLiveQuery(
        apiQuery.household.members.queryOptions({ input: { householdId: householdId! } }),
        [],
        Boolean(householdId)
    );

    const answers = settingsQuery.data?.answers;
    const jarBankDone = answers?.[HouseholdAnswerKey.JAR_BANK_SETUP_DONE];
    const myRole = membersQuery.data.find(member => member.userId === userId)?.role;
    const isOwner = myRole === HouseholdRole.OWNER;

    useEffect(() => {
        if (householdId || !pendingInviteId) return;
        router.replace(householdInvitePath(pendingInviteId));
    }, [householdId, pendingInviteId, router]);

    if (isPending || !householdReady) {
        return <BrandLoader fullScreen label={t('ui.statusPage.loading')} />;
    }

    if (!session) {
        return (
            <div className="flex flex-col items-center gap-4 py-12 text-center">
                <p className="text-sm text-fg-muted">{t('ui.statusPage.loading')}</p>
                <Link href="/sign-in" className="text-sm font-semibold text-accent hover:underline">
                    {t('features.auth.sign_in.submit')}
                </Link>
            </div>
        );
    }

    // Already on a household as non-owner — never show creator questionnaire / bank setup.
    if (householdId && myRole && !isOwner) {
        return <BrandLoader fullScreen label={t('ui.statusPage.loading')} />;
    }

    // OWNER still finishing bank ↔ jar setup after creating the board.
    if (householdId && isOwner && jarBankDone !== true) {
        const experience =
            jarBankParams?.experience ??
            (answers?.[HouseholdAnswerKey.JAR_EXPERIENCE] as JarExperience | undefined) ??
            JarExperience.NEW;

        return <JarBankSetupFlow experience={experience} />;
    }

    if (householdId) {
        // Wait for proxy bounce once boardReady clears.
        return <BrandLoader fullScreen label={t('ui.statusPage.loading')} />;
    }

    // Invitee with a remembered invite — never the creator questionnaire.
    if (pendingInviteId) {
        return <BrandLoader fullScreen label={t('ui.statusPage.loading')} />;
    }

    return <OnboardingFlow onHouseholdReady={setJarBankParams} />;
}
