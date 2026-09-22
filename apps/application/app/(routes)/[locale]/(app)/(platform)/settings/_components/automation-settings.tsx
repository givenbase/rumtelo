'use client';

import { apiQuery } from '@/app/_lib/api-hooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { useLiveQuery } from '@rumtelo/hooks';
import { useTranslations } from '@rumtelo/i18n';
import { Button, Field, Input, StubNotice } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { useApiError } from '@/app/_lib/api-error-messages';
import { updateOrganization } from '@/app/_lib/auth';
import { isLiveData } from '@/app/_lib/preview';
import { useAppShell } from '@/components/features/shell/app-shell-context';
import { useAuth } from '@/components/features/shell/auth-provider';

import { SettingsInkCard, SettingsPanel, SettingsRowLabel } from './settings-chrome';
import { AUTO_RULE_DEFAULTS, AUTO_RULE_KEYS } from './settings-shared';

export function AutomationSettings() {
    const t = useTranslations();
    const queryClient = useQueryClient();
    const { householdId } = useAuth();
    const { showToast } = useAppShell();
    const apiError = useApiError();
    const live = isLiveData(householdId);

    const householdQuery = useLiveQuery(
        apiQuery.household.current.queryOptions({ input: { householdId: householdId! } }),
        null,
        live
    );

    const [hhNameDraft, setHhNameDraft] = useState<string | null>(null);
    const hhName = hhNameDraft ?? householdQuery.data?.name ?? '';

    const [rules, setRules] = useState(
        () =>
            Object.fromEntries(AUTO_RULE_KEYS.map(key => [key, AUTO_RULE_DEFAULTS[key]])) as Record<
                string,
                boolean
            >
    );

    const saveHouseholdName = useMutation({
        mutationFn: async () => {
            if (!householdId) throw new Error('No household');
            await updateOrganization(householdId, { name: hhName.trim() });
        },
        onSuccess: () => {
            setHhNameDraft(null);
            void queryClient.invalidateQueries({ queryKey: apiQuery.household.current.key() });
            void queryClient.invalidateQueries({ queryKey: apiQuery.household.list.key() });
            showToast(t('pages.settings.toasts.household_updated'), 'success');
        },
        onError: (error: unknown) => showToast(apiError(error), 'error'),
    });

    return (
        <SettingsPanel>
            <SettingsInkCard
                eyebrow={t('pages.settings.panels.automation.eyebrow')}
                blurb={t('pages.settings.panels.automation.blurb')}>
                {AUTO_RULE_KEYS.map((key, i) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => setRules(prev => ({ ...prev, [key]: !prev[key] }))}
                        className={cn(
                            'flex w-full flex-wrap items-center justify-between gap-2 py-2.5 text-left',
                            i < AUTO_RULE_KEYS.length - 1 && 'border-b border-line'
                        )}>
                        <SettingsRowLabel
                            title={t(`pages.settings.panels.automation.rules.${key}.name`)}
                            sub={t(`pages.settings.panels.automation.rules.${key}.desc`)}
                        />
                        <span
                            className={cn(
                                'relative h-5 w-9 shrink-0 rounded-full transition-colors',
                                rules[key] ? 'bg-accent' : 'bg-raised'
                            )}>
                            <span
                                className={cn(
                                    'absolute top-0.5 size-3.5 rounded-full bg-surface transition-[left]',
                                    rules[key] ? 'left-[18px]' : 'left-0.5'
                                )}
                            />
                        </span>
                    </button>
                ))}
            </SettingsInkCard>

            <SettingsInkCard
                eyebrow={t('pages.settings.panels.automation.household_name')}
                blurb={t('pages.settings.panels.automation.household_blurb')}>
                <div className="grid gap-3 py-2.5">
                    <Field label={t('pages.settings.panels.automation.name')} htmlFor="hh-name">
                        <Input
                            id="hh-name"
                            value={hhName}
                            onChange={event => setHhNameDraft(event.target.value)}
                            disabled={!live}
                        />
                    </Field>
                    <div className="flex justify-end">
                        <Button
                            variant="secondary"
                            disabled={!live || saveHouseholdName.isPending || !hhName.trim()}
                            onClick={() => saveHouseholdName.mutate()}>
                            {saveHouseholdName.isPending
                                ? t('pages.settings.working')
                                : t('pages.settings.save')}
                        </Button>
                    </div>
                </div>
            </SettingsInkCard>

            <StubNotice
                prefix={t('ui.statusPage.scaffold')}
                what={t('pages.settings.panels.automation.stub')}
            />
        </SettingsPanel>
    );
}
