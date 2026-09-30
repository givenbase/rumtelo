'use client';

import { useEffect, useState } from 'react';

import { useTranslations } from '@rumtelo/i18n';
import { Button, StubNotice } from '@rumtelo/ui';
import { cn, toPeriodKey } from '@rumtelo/utils';

import {
    downloadHouseholdCsv,
    downloadHouseholdCsvZip,
    downloadHouseholdJson,
    fetchHouseholdExportBundle,
    fetchTransactionsForExport,
    type HouseholdExportAccess,
    type HouseholdExportBundle,
} from '@/app/_lib/household-export';
import { CAPABILITIES } from '@/app/_lib/plan';
import { isLiveData } from '@/app/_lib/preview';
import { useHouseholdShell } from '@/components/features/shell/household-shell-context';
import { useAuth } from '@/components/features/shell/auth-provider';
import { usePlanCapabilities } from '@/components/features/shell/use-plan-capabilities';

import { SettingsInkCard, SettingsPanel } from './settings-chrome';

type Busy = 'csv' | 'json' | 'zip' | null;

function stampToday() {
    return new Date().toISOString().slice(0, 10);
}

export function ExportSettings() {
    const t = useTranslations();
    const { householdId } = useAuth();
    const { showToast, period } = useHouseholdShell();
    const { hasCapability, planReady } = usePlanCapabilities();
    const live = isLiveData(householdId);
    const [busy, setBusy] = useState<Busy>(null);
    const [scope, setScope] = useState<'all' | 'tx' | 'month'>('all');

    const periodKey = toPeriodKey(period.year, period.month);
    const includeDebts = hasCapability(CAPABILITIES.moneyDebt);
    const includeGoals = hasCapability(CAPABILITIES.growthGoals);
    const includeAssets = hasCapability(CAPABILITIES.growthNetWorth);
    const exportAccess: HouseholdExportAccess = { includeDebts, includeGoals, includeAssets };
    const previewKey =
        live && householdId && planReady
            ? `${householdId}:${includeDebts ? 1 : 0}:${includeGoals ? 1 : 0}:${includeAssets ? 1 : 0}`
            : null;

    const [preview, setPreview] = useState<{
        key: string;
        bundle: HouseholdExportBundle | null;
        failed: boolean;
    } | null>(null);

    // Derive from gate + last fetch — do not sync-clear in an effect.
    const bundle = preview && previewKey && preview.key === previewKey ? preview.bundle : null;
    const previewFailed =
        preview && previewKey && preview.key === previewKey ? preview.failed : false;

    useEffect(() => {
        if (!previewKey || !householdId) return;
        let canceled = false;
        void (async () => {
            try {
                const next = await fetchHouseholdExportBundle(householdId, {
                    includeDebts,
                    includeGoals,
                    includeAssets,
                });
                if (!canceled) {
                    setPreview({ key: previewKey, bundle: next, failed: false });
                }
            } catch {
                if (!canceled) {
                    setPreview({ key: previewKey, bundle: null, failed: true });
                }
            }
        })();
        return () => {
            canceled = true;
        };
    }, [previewKey, householdId, includeDebts, includeGoals, includeAssets]);

    async function ensureBundle(): Promise<HouseholdExportBundle | null> {
        if (!householdId || !planReady || !previewKey) return null;
        if (bundle) return bundle;
        const next = await fetchHouseholdExportBundle(householdId, exportAccess);
        setPreview({ key: previewKey, bundle: next, failed: false });
        return next;
    }

    async function exportCsv(periodOnly: boolean) {
        if (!householdId) return;
        setBusy('csv');
        try {
            const data = await ensureBundle();
            if (!data) return;
            const transactions = periodOnly
                ? await fetchTransactionsForExport(householdId, periodKey)
                : data.transactions;
            const stamp = periodOnly ? periodKey : stampToday();
            downloadHouseholdCsv(transactions, data.jars, stamp);
            showToast(
                t(
                    transactions.length === 1
                        ? 'pages.settings.toasts.csv_exported_one'
                        : 'pages.settings.toasts.csv_exported_other',
                    {
                        count: String(transactions.length),
                        periodSuffix: periodOnly
                            ? t('pages.settings.toasts.csv_period_suffix', { period: periodKey })
                            : '',
                    }
                ),
                'success'
            );
        } catch {
            showToast(t('pages.settings.toasts.csv_failed'), 'error');
        } finally {
            setBusy(null);
        }
    }

    async function exportJson() {
        if (!householdId) return;
        setBusy('json');
        try {
            const data = await ensureBundle();
            if (!data) return;
            downloadHouseholdJson(data, stampToday());
            showToast(t('pages.settings.toasts.export_ok'), 'success');
        } catch {
            showToast(t('pages.settings.toasts.json_failed'), 'error');
        } finally {
            setBusy(null);
        }
    }

    async function exportCsvZip() {
        if (!householdId) return;
        setBusy('zip');
        try {
            const data = await ensureBundle();
            if (!data) return;
            downloadHouseholdCsvZip(data, stampToday());
            showToast(t('pages.settings.toasts.csv_zip_ok'), 'success');
        } catch {
            showToast(t('pages.settings.toasts.csv_failed'), 'error');
        } finally {
            setBusy(null);
        }
    }

    const monthTxCount = bundle
        ? bundle.transactions.filter(tx => tx.bookedOn.startsWith(periodKey)).length
        : null;

    const sheets = [
        {
            name: t('pages.settings.panels.export.sheet_settings'),
            count: bundle ? 1 : null,
            cols: t('pages.settings.panels.export.sheet_settings_cols'),
            fullOnly: true,
        },
        {
            name: t('pages.settings.panels.export.sheet_account_settings'),
            count: bundle ? 1 : null,
            cols: t('pages.settings.panels.export.sheet_account_settings_cols'),
            fullOnly: true,
        },
        {
            name: t('pages.settings.panels.export.sheet_parties'),
            count: bundle?.parties.length ?? null,
            cols: t('pages.settings.panels.export.sheet_parties_cols'),
            fullOnly: true,
        },
        {
            name: t('pages.settings.panels.export.sheet_accounts'),
            count: bundle?.accounts.length ?? null,
            cols: t('pages.settings.panels.export.sheet_accounts_cols'),
            fullOnly: true,
        },
        {
            name: t('pages.settings.panels.export.sheet_jars'),
            count: bundle?.jars.length ?? null,
            cols: t('pages.settings.panels.export.sheet_jars_cols'),
            fullOnly: true,
        },
        {
            name: t('pages.settings.panels.export.sheet_income'),
            count: bundle?.income.length ?? null,
            cols: t('pages.settings.panels.export.sheet_income_cols'),
            fullOnly: true,
        },
        {
            name: t('pages.settings.panels.export.sheet_fixed'),
            count: bundle?.fixedCosts.length ?? null,
            cols: t('pages.settings.panels.export.sheet_fixed_cols'),
            fullOnly: true,
        },
        {
            name: t('pages.settings.panels.export.sheet_transactions'),
            count: scope === 'month' ? monthTxCount : (bundle?.transactions.length ?? null),
            cols: t('pages.settings.panels.export.sheet_transactions_cols'),
            fullOnly: false,
        },
        ...(includeDebts
            ? [
                  {
                      name: t('pages.settings.panels.export.sheet_debts'),
                      count: bundle?.debts.length ?? null,
                      cols: t('pages.settings.panels.export.sheet_debts_cols'),
                      fullOnly: true,
                  },
              ]
            : []),
        ...(includeGoals
            ? [
                  {
                      name: t('pages.settings.panels.export.sheet_goals'),
                      count: bundle?.goals.length ?? null,
                      cols: t('pages.settings.panels.export.sheet_goals_cols'),
                      fullOnly: true,
                  },
              ]
            : []),
        {
            name: t('pages.settings.panels.export.sheet_rules'),
            count: bundle?.rules.length ?? null,
            cols: t('pages.settings.panels.export.sheet_rules_cols'),
            fullOnly: true,
        },
    ];

    const scopes = [
        {
            key: 'all' as const,
            label: t('pages.settings.panels.export.scope_everything'),
            desc: t('pages.settings.panels.export.scope_everything_desc'),
        },
        {
            key: 'tx' as const,
            label: t('pages.settings.panels.export.scope_tx'),
            desc: t('pages.settings.panels.export.scope_tx_desc'),
        },
        {
            key: 'month' as const,
            label: t('pages.settings.panels.export.this_month'),
            desc: t('pages.settings.panels.export.scope_month_desc', { period: periodKey }),
        },
    ];

    const visibleSheets = sheets.filter(sheet => scope === 'all' || !sheet.fullOnly);
    const loadingPreview = live && planReady && !bundle && !previewFailed;
    const canDownload = live && planReady && busy === null;

    return (
        <SettingsPanel>
            <SettingsInkCard
                eyebrow={t('pages.settings.panels.export.eyebrow')}
                blurb={t('pages.settings.panels.export.blurb')}>
                <div className="grid gap-2.5 border-b border-line py-2.5">
                    <p className="font-mono text-[9px] font-medium tracking-[0.14em] text-fg-faint uppercase">
                        {t('pages.settings.panels.export.what_goes_in')}
                    </p>
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-2.5">
                        {scopes.map(option => {
                            const on = scope === option.key;
                            return (
                                <button
                                    key={option.key}
                                    type="button"
                                    onClick={() => setScope(option.key)}
                                    className={cn(
                                        'grid gap-1 rounded-[13px] border p-3.5 text-left transition-colors',
                                        on
                                            ? 'border-accent bg-accent-soft'
                                            : 'border-line hover:border-accent/40'
                                    )}>
                                    <span className="flex items-baseline justify-between gap-2">
                                        <span
                                            className={cn(
                                                'text-[13.5px] font-semibold',
                                                on ? 'text-accent' : 'text-fg'
                                            )}>
                                            {option.label}
                                        </span>
                                        {on ? (
                                            <span className="font-mono text-[11px] text-accent">
                                                ✦
                                            </span>
                                        ) : null}
                                    </span>
                                    <span className="font-mono text-[10px] leading-snug text-fg-muted">
                                        {option.desc}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="grid gap-1.5 border-b border-line py-2.5">
                    <p className="font-mono text-[9px] font-medium tracking-[0.14em] text-fg-faint uppercase">
                        {t('pages.settings.panels.export.tabs_heading')}
                    </p>
                    <div className="grid gap-1">
                        {visibleSheets.map(sh => (
                            <span
                                key={sh.name}
                                className="flex flex-wrap items-baseline gap-2 rounded-lg border border-line bg-raised px-2.5 py-1.5">
                                <span className="shrink-0 text-xs font-semibold text-fg">
                                    {sh.name}
                                </span>
                                <span className="shrink-0 font-mono text-[10px] text-accent">
                                    {loadingPreview
                                        ? t('pages.settings.panels.export.sheet_rows_loading')
                                        : sh.count === null
                                          ? t('pages.settings.panels.export.sheet_rows_unknown')
                                          : t(
                                                sh.count === 1
                                                    ? 'pages.settings.panels.export.sheet_rows_one'
                                                    : 'pages.settings.panels.export.sheet_rows_other',
                                                { count: String(sh.count) }
                                            )}
                                </span>
                                <span className="min-w-0 font-mono text-[10px] leading-snug text-fg-muted">
                                    {sh.cols}
                                </span>
                            </span>
                        ))}
                    </div>
                </div>

                <div className="grid gap-2 py-2.5">
                    <div className="flex flex-wrap gap-2.5">
                        <Button
                            className="min-w-0 flex-1 rounded-full font-mono text-[10.5px] tracking-[0.13em] uppercase sm:min-w-[190px]"
                            disabled={!canDownload}
                            onClick={() => {
                                if (scope === 'all') void exportCsvZip();
                                else void exportCsv(scope === 'month');
                            }}>
                            {busy === 'zip' || (busy === 'csv' && scope !== 'all')
                                ? t('pages.settings.working')
                                : scope === 'all'
                                  ? t('pages.settings.panels.export.download_csv_zip')
                                  : t('pages.settings.panels.export.download_csv')}
                        </Button>
                        <Button
                            variant="secondary"
                            className="min-w-0 flex-1 rounded-full font-mono text-[10.5px] tracking-[0.13em] uppercase sm:min-w-[190px]"
                            disabled={!canDownload}
                            onClick={() => {
                                void exportJson();
                            }}>
                            {busy === 'json'
                                ? t('pages.settings.working')
                                : t('pages.settings.panels.export.download_json')}
                        </Button>
                    </div>
                    <p className="font-mono text-[10.5px] leading-relaxed text-pretty text-fg-muted">
                        {t('pages.settings.panels.export.format_note')}
                    </p>
                    {!live ? (
                        <StubNotice
                            prefix={t('ui.statusPage.scaffold')}
                            what={t('pages.settings.panels.export.sign_in_stub')}
                        />
                    ) : null}
                </div>
            </SettingsInkCard>
        </SettingsPanel>
    );
}
