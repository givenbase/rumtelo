'use client';

import { useRef, useState } from 'react';

import { ArchiveRestorePayload, type ArchiveRestoreResult } from '@rumtelo/contracts';
import { useTranslations } from '@rumtelo/i18n';
import { Button, StubNotice } from '@rumtelo/ui';

import { api } from '@/app/_lib/api';
import { isLiveData } from '@/app/_lib/preview';
import { useHouseholdShell } from '@/components/features/shell/household-shell-context';
import { useAuth } from '@/components/features/shell/auth-provider';
import { usePlanCapabilities } from '@/components/features/shell/use-plan-capabilities';

import { SettingsInkCard, SettingsPanel } from './settings-chrome';

type Busy = 'preview' | 'import' | null;

function sectionLine(
    t: ReturnType<typeof useTranslations>,
    label: string,
    section: { willImport: number; skipped: number; skippedPlan: number }
) {
    const parts = [
        t('pages.settings.panels.import.will', { count: String(section.willImport) }),
        t('pages.settings.panels.import.skipped', { count: String(section.skipped) }),
    ];
    if (section.skippedPlan > 0) {
        parts.push(
            t('pages.settings.panels.import.skipped_plan', {
                count: String(section.skippedPlan),
            })
        );
    }
    return `${label}: ${parts.join(' · ')}`;
}

export function ImportSettings() {
    const t = useTranslations();
    const { householdId } = useAuth();
    const { showToast } = useHouseholdShell();
    const { planReady } = usePlanCapabilities();
    const live = isLiveData(householdId);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [busy, setBusy] = useState<Busy>(null);
    const [payload, setPayload] = useState<ArchiveRestorePayload | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const [preview, setPreview] = useState<ArchiveRestoreResult | null>(null);

    function clear() {
        setPayload(null);
        setFileName(null);
        setPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }

    async function onFile(file: File | null) {
        if (!file) return;
        try {
            const text = await file.text();
            const parsed = ArchiveRestorePayload.safeParse(JSON.parse(text));
            if (!parsed.success) {
                clear();
                showToast(t('pages.settings.toasts.import_invalid'), 'error');
                return;
            }
            setPayload(parsed.data);
            setFileName(file.name);
            setPreview(null);
        } catch {
            clear();
            showToast(t('pages.settings.toasts.import_invalid'), 'error');
        }
    }

    async function run(dryRun: boolean) {
        if (!householdId || !payload) return;
        setBusy(dryRun ? 'preview' : 'import');
        try {
            const result = await api.money.archive.restore({
                householdId,
                payload,
                dryRun,
                applyJarSplit: true,
            });
            setPreview(result);
            showToast(
                t(
                    dryRun
                        ? 'pages.settings.toasts.import_preview_ok'
                        : 'pages.settings.toasts.import_ok'
                ),
                'success'
            );
        } catch {
            showToast(t('pages.settings.toasts.import_failed'), 'error');
        } finally {
            setBusy(null);
        }
    }

    const canAct = live && planReady && busy === null && payload !== null;

    return (
        <SettingsPanel>
            <SettingsInkCard
                eyebrow={t('pages.settings.panels.import.eyebrow')}
                blurb={t('pages.settings.panels.import.blurb')}>
                <div className="grid gap-2.5 py-2.5">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/json,.json"
                        className="sr-only"
                        onChange={event => {
                            void onFile(event.target.files?.[0] ?? null);
                        }}
                    />
                    <div className="flex flex-wrap gap-2.5">
                        <Button
                            variant="secondary"
                            className="min-w-0 flex-1 rounded-full font-mono text-[10.5px] tracking-[0.13em] uppercase sm:min-w-[190px]"
                            disabled={!live || !planReady || busy !== null}
                            onClick={() => fileInputRef.current?.click()}>
                            {fileName ?? t('pages.settings.panels.import.choose')}
                        </Button>
                        <Button
                            className="min-w-0 flex-1 rounded-full font-mono text-[10.5px] tracking-[0.13em] uppercase sm:min-w-[190px]"
                            disabled={!canAct}
                            onClick={() => {
                                void run(true);
                            }}>
                            {busy === 'preview'
                                ? t('pages.settings.working')
                                : t('pages.settings.panels.import.preview')}
                        </Button>
                    </div>
                    <p className="font-mono text-[10.5px] leading-relaxed text-pretty text-fg-muted">
                        {t('pages.settings.panels.import.format_note')}
                    </p>
                    {!live ? (
                        <StubNotice
                            prefix={t('ui.statusPage.scaffold')}
                            what={t('pages.settings.panels.import.sign_in_stub')}
                        />
                    ) : null}
                    {preview ? (
                        <div className="grid gap-1.5 rounded-[13px] border border-line bg-raised p-3.5">
                            <p className="text-[13px] font-semibold text-fg">
                                {t('pages.settings.panels.import.result_title')}
                                {preview.dryRun ? '' : ' ✓'}
                            </p>
                            <p className="font-mono text-[10px] text-fg-muted">
                                {preview.jarsSplitUpdated
                                    ? t('pages.settings.panels.import.split_ok')
                                    : t('pages.settings.panels.import.split_skip')}
                            </p>
                            {[
                                sectionLine(
                                    t,
                                    t('pages.settings.panels.export.sheet_income'),
                                    preview.income
                                ),
                                sectionLine(
                                    t,
                                    t('pages.settings.panels.export.sheet_fixed'),
                                    preview.fixedCosts
                                ),
                                sectionLine(
                                    t,
                                    t('pages.settings.panels.export.sheet_debts'),
                                    preview.debts
                                ),
                                sectionLine(
                                    t,
                                    t('pages.settings.panels.export.sheet_goals'),
                                    preview.goals
                                ),
                                sectionLine(
                                    t,
                                    t('pages.settings.panels.export.sheet_rules'),
                                    preview.rules
                                ),
                                sectionLine(
                                    t,
                                    t('pages.settings.panels.export.sheet_transactions'),
                                    preview.transactions
                                ),
                            ].map(line => (
                                <p key={line} className="font-mono text-[10px] text-fg-muted">
                                    {line}
                                </p>
                            ))}
                            {preview.dryRun ? (
                                <div className="flex flex-wrap gap-2.5 pt-1">
                                    <Button
                                        className="rounded-full font-mono text-[10.5px] tracking-[0.13em] uppercase"
                                        disabled={!canAct}
                                        onClick={() => {
                                            void run(false);
                                        }}>
                                        {busy === 'import'
                                            ? t('pages.settings.working')
                                            : t('pages.settings.panels.import.confirm')}
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        className="rounded-full font-mono text-[10.5px] tracking-[0.13em] uppercase"
                                        disabled={busy !== null}
                                        onClick={clear}>
                                        {t('pages.settings.panels.import.clear')}
                                    </Button>
                                </div>
                            ) : null}
                        </div>
                    ) : null}
                </div>
            </SettingsInkCard>
        </SettingsPanel>
    );
}
