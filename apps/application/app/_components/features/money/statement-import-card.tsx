'use client';

import { api } from '@/app/_lib/api';
import { useApiError } from '@/app/_lib/api-error-messages';
import { apiQuery } from '@/app/_lib/api-hooks';
import { CAPABILITIES } from '@/app/_lib/plan';
import { isLiveData } from '@/app/_lib/preview';
import { countryFromCurrency } from '@/app/_lib/resolve-account-bank';
import { useFormDismiss } from '@/app/_lib/use-form-dismiss';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';
import { BankAccountRow } from '@/components/features/money/bank-account-row';
import { useAppShell } from '@/components/features/shell/app-shell-context';
import { useAuth } from '@/components/features/shell/auth-provider';
import { usePlanCapabilities } from '@/components/features/shell/use-plan-capabilities';
import { embeddedFormSurfaceClass } from '@/components/layout/form-create-edit-shell';
import { zodResolver } from '@hookform/resolvers/zod';
import { StatementImportPreferredFormat } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { useTranslations } from '@rumtelo/i18n';
import { Button, FileDropzone, Form } from '@rumtelo/ui';
import { cn, isEnumValue } from '@rumtelo/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

const ACCEPT = '.xml,.sta,.mt940,.csv,text/csv,text/xml,application/xml';

const PREFERRED_KEY = 'rumtelo.statementImportPreferred';

const LEGACY_PREFERRED: Record<string, StatementImportPreferredFormat> = {
    camt053: StatementImportPreferredFormat.CAMT053,
    mt940: StatementImportPreferredFormat.MT940,
    csv: StatementImportPreferredFormat.CSV,
};

function readPreferred(): StatementImportPreferredFormat {
    if (typeof window === 'undefined') return StatementImportPreferredFormat.CAMT053;
    const raw = window.localStorage.getItem(PREFERRED_KEY);
    if (!raw) return StatementImportPreferredFormat.CAMT053;
    if (isEnumValue(StatementImportPreferredFormat, raw)) return raw;
    return LEGACY_PREFERRED[raw] ?? StatementImportPreferredFormat.CAMT053;
}

const statementImportSchema = z.object({
    accountId: z.string(),
    fileName: z.string().nullable(),
    fileContent: z.string().nullable(),
    preferred: z.enum(StatementImportPreferredFormat),
});

type StatementImportValues = z.infer<typeof statementImportSchema>;

const FORMAT_OPTIONS = [
    { value: StatementImportPreferredFormat.CAMT053, labelKey: 'format_camt' as const },
    { value: StatementImportPreferredFormat.MT940, labelKey: 'format_mt940' as const },
    { value: StatementImportPreferredFormat.CSV, labelKey: 'format_csv' as const },
];

export type StatementImportCardProps = {
    /**
     * `full` = prefer tip + upload (import route / modal).
     * `compact` = account + dropzone only (Settings already has eyebrow/blurb).
     */
    variant?: 'full' | 'compact';
    /** When true (modal/page), use sticky footer like other create forms. */
    embedded?: boolean;
    className?: string;
    onSuccess?: () => void;
};

/**
 * Statement upload — CAMT.053 preferred, MT940 / CSV accepted.
 * Account picker reuses BankAccountRow (same mark + bank chrome as Settings).
 */
