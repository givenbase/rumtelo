'use client';

import { vendorMarkSrc } from '@/app/_lib/vendor-brands';
import { ConfirmActionButton } from '@/components/features/forms/confirm-action-button';
import {
    PresetNameField,
    type NamePresetOption,
} from '@/components/features/forms/preset-name-field';
import { AccountKind, type Account, type Bank } from '@rumtelo/contracts';
import { useTranslations } from '@rumtelo/i18n';
import {
    Button,
    Field,
    Form,
    FormControl,
    FormField,
    FormItem,
    FormMessage,
    Input,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    VendorMark,
} from '@rumtelo/ui';
import { cn, formatIban, isEnumValue, isValidIban, nlIbanBankCode } from '@rumtelo/utils';
import type { UseFormReturn } from 'react-hook-form';

import type { BankAccountFormValues } from '../_utils/settings-form-zod';
import { isIbanStub } from '../_utils/settings-shared';

const MENU_CONTENT = 'rounded-lg border-line bg-surface text-fg shadow-md';
const MENU_ITEM =
    'rounded-md focus:bg-accent/10 focus:text-fg data-[highlighted]:bg-accent/10 data-[highlighted]:text-fg';

export type BankAccountFormProps = {
    form: UseFormReturn<BankAccountFormValues>;
    formKey: string;
    editing: boolean;
    live: boolean;
    canSubmit: boolean;
    saving: boolean;
    bankList: Bank[];
    bankNameOptions: NamePresetOption[];
    bankById: Map<string, Bank>;
    bankId: string;
    selectedBank: Bank | null | undefined;
    selectedIbanCode: string | undefined;
    ibanPlaceholder: string;
    ibanHint: string;
    partnerHint: string | null;
    kind: AccountKind;
    settlementOptions: Account[];
    ibanError: string | null;
    setIbanError: (value: string | null) => void;
    kindLabel: (accountKind: string) => string;
    pickBank: (key: string) => void;
    onBankNameChange: (value: string) => void;
    onSubmit: (values: BankAccountFormValues) => void;
    onCancel: () => void;
    onDelete?: () => void;
    deletePending?: boolean;
    /** Linked Open Banking seats keep the provider IBAN read-only. */
    ibanLocked?: boolean;
};

