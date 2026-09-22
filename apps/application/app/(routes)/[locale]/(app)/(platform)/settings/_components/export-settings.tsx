'use client';

import { api } from '@/app/_lib/api';
import { useState } from 'react';

import { useTranslations } from '@rumtelo/i18n';
import { Button, StubNotice } from '@rumtelo/ui';
import { cn, toPeriodKey } from '@rumtelo/utils';

import { downloadTextFile, toCsv } from '@/app/_lib/download';
import { isLiveData } from '@/app/_lib/preview';
import { useAppShell } from '@/components/features/shell/app-shell-context';
import { useAuth } from '@/components/features/shell/auth-provider';

import { SettingsInkCard, SettingsPanel } from './settings-chrome';

export function ExportSettings() {
    const t = useTranslations();
    const { householdId } = useAuth();
    const { showToast, period } = useAppShell();
    const live = isLiveData(householdId);
    const [busy, setBusy] = useState<'csv' | 'json' | null>(null);
    const [scope, setScope] = useState<'all' | 'tx' | 'month'>('all');

    async function exportCsv(periodOnly: boolean) {
        if (!householdId) return;
        setBusy('csv');
        try {
            const periodKey = toPeriodKey(period.year, period.month);
            const { items } = await api.money.transactions.list({
                householdId,
                limit: 200,
                ...(periodOnly ? { period: periodKey } : {}),
            });
            const jars = await api.money.jars.list({ householdId });
            const jarName = new Map(jars.map(j => [j.id, j.name]));
            const rows = items.map(transaction => ({
                id: transaction.id,
                bookedOn: transaction.bookedOn,
                description: transaction.description,
                counterparty: transaction.counterparty ?? '',
                amountCents: transaction.amount,
                status: transaction.status,
                jar: transaction.jarId ? (jarName.get(transaction.jarId) ?? transaction.jarId) : '',
                categoryId: transaction.categoryId ?? '',
            }));
            const stamp = periodOnly ? periodKey : new Date().toISOString().slice(0, 10);
            downloadTextFile(
                `rumtelo-transactions-${stamp}.csv`,
                toCsv(rows),
                'text/csv;charset=utf-8'
            );
            showToast(
                t(
                    rows.length === 1
                        ? 'pages.settings.toasts.csv_exported_one'
                        : 'pages.settings.toasts.csv_exported_other',
                    {
                        count: String(rows.length),
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
            const [jars, income, fixedCosts, debts, goals, rules, transactions] = await Promise.all(
                [
                    api.money.jars.list({ householdId }),
                    api.money.income.list({ householdId }),
                    api.money.fixedCosts.list({ householdId }),
                    api.money.debts.list({ householdId }),
                    api.money.goals.list({ householdId }),
                    api.money.rules.list({ householdId }),
                    api.money.transactions.list({ householdId, limit: 200 }),
                ]
            );
            const payload = {
                exportedAt: new Date().toISOString(),
                householdId,
                jars,
                income,
                fixedCosts,
                debts,
                goals,
                rules,
                transactions: transactions.items,
            };
            const stamp = new Date().toISOString().slice(0, 10);
            downloadTextFile(
                `rumtelo-export-${stamp}.json`,
                JSON.stringify(payload, null, 2),
                'application/json'
            );
            showToast(t('pages.settings.toasts.export_ok'), 'success');
        } catch {
            showToast(t('pages.settings.toasts.json_failed'), 'error');
        } finally {
            setBusy(null);
        }
    }

    const periodKey = toPeriodKey(period.year, period.month);

    const sheets = [
        {
            name: t('pages.settings.panels.export.sheet_jars'),
            rows: t('pages.settings.panels.export.sheet_jars_rows'),
            cols: t('pages.settings.panels.export.sheet_jars_cols'),
            fullOnly: true,
        },
        {
            name: t('pages.settings.panels.export.sheet_income'),
            rows: t('pages.settings.panels.export.sheet_income_rows'),
            cols: t('pages.settings.panels.export.sheet_income_cols'),
            fullOnly: true,
        },
        {
            name: t('pages.settings.panels.export.sheet_fixed'),
            rows: t('pages.settings.panels.export.sheet_fixed_rows'),
            cols: t('pages.settings.panels.export.sheet_fixed_cols'),
            fullOnly: true,
        },
        {
            name: t('pages.settings.panels.export.sheet_transactions'),
            rows:
                scope === 'month'
                    ? t('pages.settings.panels.export.sheet_transactions_rows_month')
                    : t('pages.settings.panels.export.sheet_transactions_rows_ledger'),
            cols: t('pages.settings.panels.export.sheet_transactions_cols'),
            fullOnly: false,
        },
        {
            name: t('pages.settings.panels.export.sheet_debts'),
            rows: t('pages.settings.panels.export.sheet_debts_rows'),
            cols: t('pages.settings.panels.export.sheet_debts_cols'),
            fullOnly: true,
        },
        {
            name: t('pages.settings.panels.export.sheet_goals'),
            rows: t('pages.settings.panels.export.sheet_goals_rows'),
            cols: t('pages.settings.panels.export.sheet_goals_cols'),
            fullOnly: true,
        },
        {
            name: t('pages.settings.panels.export.sheet_rules'),
            rows: t('pages.settings.panels.export.sheet_rules_rows'),
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
                                    {sh.rows}
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
                            disabled={!live || busy !== null}
                            onClick={() => {
                                showToast(t('pages.settings.panels.export.excel_coming'), 'info');
                            }}>
                            {t('pages.settings.panels.export.download_excel')}
                        </Button>
                        <Button
                            variant="secondary"
                            className="min-w-0 flex-1 rounded-full font-mono text-[10.5px] tracking-[0.13em] uppercase sm:min-w-[190px]"
                            disabled={!live || busy !== null}
                            onClick={() => {
                                if (scope === 'all') void exportJson();
                                else void exportCsv(scope === 'month');
                            }}>
                            {busy
                                ? t('pages.settings.working')
                                : scope === 'all'
                                  ? t('pages.settings.panels.export.download_json')
                                  : t('pages.settings.panels.export.download_csv')}
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