export function StatementImportCard({
    variant = 'full',
    embedded = true,
    className,
    onSuccess,
}: StatementImportCardProps) {
    const t = useTranslations('features.money.transactions.statement_import');
    const { householdId } = useAuth();
    const { showToast } = useAppShell();
    const apiError = useApiError();
    const { hasCapability } = usePlanCapabilities();
    const { currency } = useHouseholdCurrency();
    const live = isLiveData(householdId);
    const queryClient = useQueryClient();
    const dismiss = useFormDismiss(onSuccess);

    const form = useForm<StatementImportValues>({
        resolver: zodResolver(statementImportSchema),
        defaultValues: {
            accountId: '',
            fileName: null,
            fileContent: null,
            preferred: readPreferred(),
        },
    });

    const accountId = useWatch({ control: form.control, name: 'accountId' }) ?? '';
    const fileName = useWatch({ control: form.control, name: 'fileName' }) ?? null;
    const fileContent = useWatch({ control: form.control, name: 'fileContent' }) ?? null;
    const preferred =
        useWatch({ control: form.control, name: 'preferred' }) ??
        StatementImportPreferredFormat.CAMT053;

    const accountsQuery = useLiveQuery(
        apiQuery.money.accounts.list.queryOptions({ input: { householdId: householdId! } }),
        [],
        live && Boolean(householdId)
    );
    const banksQuery = useLiveQuery(
        apiQuery.money.catalogs.banks.list.queryOptions({
            input: { householdId: householdId!, country: countryFromCurrency(currency) },
        }),
        [],
        live && Boolean(householdId)
    );
    const accounts = accountsQuery.data ?? [];
    const banks = banksQuery.data ?? [];
    const selectedId =
        accountId || accounts.find(row => row.isPrimary)?.id || accounts[0]?.id || '';

    const importMutation = useMutation({
        mutationFn: async (content: string) => {
            if (!householdId || !selectedId) throw new Error('No account');
            return api.money.transactions.importCsv({
                householdId,
                accountId: selectedId,
                content,
                dryRun: false,
                format: 'auto',
            });
        },
        onSuccess: async result => {
            await Promise.all([
                queryClient.invalidateQueries({
                    queryKey: apiQuery.money.transactions.inbox.key(),
                }),
                queryClient.invalidateQueries({ queryKey: apiQuery.money.transactions.list.key() }),
            ]);
            showToast(
                t('toast_imported', {
                    count: result.willImport,
                    skipped: result.duplicates,
                }),
                'success'
            );
            form.setValue('fileName', null);
            form.setValue('fileContent', null);
            if (embedded || onSuccess) dismiss();
        },
        onError: (error: unknown) => showToast(apiError(error), 'error'),
    });

    if (!hasCapability(CAPABILITIES.moneyImport)) return null;

    function setPreferredFormat(next: StatementImportPreferredFormat) {
        form.setValue('preferred', next);
        window.localStorage.setItem(PREFERRED_KEY, next);
    }

    async function onPickedFile(file: File | null) {
        if (!file) {
            form.setValue('fileName', null);
            form.setValue('fileContent', null);
            return;
        }
        form.setValue('fileName', file.name);
        const content = await file.text();
        if (!content.trim()) {
            form.setValue('fileName', null);
            form.setValue('fileContent', null);
            showToast(t('empty_file'), 'error');
            return;
        }
        form.setValue('fileContent', content);
    }

    function onSubmit(values: StatementImportValues) {
        const content = values.fileContent;
        const account = values.accountId || selectedId;
        if (!account || !content) return;
        if (!values.accountId && account) form.setValue('accountId', account);
        importMutation.mutate(content);
    }

    const busy = importMutation.isPending;
    const canSubmit = live && Boolean(selectedId) && Boolean(fileContent) && !busy;

    const fields = (
        <div className="grid gap-5">
            {variant === 'full' ? (
                <section className="grid gap-2">
                    <p className="text-xs font-semibold tracking-wide text-fg-muted uppercase">
                        {t('prefer_eyebrow')}
                    </p>
                    <p className="text-sm leading-snug text-fg-secondary">{t('prefer_hint')}</p>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {FORMAT_OPTIONS.map(option => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => setPreferredFormat(option.value)}
                                className={cn(
                                    'rounded-full border px-2.5 py-1 font-mono text-[10px] tracking-widest uppercase transition-colors',
                                    preferred === option.value
                                        ? 'border-accent bg-accent/10 text-fg'
                                        : 'border-line text-fg-muted hover:border-fg-faint hover:text-fg'
                                )}>
                                {t(option.labelKey)}
                            </button>
                        ))}
                    </div>
                    <p className="text-xs leading-snug text-fg-muted">{t('after_import')}</p>
                </section>
            ) : null}

            <section className="grid gap-2">
                <span className="text-xs font-semibold tracking-wide text-fg-muted uppercase">
                    {t('account')}
                </span>
                {accounts.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-line px-3 py-3 text-sm text-fg-muted">
                        {t('no_accounts')}
                    </p>
                ) : (
                    <div role="radiogroup" aria-label={t('account')} className="grid gap-2">
                        {accounts.map(account => (
                            <BankAccountRow
                                key={account.id}
                                account={account}
                                banks={banks}
                                markSize={28}
                                selected={account.id === selectedId}
                                disabled={!live || busy}
                                onSelect={() => form.setValue('accountId', account.id)}
                            />
                        ))}
                    </div>
                )}
            </section>

            <section className="grid gap-2">
                <span className="text-xs font-semibold tracking-wide text-fg-muted uppercase">
                    {t('upload_eyebrow')}
                </span>
                <FileDropzone
                    accept={ACCEPT}
                    disabled={!live || !selectedId || busy}
                    density={embedded ? 'default' : 'compact'}
                    idleLabel={t('drop_idle')}
                    activeLabel={t('drop_active')}
                    hint={t('drop_hint')}
                    fileName={fileName}
                    replaceLabel={t('rechoose')}
                    clearLabel={t('clear_file')}
                    onFile={file => void onPickedFile(file)}
                />
            </section>
        </div>
    );

    const submit = (
        <Button type="submit" className="w-full" disabled={!canSubmit}>
            {busy ? t('working') : t('submit')}
        </Button>
    );

    if (embedded) {
        return (
            <Form {...form}>
                <form
                    className={cn(
                        'relative flex min-h-full flex-col',
                        embeddedFormSurfaceClass,
                        className
                    )}
                    method="post"
                    onSubmit={form.handleSubmit(onSubmit)}>
                    <div className="min-w-0 flex-1">{fields}</div>
                    <div className="sticky bottom-0 z-10 -mx-5 mt-5 -mb-5 border-t border-line bg-surface px-5 py-4 shadow-[0_-4px_12px_-4px_rgb(0_0_0_/0.08)]">
                        {submit}
                    </div>
                </form>
            </Form>
        );
    }

    return (
        <Form {...form}>
            <form
                className={cn(
                    'relative flex flex-col gap-4 py-3.5',
                    embeddedFormSurfaceClass,
                    className
                )}
                method="post"
                onSubmit={form.handleSubmit(onSubmit)}>
                {fields}
                <div className="pt-1 pb-0.5">{submit}</div>
            </form>
        </Form>
    );
}
