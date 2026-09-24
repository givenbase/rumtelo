'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { api } from '@/app/_lib/api';
import { apiQuery } from '@/app/_lib/api-hooks';
import { isLiveData } from '@/app/_lib/preview';
import { useAuth } from '@/components/features/shell/auth-provider';

/**
 * Opportunistic AIS pull when the user opens Money surfaces.
 * Calls `bankSync.syncStale` once per mount; server skips seats synced in the
 * last 30 minutes. Silent when bank sync is off or nothing is linked.
 */
export function useBankSyncOnVisit() {
    const { householdId } = useAuth();
    const live = isLiveData(householdId);
    const queryClient = useQueryClient();
    const ran = useRef(false);

    useEffect(() => {
        if (!live || !householdId || ran.current) return;
        ran.current = true;

        void api.money.bankSync
            .syncStale({ householdId })
            .then(result => {
                if (result.imported <= 0 && result.synced <= 0) return;
                void queryClient.invalidateQueries({
                    queryKey: apiQuery.money.transactions.inbox.key(),
                });
                void queryClient.invalidateQueries({
                    queryKey: apiQuery.money.accounts.list.key(),
                });
                void queryClient.invalidateQueries({
                    queryKey: apiQuery.money.bankSync.status.key(),
                });
            })
            .catch(() => {
                /* disabled / no seats — ignore */
            });
    }, [live, householdId, queryClient]);
}
