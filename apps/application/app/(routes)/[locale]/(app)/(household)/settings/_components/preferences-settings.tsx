'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { type Currency, type Locale, LOCALES, Theme } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { useLocale, useTranslations } from '@rumtelo/i18n';
import {
    Button,
    Field,
    Form,
    FormControl,
    FormField,
    FormItem,
    FormMessage,
    Input,
    Toggle,
} from '@rumtelo/ui';
import { cn, DEFAULT_CURRENCY, formatMoney as formatMoneyExplicit } from '@rumtelo/utils';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import { api } from '@/app/_lib/api';
import { apiQuery } from '@/app/_lib/api-hooks';
import { isLiveData } from '@/app/_lib/preview';
import { useAccountTheme } from '@/components/features/shell/account-theme-sync';
import { useFeatureHelpers } from '@/components/features/helpers';
import { useAuth } from '@/components/features/shell/auth-provider';
import { useHouseholdShell } from '@/components/features/shell/household-shell-context';
import { usePageTour } from '@/components/features/tour';

import { createPeriodFormSchema, type PeriodFormValues } from '../_utils/settings-form-zod';
import { CURRENCY_OPTIONS } from '../_utils/settings-shared';
import { useSettingsMutation } from '../_utils/use-settings-mutation';
import { SettingsInkCard, SettingsPanel, SettingsRow, SettingsRowLabel } from './settings-chrome';

