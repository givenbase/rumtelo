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
import { useLiveQuery } from '@rumtelo/hooks';
import { useTranslations } from '@rumtelo/i18n';
import { Button, FileDropzone, Form, Icon } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

const ACCEPT = '.xml,.sta,.mt940,.csv,text/csv,text/xml,application/xml';

const statementImportSchema = z.object({
    accountId: z.string(),
    fileName: z.string().nullable(),
    fileContent: z.string().nullable(),
});

type StatementImportValues = z.infer<typeof statementImportSchema>;

/** Catalog bank.key → CSV dialects — labels for mismatch copy only. */
type DialectLabelKey =
    | 'dialect_ing'
    | 'dialect_rabobank'
    | 'dialect_revolut'
    | 'dialect_bunq'
    | 'dialect_knab'
    | 'dialect_asn';

const DIALECT_LABEL: Record<string, DialectLabelKey> = {
    'nl.ing': 'dialect_ing',
    'nl.rabobank': 'dialect_rabobank',
    'nl.revolut': 'dialect_revolut',
    'nl.bunq': 'dialect_bunq',
    'nl.knab': 'dialect_knab',
    'nl.asn': 'dialect_asn',
};

type FormatLabelKey = 'format_camt' | 'format_mt940' | 'format_csv';

const FORMAT_LABEL: Record<string, FormatLabelKey> = {
    camt053: 'format_camt',
    mt940: 'format_mt940',
    csv: 'format_csv',
};

export type StatementImportCardProps = {
    /**
     * `full` = supported-formats tip + upload (import route / modal).
     * `compact` = account + dropzone only (Settings already has eyebrow/blurb).
     */
    variant?: 'full' | 'compact';
    /** When true (modal/page), use sticky footer like other create forms. */
    embedded?: boolean;
    className?: string;
    onSuccess?: () => void;
};

/**
 * Statement upload — format sniffed automatically (CAMT.053 / MT940 / CSV).
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
        },
    });

    const accountId = useWatch({ control: form.control, name: 'accountId' }) ?? '';
    const fileName = useWatch({ control: form.control, name: 'fileName' }) ?? null;
    const fileContent = useWatch({ control: form.control, name: 'fileContent' }) ?? null;

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
    const selectedAccount = accounts.find(row => row.id === selectedId);
    const selectedBank = banks.find(row => row.id === selectedAccount?.bankId);
    const selectedBankKey = selectedBank?.key ?? null;
    const previewEnabled = live && Boolean(householdId && selectedId && fileContent);
    const previewQuery = useQuery({
        queryKey: [
            'money',
            'statement-import-preview',
            householdId,
            selectedId,
            fileName,
            fileContent?.length ?? 0,
        ],
        queryFn: () =>
            api.money.transactions.importCsv({
                householdId: householdId!,
                accountId: selectedId,
                content: fileContent!,
                fileName: fileName ?? undefined,
                dryRun: true,
                format: 'auto',
            }),
        enabled: previewEnabled,
        staleTime: Infinity,
        retry: false,
    });
    const preview = previewQuery.data;

    const importMutation = useMutation({
        mutationFn: async (values: StatementImportValues) => {
            const account = values.accountId || selectedId;
            const content = values.fileContent;
            if (!householdId || !account || !content) throw new Error('No account');
            return api.money.transactions.importCsv({
                householdId,
                accountId: account,
                content,
                fileName: values.fileName ?? undefined,
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
            if (result.detected === 0) {
                showToast(t('toast_none_detected'), 'error');
                return;
            }
            if (result.willImport === 0) {
                showToast(t('toast_all_duplicates', { count: result.duplicates }), 'error');
                return;
            }
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
        if (!account) {
            showToast(t('no_accounts'), 'error');
            return;
        }
        if (!content) {
            showToast(t('empty_file'), 'error');
            return;
        }
        if (!values.accountId) form.setValue('accountId', account);
        importMutation.mutate({ ...values, accountId: account, fileContent: content });
    }

    const busy = importMutation.isPending;
    const accountMismatch = Boolean(preview?.accountMismatch);
    const previewBlocks =
        Boolean(preview) &&
        (preview!.detected === 0 || preview!.willImport === 0 || accountMismatch);
    const canSubmit =
        live &&
        Boolean(selectedId) &&
        Boolean(fileContent) &&
        !busy &&
        !previewQuery.isFetching &&
        !previewBlocks;

    const detectedFormatLabel = (() => {
        const key = preview?.format ? FORMAT_LABEL[preview.format] : null;
        return key ? t(key) : null;
    })();

    const dialectMismatch = (() => {
        if (!accountMismatch) return null;
        const dialect = preview?.csvDialect;
        const fileLabelKey = dialect ? DIALECT_LABEL[dialect] : null;
        return {
            fileBank: fileLabelKey ? t(fileLabelKey) : t('format_csv'),
            accountBank: selectedBank?.name ?? selectedBankKey ?? '—',
        };
    })();

    const previewMessage = (() => {
        if (!fileContent) return null;
        if (previewQuery.isFetching) return t('preview_checking');
        if (previewQuery.isError) return null;
        if (!preview) return null;
        if (accountMismatch) return null;
        if (preview.detected === 0) return t('preview_none');
        if (preview.willImport === 0)
            return t('toast_all_duplicates', { count: preview.duplicates });
        if (preview.duplicates > 0) {
            return t('preview_with_duplicates', {
                count: preview.willImport,
                duplicates: preview.duplicates,
                format: detectedFormatLabel ?? t('format_csv'),
            });
        }
        return t('preview_ready', {
            count: preview.willImport,
            format: detectedFormatLabel ?? t('format_csv'),
        });
    })();

    const previewTone =
        !preview || preview.willImport === 0
            ? 'text-fg-muted'
            : preview.duplicates > 0
              ? 'text-fg-secondary'
              : 'text-fg';

    const sampleLine =
        preview && preview.sample.length > 0 && !accountMismatch
            ? t('preview_samples', { samples: preview.sample.slice(0, 3).join(' · ') })
            : null;

    const fields = (
        <div className="grid gap-5">
            {variant === 'full' ? (
                <section className="grid gap-2">
                    <p className="text-xs font-semibold tracking-wide text-fg-muted uppercase">
                        {t('formats_eyebrow')}
                    </p>
                    <p className="text-sm leading-snug text-fg-secondary">{t('formats_hint')}</p>
                    <p className="font-mono text-[10px] tracking-widest text-fg-muted uppercase">
                        {t('drop_hint')}
                    </p>
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
                {accountMismatch && dialectMismatch ? (
                    <div
                        className="grid gap-2 rounded-xl border border-warning/40 bg-warning/10 px-3.5 py-3"
                        role="alert"
                        aria-live="assertive">
                        <div className="flex items-center gap-2">
                            <Icon
                                name="triangle-alert"
                                className="size-4 shrink-0 text-warning"
                                aria-hidden
                            />
                            <p className="font-mono text-[10px] font-bold tracking-[0.14em] text-warning uppercase">
                                {t('mismatch_eyebrow')}
                            </p>
                        </div>
                        <p className="text-sm leading-snug text-fg">
                            {t('dialect_mismatch', dialectMismatch)}
                        </p>
                    </div>
                ) : previewMessage ? (
                    <p
                        className={cn('text-sm leading-snug', previewTone)}
                        role="status"
                        aria-live="polite">
                        {previewMessage}
                    </p>
                ) : null}
                {sampleLine && preview && preview.willImport > 0 ? (
                    <p className="text-xs leading-snug text-fg-muted">{sampleLine}</p>
                ) : null}
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
