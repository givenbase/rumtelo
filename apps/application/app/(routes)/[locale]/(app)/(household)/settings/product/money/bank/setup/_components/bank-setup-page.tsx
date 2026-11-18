'use client';

import Link from 'next/link';

import { HouseholdAnswerKey, JarExperience } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { useTranslations } from '@rumtelo/i18n';

import { apiQuery } from '@/app/_lib/api-hooks';
import { useBoardWriteAccess } from '@/app/_lib/use-board-write-access';
import { useAuth } from '@/components/features/shell/auth-provider';

import { JarBankSetupFlow } from './jar-bank-setup-flow';

/**
 * Name your bank account and map jars to it (moved here from onboarding).
 * Writers only: a VIEWER or a Practice preview gets the read-only bank settings instead.
 */
export function BankSetupPage() {
    const t = useTranslations('pages.onboarding.banks_setup');
    const { householdId } = useAuth();
    const { canMutate } = useBoardWriteAccess();

    const settingsQuery = useLiveQuery(
        apiQuery.household.settings.queryOptions({ input: { householdId: householdId! } }),
        null,
        Boolean(householdId)
    );

    if (!canMutate) {
        return (
            <Link
                href="/settings/product/money/bank"
                className="inline-flex min-h-11 items-center text-sm font-semibold text-accent hover:underline">
                {t('read_only_link')}
            </Link>
        );
    }

    const experience =
        (settingsQuery.data?.answers?.[HouseholdAnswerKey.JAR_EXPERIENCE] as
            | JarExperience
            | undefined) ?? JarExperience.NEW;

    return (
        <div className="mx-auto w-full max-w-xl">
            <JarBankSetupFlow experience={experience} />
        </div>
    );
}
