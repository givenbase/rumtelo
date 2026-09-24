'use client';

import { api } from '@/app/_lib/api';
import { apiQuery } from '@/app/_lib/api-hooks';
import { isLiveData } from '@/app/_lib/preview';
import { useAppShell } from '@/components/features/shell/app-shell-context';
import { useAuth } from '@/components/features/shell/auth-provider';
import { BANK_SETTINGS_PATH } from '@rumtelo/contracts/money';
import { useTranslations } from '@rumtelo/i18n';
import { BrandLoader } from '@rumtelo/ui';
import { extractErrorMessage } from '@rumtelo/utils';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';

/**
 * Enable Banking OAuth return — exchanges `code`/`state`, pulls once, then
 * lands on Bank settings without query junk on that page.
 */
export function BankOauthCallback() {
    const t = useTranslations();
    const { householdId } = useAuth();
    const { showToast } = useAppShell();
    const live = isLiveData(householdId);
    const router = useRouter();
    const searchParams = useSearchParams();
    const queryClient = useQueryClient();
    const handled = useRef(false);

    useEffect(() => {
        if (!live || !householdId || handled.current) return;
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        handled.current = true;

        if (!code || !state) {
            showToast(t('common.message.error.api.bank_sync_failed'), 'error');
            router.replace(BANK_SETTINGS_PATH);
            return;
        }

        void (async () => {
            try {
                const linked = await api.money.bankSync.completeLink({
                    householdId,
                    code,
                    state,
                });
                const result = await api.money.bankSync.syncNow({
                    householdId,
                    bankAccountId: linked.bankAccountId,
                });
                await Promise.all([
                    queryClient.invalidateQueries({
                        queryKey: apiQuery.money.accounts.list.key(),
                    }),
                    queryClient.invalidateQueries({
                        queryKey: apiQuery.money.bankSync.status.key(),
                    }),
                    queryClient.invalidateQueries({
                        queryKey: apiQuery.money.transactions.inbox.key(),
                    }),
                ]);
                showToast(
                    t('pages.settings.panels.bank.synced_toast', { count: result.imported }),
                    'success'
                );
            } catch (error) {
                showToast(extractErrorMessage(error), 'error');
            } finally {
                router.replace(BANK_SETTINGS_PATH);
            }
        })();
    }, [live, householdId, searchParams, showToast, t, router, queryClient]);

    return <BrandLoader fullScreen label={t('pages.settings.panels.bank.linking')} />;
}