/** Language, currency, display, coach — `/settings/general/preferences`. */
export function PreferencesSettings() {
    const t = useTranslations();
    const appLocale = useLocale();
    const { householdId } = useAuth();
    const { showToast, locale, setLocale } = useHouseholdShell();
    const { restartFullTour } = usePageTour();
    const { helpersEnabled, setHelpersEnabled } = useFeatureHelpers();
    const live = isLiveData(householdId);
    const [currencyDraft, setCurrencyDraft] = useState<string | null>(null);

    const periodForm = useForm<PeriodFormValues>({
        defaultValues: { periodStartDay: 1 },
        resolver: zodResolver(createPeriodFormSchema(t)),
    });

    const settingsQuery = useLiveQuery(
        apiQuery.household.settings.queryOptions({ input: { householdId: householdId! } }),
        null,
        live
    );
    const accountSettingsQuery = useLiveQuery(apiQuery.account.settings.queryOptions(), null, live);
    const householdQuery = useLiveQuery(
        apiQuery.household.current.queryOptions({ input: { householdId: householdId! } }),
        null,
        live
    );

    const currency =
        settingsQuery.data?.currency ?? householdQuery.data?.currency ?? DEFAULT_CURRENCY;
    const activeCurrency = currencyDraft ?? currency;
    const { accountTheme, setAccountTheme } = useAccountTheme();
    const activeTheme = accountTheme ?? Theme.LIGHT;
    const serverPeriodDay = settingsQuery.data?.money?.periodStartDay ?? 1;
    const activeLang = accountSettingsQuery.data?.locale ?? locale;

    const saveLocale = useSettingsMutation({
        mutationFn: async (next: Locale) => api.account.updateSettings({ locale: next }),
        invalidateKeys: [apiQuery.account.settings.key()],
        successMessage: t('pages.settings.toasts.language_saved'),
        onSuccess: (_data, next) => {
            if (locale !== next) setLocale(next);
        },
    });

    const saveCurrency = useSettingsMutation({
        mutationFn: async (next: Currency) => {
            if (!householdId) throw new Error('No household');
            return api.household.updateSettings({ householdId, currency: next });
        },
        invalidateKeys: [apiQuery.household.settings.key(), apiQuery.household.current.key()],
        successMessage: t('pages.settings.toasts.currency_saved'),
        onSuccess: () => setCurrencyDraft(null),
    });

    const savePeriod = useSettingsMutation({
        mutationFn: async (values: PeriodFormValues) => {
            if (!householdId) throw new Error('No household');
            return api.household.updateSettings({
                householdId,
                money: { periodStartDay: values.periodStartDay },
            });
        },
        invalidateKeys: [apiQuery.household.settings.key()],
        successMessage: t('pages.settings.toasts.period_saved'),
        onSuccess: (_data, values) => {
            periodForm.reset({ periodStartDay: values.periodStartDay });
        },
    });

    const saveTheme = useSettingsMutation({
        mutationFn: async (next: Theme) => setAccountTheme(next),
        onError: () => showToast(t('pages.settings.toasts.theme_failed'), 'error'),
    });

    function pickLocale(next: Locale) {
        if (live) saveLocale.mutate(next);
        else if (locale !== next) setLocale(next);
    }

    function pickCurrency(code: string, persist: boolean) {
        if (!persist) {
            showToast(t('pages.settings.toasts.chf_coming'), 'info');
            return;
        }
        setCurrencyDraft(code);
        if (live) saveCurrency.mutate(code as Currency);
    }

    useEffect(() => {
        if (!periodForm.formState.isDirty) {
            periodForm.reset({ periodStartDay: serverPeriodDay });
        }
        // Sync server → form when prefs load; skip while the user is editing.
        // eslint-disable-next-line react-hooks/exhaustive-deps -- reset/isDirty from RHF
    }, [serverPeriodDay]);

    return (
        <SettingsPanel>
            <SettingsInkCard
                eyebrow={t('pages.settings.panels.display.eyebrow')}
                blurb={t('pages.settings.panels.display.blurb')}>
                <SettingsRow>
                    <SettingsRowLabel
                        title={t('pages.settings.account.language')}
                        sub={t('pages.settings.account.language_sub')}
                    />
                    <div className="flex gap-1 rounded-full border border-line bg-raised p-0.5">
                        {LOCALES.map(code => {
                            const on = activeLang === code;
                            return (
                                <button
                                    key={code}
                                    type="button"
                                    onClick={() => pickLocale(code)}
                                    className={cn(
                                        'rounded-full px-3.5 py-1.5 font-mono text-[10px] font-medium tracking-[0.12em] uppercase transition-colors',
                                        on
                                            ? 'bg-accent text-on-accent'
                                            : 'text-fg-muted hover:text-fg'
                                    )}>
                                    {code}
                                </button>
                            );
                        })}
                    </div>
                </SettingsRow>

                <SettingsRow>
                    <SettingsRowLabel
                        title={t('pages.settings.account.currency')}
                        sub={t('pages.settings.account.currency_sub')}
                    />
                    <div className="flex flex-wrap justify-end gap-1.5">
                        {CURRENCY_OPTIONS.map(opt => {
                            const on = activeCurrency === opt.code;
                            return (
                                <button
                                    key={opt.code}
                                    type="button"
                                    onClick={() => pickCurrency(opt.code, opt.persist)}
                                    className={cn(
                                        'grid gap-0.5 rounded-[10px] border px-3 py-2 text-left transition-colors',
                                        on
                                            ? 'border-accent bg-accent-soft'
                                            : 'border-line hover:border-accent/50'
                                    )}>
                                    <span
                                        className={cn(
                                            'font-mono text-[10px] font-medium tracking-wide',
                                            on ? 'text-accent' : 'text-fg'
                                        )}>
                                        {opt.code}
                                    </span>
                                    <span className="font-mono text-[10.5px] text-fg-muted">
                                        {formatMoneyExplicit(430_000, {
                                            currency: opt.code === 'CHF' ? 'CHF' : opt.code,
                                            locale: appLocale,
                                        })}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </SettingsRow>

                <SettingsRow>
                    <SettingsRowLabel
                        title={t('pages.settings.rows.appearance.title')}
                        sub={t('pages.settings.rows.appearance.sub')}
                    />
                    <div className="flex gap-1 rounded-full border border-line bg-raised p-0.5">
                        {(
                            [
                                {
                                    value: Theme.SYSTEM,
                                    label: t('pages.settings.panels.display.system'),
                                },
                                {
                                    value: Theme.LIGHT,
                                    label: t('pages.settings.panels.display.light'),
                                },
                                {
                                    value: Theme.DARK,
                                    label: t('pages.settings.panels.display.dark'),
                                },
                            ] as const
                        ).map(option => {
                            const on = activeTheme === option.value;
                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    disabled={!live || saveTheme.isPending}
                                    onClick={() => saveTheme.mutate(option.value)}
                                    className={cn(
                                        'rounded-full px-3.5 py-1.5 font-mono text-[10px] font-medium tracking-[0.12em] uppercase transition-colors',
                                        on
                                            ? 'bg-accent text-on-accent'
                                            : 'text-fg-muted hover:text-fg'
                                    )}>
                                    {option.label}
                                </button>
                            );
                        })}
                    </div>
                </SettingsRow>

                <SettingsRow last>
                    <Form {...periodForm}>
                        <form
                            className="grid w-full gap-3 sm:grid-cols-[1fr_auto] sm:items-end"
                            onSubmit={periodForm.handleSubmit(values => savePeriod.mutate(values))}>
                            <FormField
                                control={periodForm.control}
                                name="periodStartDay"
                                render={({ field }) => (
                                    <FormItem>
                                        <Field
                                            label={t('pages.settings.panels.display.period_day')}
                                            htmlFor="period-day"
                                            hint={t(
                                                'pages.settings.panels.display.period_day_hint'
                                            )}>
                                            <FormControl>
                                                <Input
                                                    id="period-day"
                                                    type="number"
                                                    min={1}
                                                    max={28}
                                                    className="w-28"
                                                    disabled={!live}
                                                    {...field}
                                                    value={field.value}
                                                    onChange={event =>
                                                        field.onChange(
                                                            Math.min(
                                                                28,
                                                                Math.max(
                                                                    1,
                                                                    Number(event.target.value) || 1
                                                                )
                                                            )
                                                        )
                                                    }
                                                />
                                            </FormControl>
                                        </Field>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button
                                type="submit"
                                variant="secondary"
                                disabled={!live || savePeriod.isPending}>
                                {savePeriod.isPending
                                    ? t('pages.settings.working')
                                    : t('pages.settings.save')}
                            </Button>
                        </form>
                    </Form>
                </SettingsRow>
            </SettingsInkCard>

            <SettingsInkCard
                eyebrow={t('pages.settings.panels.coach.eyebrow')}
                blurb={t('pages.settings.panels.coach.blurb')}>
                <Toggle
                    checked={helpersEnabled}
                    label={t('pages.settings.panels.coach.toggle')}
                    hint={
                        helpersEnabled
                            ? t('pages.settings.panels.coach.hint_on')
                            : t('pages.settings.panels.coach.hint_off')
                    }
                    onCheckedChange={setHelpersEnabled}
                />
            </SettingsInkCard>

            <SettingsInkCard
                eyebrow={t('features.tour.chrome.settings.eyebrow')}
                blurb={t('features.tour.chrome.settings.blurb')}>
                <SettingsRow last>
                    <SettingsRowLabel
                        title={t('features.tour.chrome.settings.row_title')}
                        sub={t('features.tour.chrome.settings.row_sub')}
                    />
                    <Button type="button" variant="secondary" onClick={restartFullTour}>
                        {t('features.tour.chrome.settings.restart')}
                    </Button>
                </SettingsRow>
            </SettingsInkCard>
        </SettingsPanel>
    );
}
