'use client';

import { useQueryClient } from '@tanstack/react-query';

import { useLiveQuery } from '@rumtelo/hooks';
import { useTranslations } from '@rumtelo/i18n';

import { api } from '@/app/_lib/api';
import { apiQuery } from '@/app/_lib/api-hooks';
import { missingAudienceKeys } from '@/app/_lib/household-audience-from-money';
import { isLiveData } from '@/app/_lib/preview';
import { useAppShell } from '@/components/features/shell/app-shell-context';
import { useAuth } from '@/components/features/shell/auth-provider';

/**
 * Merge implied Huishoudprofiel keys into household settings (add only).
 * Shows a toast with catalog names when anything was added.
 */
export function useMergeHouseholdAudiences() {
    const { householdId } = useAuth();
    const queryClient = useQueryClient();
    const { showToast } = useAppShell();
    const t = useTranslations('features.money.household_profile');
    const live = isLiveData(householdId);

    const settingsQuery = useLiveQuery(
        apiQuery.household.settings.queryOptions({ input: { householdId: householdId! } }),
        null,
        live
    );
    const audiencesQuery = useLiveQuery(
        apiQuery.money.catalogs.audiences.list.queryOptions({
            input: { householdId: householdId! },
        }),
        [],
        live
    );

    async function mergeImplied(implied: readonly string[]) {
        if (!live || !householdId || implied.length === 0) return;
        const current = settingsQuery.data?.audienceKeys ?? [];
        const missing = missingAudienceKeys(current, implied);
        if (missing.length === 0) return;

        try {
            await api.household.updateSettings({
                householdId,
                audienceKeys: [...current, ...missing],
            });
            void queryClient.invalidateQueries({
                queryKey: apiQuery.household.settings.key(),
            });
            const audiences = audiencesQuery.data ?? [];
            const labels = missing
                .map(key => audiences.find(row => row.key === key)?.name ?? key)
                .join(', ');
            showToast(t('toast_added', { profiles: labels }), 'info');
        } catch {
            // Create already succeeded — skip noisy errors for soft profile merge.
        }
    }

    return { mergeImplied };
}
