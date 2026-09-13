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
import { z } from 'zod';

import { useFormDismiss } from '@/app/_lib/use-form-dismiss';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';
import { useAppShell } from '@/components/features/shell/app-shell-context';
import { FormCreateEditShell } from '@/components/layout/form-create-edit-shell';

const stubSchema = z.object({
    label: z.string().min(1, 'Name is required').max(80),
    amount: z.string().optional(),
});

type StubValues = z.infer<typeof stubSchema>;

export type StubKind = 'session' | 'asset';

const KIND_COPY: Record<
    StubKind,
    { submit: string; amountLabel?: (symbol: string) => string; labelPlaceholder: string }
> = {
    session: {
        submit: 'Save training',
        labelPlaceholder: 'e.g. running',
    },
    asset: {
        submit: 'Save asset',
        amountLabel: symbol => `Value (${symbol})`,
        labelPlaceholder: 'e.g. bicycle',
    },
};

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
    const { showToast } = useAppShell();
    const dismiss = useFormDismiss(onSuccess);
    const copy = KIND_COPY[kind];
    const { symbol } = useHouseholdCurrency();
    const amountLabel = copy.amountLabel?.(symbol);

    const form = useForm<StubValues>({
        defaultValues: {
            label: defaultValues?.label ?? '',
            amount: defaultValues?.amount ?? '',
        },
        resolver: zodResolver(stubSchema),
    });

    const onError = createFormInvalidHandler(({ title, description }) => {
        showToast(description ?? title, 'error');
    });

    async function onSubmit() {
        showToast(mode === 'edit' ? 'Saved (local)' : `${copy.submit} done (local)`, 'success');
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
                    {form.formState.isSubmitting ? 'Working…' : copy.submit}
                </Button>
            }>
            <FormField
                control={form.control}
                name="label"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                            <FormInput placeholder={copy.labelPlaceholder} {...field} />
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
                                <FormInput inputMode="decimal" placeholder="0,00" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            ) : null}

            <p className="text-xs text-fg-faint">
                No live API for this type yet — the form pattern is ready.
            </p>
        </FormCreateEditShell>
    );
}
