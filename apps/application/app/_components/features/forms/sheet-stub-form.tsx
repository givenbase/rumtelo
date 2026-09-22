'use client';

import { FormInput } from './form-input';
import { useForm } from 'react-hook-form';

import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    Button,
    createFormInvalidHandler,
} from '@rumtelo/ui';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from '@rumtelo/i18n';
import { useMemo } from 'react';

import { useFormDismiss } from '@/app/_lib/use-form-dismiss';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';
import { useAppShell } from '@/components/features/shell/app-shell-context';
import { FormCreateEditShell } from '@/components/layout/form-create-edit-shell';

import { createStubFormSchema, type StubFormSchemaValues } from './form-zod';

type StubValues = StubFormSchemaValues;

export type StubKind = 'session' | 'asset';

type SheetStubFormProps = {
    kind: StubKind;
    defaultValues?: Partial<StubValues>;
    embedded?: boolean;
    mode?: 'create' | 'edit';
    onSuccess?: () => void;
};

/**
 * Placeholder forms for domains without a money API yet (energy session, assets).
 * Jar moves use {@link MoveMoneyForm}.
 */
export function SheetStubForm({
    kind,
    defaultValues,
    embedded = true,
    mode = 'create',
    onSuccess,
}: SheetStubFormProps) {
    const tStub = useTranslations('features.energy.stub_form');
    const tUiForm = useTranslations('ui.form');
    const { showToast } = useAppShell();
    const dismiss = useFormDismiss(onSuccess);
    const { symbol } = useHouseholdCurrency();
    const submitLabel = kind === 'session' ? tStub('save_training') : tStub('save_asset');
    const amountLabel = kind === 'asset' ? tStub('value_label', { symbol }) : undefined;
    const labelPlaceholder =
        kind === 'session' ? tStub('label_placeholder_session') : tStub('label_placeholder_asset');
    const stubSchema = useMemo(() => createStubFormSchema(tUiForm), [tUiForm]);

    const form = useForm<StubValues>({
        defaultValues: {
            label: defaultValues?.label ?? '',
            amount: defaultValues?.amount ?? '',
        },
        resolver: zodResolver(stubSchema),
    });

    const onError = createFormInvalidHandler(
        ({ title, description }) => {
            showToast(description ?? title, 'error');
        },
        {
            title: tUiForm('incomplete_title'),
            description: tUiForm('incomplete_description'),
        }
    );

    async function onSubmit() {
        showToast(
            mode === 'edit'
                ? tStub('saved_local')
                : tStub('saved_local_done', { action: submitLabel }),
            'success'
        );
        dismiss();
    }

    return (
        <FormCreateEditShell
            embedded={embedded}
            form={form}
            onError={onError}
            onSubmit={onSubmit}
            sidebar={
                <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? tUiForm('working') : submitLabel}
                </Button>
            }>
            <FormField
                control={form.control}
                name="label"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>{tUiForm('fields.name')}</FormLabel>
                        <FormControl>
                            <FormInput placeholder={labelPlaceholder} {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            {amountLabel ? (
                <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{amountLabel}</FormLabel>
                            <FormControl>
                                <FormInput
                                    inputMode="decimal"
                                    placeholder={tUiForm('amount_zero')}
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            ) : null}

            <p className="text-xs text-fg-faint">{tStub('no_api_yet')}</p>
        </FormCreateEditShell>
    );
}