export function BankAccountForm({
    form,
    formKey,
    editing,
    live,
    canSubmit,
    saving,
    bankList,
    bankNameOptions,
    bankById,
    bankId,
    selectedBank,
    selectedIbanCode,
    ibanPlaceholder,
    ibanHint,
    partnerHint,
    kind,
    settlementOptions,
    ibanError,
    setIbanError,
    kindLabel,
    pickBank,
    onBankNameChange,
    onSubmit,
    onCancel,
    onDelete,
    deletePending,
    ibanLocked = false,
}: BankAccountFormProps) {
    const t = useTranslations();
    return (
        <Form {...form} key={formKey}>
            <form
                className={cn(
                    'grid gap-3 py-2.5',
                    editing ? 'border-t border-accent/20' : 'border-t border-line'
                )}
                onSubmit={form.handleSubmit(onSubmit)}>
                <div className="grid gap-2">
                    <span className="font-mono text-[10px] tracking-[0.14em] text-fg-faint uppercase">
                        {editing
                            ? t('pages.settings.panels.bank.edit_account')
                            : t('pages.settings.panels.bank.which_bank')}
                    </span>
                    {bankList.length === 0 ? (
                        <p className="text-sm text-fg-muted">
                            {t('pages.settings.panels.bank.loading_banks')}
                        </p>
                    ) : (
                        <div className="grid gap-2">
                            <PresetNameField
                                value={bankById.get(bankId)?.name ?? ''}
                                onChange={onBankNameChange}
                                options={bankNameOptions}
                                placeholder={t('pages.settings.panels.bank.search_bank')}
                                freeTextPlaceholder={t('pages.settings.panels.bank.type_bank_name')}
                                lockPresets
                                initialLockedKey={bankById.get(bankId)?.key || undefined}
                                disabled={!live}
                                onClear={() => {
                                    form.setValue('bankId', '');
                                    form.setValue('label', '');
                                }}
                                onSelect={opt => {
                                    pickBank(opt.key);
                                }}
                            />
                            <div className="flex flex-wrap gap-2">
                                {bankList.slice(0, 8).map(bank => {
                                    const mark = vendorMarkSrc({
                                        key: bank.key,
                                        name: bank.name,
                                        logoDomain: bank.logoDomain,
                                        website: bank.website,
                                    });
                                    const selected = bankId === bank.id;
                                    return (
                                        <button
                                            key={bank.key}
                                            type="button"
                                            disabled={!live}
                                            onClick={() => pickBank(bank.key)}
                                            className={cn(
                                                'inline-flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs transition-colors',
                                                selected
                                                    ? 'border-accent bg-accent/10 text-fg'
                                                    : 'border-line text-fg-secondary hover:border-fg-faint hover:text-fg'
                                            )}>
                                            <VendorMark name={mark.name} src={mark.src} size={18} />
                                            {bank.name}
                                        </button>
                                    );
                                })}
                            </div>
                            {partnerHint ? (
                                <p className="text-xs text-fg-muted">{partnerHint}</p>
                            ) : null}
                        </div>
                    )}
                </div>
                <FormField
                    control={form.control}
                    name="label"
                    render={({ field }) => (
                        <FormItem>
                            <Field
                                label={t('pages.settings.panels.bank.account_label')}
                                htmlFor={`acc-name-${formKey}`}
                                hint={t('pages.settings.panels.bank.account_label_hint')}>
                                <FormControl>
                                    <Input
                                        id={`acc-name-${formKey}`}
                                        placeholder={
                                            bankId
                                                ? t('pages.settings.panels.bank.bank_checking', {
                                                      bank:
                                                          bankById.get(bankId)?.name ??
                                                          t(
                                                              'pages.settings.panels.bank.bank_fallback'
                                                          ),
                                                  })
                                                : t('pages.settings.panels.bank.operating_checking')
                                        }
                                        disabled={!live}
                                        {...field}
                                    />
                                </FormControl>
                            </Field>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="iban"
                    render={({ field }) => (
                        <FormItem>
                            <Field
                                label={t('pages.settings.panels.bank.iban')}
                                htmlFor={`acc-iban-${formKey}`}
                                hint={
                                    ibanLocked
                                        ? t('pages.settings.panels.bank.iban_locked_hint')
                                        : (ibanError ?? ibanHint)
                                }>
                                <FormControl>
                                    <Input
                                        id={`acc-iban-${formKey}`}
                                        placeholder={ibanPlaceholder}
                                        aria-invalid={Boolean(ibanError)}
                                        disabled={!live || ibanLocked}
                                        {...field}
                                        onChange={event => {
                                            if (ibanLocked) return;
                                            field.onChange(event);
                                            if (ibanError) setIbanError(null);
                                        }}
                                        onBlur={() => {
                                            if (ibanLocked) return;
                                            field.onBlur();
                                            const trimmed = field.value.trim();
                                            if (!trimmed || isIbanStub(trimmed)) return;
                                            if (!isValidIban(trimmed)) {
                                                setIbanError(
                                                    t('pages.settings.panels.bank.invalid_iban')
                                                );
                                                return;
                                            }
                                            const expected = selectedIbanCode ?? null;
                                            if (expected) {
                                                const actual = nlIbanBankCode(trimmed);
                                                if (actual && actual !== expected) {
                                                    setIbanError(
                                                        t(
                                                            'pages.settings.panels.bank.iban_bank_mismatch_short',
                                                            {
                                                                actual,
                                                                expected,
                                                                bank: selectedBank?.name ?? '',
                                                            }
                                                        )
                                                    );
                                                    return;
                                                }
                                            }
                                            setIbanError(null);
                                            field.onChange(formatIban(trimmed));
                                        }}
                                    />
                                </FormControl>
                            </Field>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="kind"
                    render={({ field }) => (
                        <FormItem>
                            <Field label={t('pages.settings.panels.bank.type')}>
                                <Select
                                    value={field.value}
                                    onValueChange={value => {
                                        if (!isEnumValue(AccountKind, value)) return;
                                        field.onChange(value);
                                        if (value !== AccountKind.CREDIT) {
                                            form.setValue('settlementAccountId', null, {
                                                shouldDirty: true,
                                            });
                                        }
                                    }}
                                    disabled={!live}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent position="popper" className={MENU_CONTENT}>
                                        <SelectItem
                                            value={AccountKind.CHECKING}
                                            className={MENU_ITEM}>
                                            {kindLabel(AccountKind.CHECKING)}
                                        </SelectItem>
                                        <SelectItem
                                            value={AccountKind.SAVINGS}
                                            className={MENU_ITEM}>
                                            {kindLabel(AccountKind.SAVINGS)}
                                        </SelectItem>
                                        <SelectItem
                                            value={AccountKind.CREDIT}
                                            className={MENU_ITEM}>
                                            {kindLabel(AccountKind.CREDIT)}
                                        </SelectItem>
                                        <SelectItem value={AccountKind.CASH} className={MENU_ITEM}>
                                            {kindLabel(AccountKind.CASH)}
                                        </SelectItem>
                                        <SelectItem
                                            value={AccountKind.INVESTMENT}
                                            className={MENU_ITEM}>
                                            {kindLabel(AccountKind.INVESTMENT)}
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </Field>
                        </FormItem>
                    )}
                />
                {kind === AccountKind.CREDIT ? (
                    <FormField
                        control={form.control}
                        name="settlementAccountId"
                        render={({ field }) => (
                            <FormItem>
                                <Field
                                    label={t('pages.settings.panels.bank.pay_from')}
                                    hint={t('pages.settings.panels.bank.pay_from_hint')}>
                                    <Select
                                        value={field.value ?? 'none'}
                                        onValueChange={value =>
                                            field.onChange(value === 'none' ? null : value)
                                        }
                                        disabled={!live || settlementOptions.length === 0}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent position="popper" className={MENU_CONTENT}>
                                            <SelectItem value="none" className={MENU_ITEM}>
                                                {t('pages.settings.panels.bank.pay_from_none')}
                                            </SelectItem>
                                            {settlementOptions.map(row => (
                                                <SelectItem
                                                    key={row.id}
                                                    value={row.id}
                                                    className={MENU_ITEM}>
                                                    {row.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </Field>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                ) : null}
                <div className="flex flex-wrap items-center justify-end gap-2">
                    {editing && onDelete ? (
                        <ConfirmActionButton
                            variant="ghost"
                            className="mr-auto text-danger hover:bg-danger/10 hover:text-danger"
                            disabled={!live || deletePending}
                            pending={deletePending}
                            label={t('ui.button.actions.delete')}
                            confirmLabel={t('ui.form.confirm_delete')}
                            onConfirm={onDelete}
                        />
                    ) : null}
                    <Button type="button" variant="ghost" onClick={onCancel}>
                        {t('pages.settings.cancel')}
                    </Button>
                    <Button type="submit" disabled={!canSubmit}>
                        {saving
                            ? t('pages.settings.working')
                            : editing
                              ? t('ui.form.save_changes')
                              : t('pages.settings.panels.bank.add')}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
