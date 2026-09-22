'use client';

import { api } from '@/app/_lib/api';
import { apiQuery } from '@/app/_lib/api-hooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { PayoffStrategy } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { useTranslations } from '@rumtelo/i18n';
import { cn } from '@rumtelo/utils';

import { useApiError } from '@/app/_lib/api-error-messages';
import { isLiveData } from '@/app/_lib/preview';
import { useAppShell } from '@/components/features/shell/app-shell-context';
import { useAuth } from '@/components/features/shell/auth-provider';

import { SettingsInkCard, SettingsPanel, SettingsPill } from './settings-chrome';

export function DebtSettings() {
    const t = useTranslations();
    const queryClient = useQueryClient();
    const { householdId } = useAuth();
    const { showToast } = useAppShell();
    const apiError = useApiError();
    const live = isLiveData(householdId);

    const settingsQuery = useLiveQuery(
        apiQuery.household.settings.queryOptions({ input: { householdId: householdId! } }),
        null,
        live
    );

    const strategy = settingsQuery.data?.money?.payoffStrategy ?? PayoffStrategy.AVALANCHE;

    const saveStrategy = useMutation({
        mutationFn: async (next: PayoffStrategy) => {
            if (!householdId) throw new Error('No household');
            return api.household.updateSettings({
                householdId,
                money: { payoffStrategy: next },
            });
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: apiQuery.household.settings.key() });
            void queryClient.invalidateQueries({ queryKey: apiQuery.money.debts.plan.key() });
            showToast(t('pages.settings.toasts.payoff_saved'), 'success');
        },
        onError: (error: unknown) => showToast(apiError(error), 'error'),
    });

    return (
        <SettingsPanel>
            <SettingsInkCard
                eyebrow={t('pages.settings.panels.debt_payoff.eyebrow')}
                blurb={t('pages.settings.panels.debt_payoff.blurb')}
                badge={
                    <SettingsPill tone="accent">
                        {strategy === PayoffStrategy.AVALANCHE
                            ? t('pages.settings.panels.debt_payoff.avalanche')
                            : strategy === PayoffStrategy.SNOWBALL
                              ? t('pages.settings.panels.debt_payoff.snowball')
                              : t('pages.settings.panels.debt_payoff.minimal')}
                    </SettingsPill>
                }>
                {(
                    [
                        {
                            key: PayoffStrategy.AVALANCHE,
                            name: t('pages.settings.panels.debt_payoff.avalanche'),
                            tag: t('pages.settings.panels.debt_payoff.avalanche_tag'),
                            desc: t('pages.settings.panels.debt_payoff.avalanche_desc'),
                            metric: t('pages.settings.panels.debt_payoff.avalanche_metric'),
                        },
                        {
                            key: PayoffStrategy.SNOWBALL,
                            name: t('pages.settings.panels.debt_payoff.snowball'),
                            tag: t('pages.settings.panels.debt_payoff.snowball_tag'),
                            desc: t('pages.settings.panels.debt_payoff.snowball_desc'),
                            metric: t('pages.settings.panels.debt_payoff.snowball_metric'),
                        },
                        {
                            key: PayoffStrategy.MINIMAL,
                            name: t('pages.settings.panels.debt_payoff.minimal'),
                            tag: t('pages.settings.panels.debt_payoff.minimal_tag'),
                            desc: t('pages.settings.panels.debt_payoff.minimal_desc'),
                            metric: t('pages.settings.panels.debt_payoff.minimal_metric'),
                        },
                    ] as const
                ).map((option, index, list) => {
                    const on = strategy === option.key;
                    return (
                        <button
                            key={option.key}
                            type="button"
                            aria-label={option.name}
                            disabled={!live || saveStrategy.isPending}
                            onClick={() => {
                                if (live) saveStrategy.mutate(option.key);
                            }}
                            className={cn(
                                'flex w-full items-start gap-2.5 py-2.5 text-left',
                                index < list.length - 1 && 'border-b border-line'
                            )}>
                            <span
                                className={cn(
                                    'mt-0.5 grid size-3.5 shrink-0 place-items-center rounded-full border',
                                    on ? 'border-accent' : 'border-line'
                                )}>
                                <span
                                    className={cn(
                                        'size-1.5 rounded-full',
                                        on ? 'bg-accent' : 'bg-transparent'
                                    )}
                                />
                            </span>
                            <span className="grid min-w-0 flex-1 gap-0.5">
                                <span className="flex flex-wrap items-baseline gap-2">
                                    <span className="text-sm text-fg">{option.name}</span>
                                    <span className="font-mono text-[9px] tracking-[0.12em] text-accent uppercase">
                                        {option.tag}
                                    </span>
                                </span>
                                <span className="text-[11px] leading-snug text-pretty text-fg-muted">
                                    {option.desc}
                                </span>
                                <span className="font-mono text-[10px] text-fg-secondary">
                                    {option.metric}
                                </span>
                            </span>
                        </button>
                    );
                })}
            </SettingsInkCard>
        </SettingsPanel>
    );
}
