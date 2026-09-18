'use client';

import { api } from '@/app/_lib/api';
import { apiQuery } from '@/app/_lib/api-hooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { useLiveQuery } from '@rumtelo/hooks';
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    Button,
    Typography,
    VendorMark,
    createFormInvalidHandler,
} from '@rumtelo/ui';

import { zodResolver } from '@hookform/resolvers/zod';
import { Cadence, DebtKind, DebtScheduleKind, JarKey } from '@rumtelo/contracts';
import { z } from 'zod';

import { catalogMarkChrome } from '@/app/_lib/party-mark-chrome';
import { partyMark } from '@/app/_lib/vendor-brands';
import { parseAmountToMinorUnits } from '@/app/_lib/money-input';
import { isLiveData } from '@/app/_lib/preview';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';
import { useJarCatalog } from '@/app/_lib/use-jar-catalog';
import { useFormDismiss } from '@/app/_lib/use-form-dismiss';
import { useAppShell } from '@/components/features/shell/app-shell-context';
import { useAuth } from '@/components/features/shell/auth-provider';
import { FormCreateEditShell } from '@/components/layout/form-create-edit-shell';
import { ConfirmActionButton } from './confirm-action-button';
import { FormInput } from './form-input';
import { merchantsToNameOptions } from './merchant-name-options';
import { PresetNameField, type NamePresetOption } from './preset-name-field';
import type { MerchantPreset } from '@rumtelo/contracts';

const moneyInput = z
    .string()
    .min(1, 'Amount is required')
    .refine(
        value => {
            const cents = parseAmountToMinorUnits(value);
            return cents !== null && cents >= 0;
        },
        { message: 'Enter a valid amount' }
    );

const debtFormSchema = z
    .object({
        name: z.string().min(1, 'Who you owe is required').max(120),
        balance: moneyInput,
        interestRate: z
            .string()
            .min(1, 'Interest rate is required')
            .refine(
                value => {
                    const parsed = Number(value.replace(',', '.'));
                    return Number.isFinite(parsed) && parsed >= 0 && parsed <= 100;
                },
                { message: 'Interest must be between 0 and 100' }
            ),
        minimumPayment: z.string().optional(),
        extraPayment: z.string().optional(),
        dueDay: z.string().optional(),
        startedOn: z.string().optional(),
        scheduleKind: z.enum(DebtScheduleKind),
        paymentCadence: z.enum([
            Cadence.WEEKLY,
            Cadence.MONTHLY,
            Cadence.QUARTERLY,
            Cadence.YEARLY,
        ]),
        termPayments: z.string().optional(),
        maturityOn: z.string().optional(),
        linkFixedCost: z.boolean(),
        kind: z.enum(DebtKind),
    })
    .superRefine((value, ctx) => {
        if (value.scheduleKind === DebtScheduleKind.TERM) {
            const count = Number(value.termPayments);
            if (!Number.isFinite(count) || count < 1) {
                ctx.addIssue({
                    code: 'custom',
                    path: ['termPayments'],
                    message: 'Enter how many payments',
                });
            }
        }
        if (value.scheduleKind === DebtScheduleKind.DEADLINE && !value.maturityOn?.trim()) {
            ctx.addIssue({
                code: 'custom',
                path: ['maturityOn'],
                message: 'Pick a deadline',
            });
        }
    });

export type DebtFormValues = z.infer<typeof debtFormSchema>;

const SCHEDULE_OPTIONS: ReadonlyArray<{
    id: DebtScheduleKind;
    label: string;
    hint: string;
}> = [
    { id: DebtScheduleKind.OPEN, label: 'Open', hint: 'No fixed end' },
    { id: DebtScheduleKind.TERM, label: 'Fixed payments', hint: 'e.g. 24 times' },
    { id: DebtScheduleKind.DEADLINE, label: 'Deadline', hint: 'Pay off by a date' },
];

const CADENCE_OPTIONS: ReadonlyArray<{
    id: DebtFormValues['paymentCadence'];
    label: string;
}> = [
    { id: Cadence.WEEKLY, label: 'Weekly' },
    { id: Cadence.MONTHLY, label: 'Monthly' },
    { id: Cadence.QUARTERLY, label: 'Quarterly' },
    { id: Cadence.YEARLY, label: 'Yearly' },
];

type DebtFormProps = {
    defaultValues?: Partial<DebtFormValues>;
    embedded?: boolean;
    mode?: 'create' | 'edit';
    entityId?: string;
    onSuccess?: () => void;
};

export function DebtForm({
    defaultValues,
    embedded = true,
    mode = 'create',
    entityId,
    onSuccess,
}: DebtFormProps) {
    const queryClient = useQueryClient();
    const { householdId } = useAuth();
    const { symbol } = useHouseholdCurrency();
    const { showToast } = useAppShell();
    const dismiss = useFormDismiss(onSuccess);
    const live = isLiveData(householdId);
    const [typeKey, setTypeKey] = useState<string | null>(null);
    const [typeQuery, setTypeQuery] = useState('');
    const [customLender, setCustomLender] = useState(false);

    const debtTypesQuery = useLiveQuery(
        apiQuery.money.catalogs.debtPresets.list.queryOptions({
            input: { householdId: householdId! },
        }),
        [],
        live && mode === 'create'
    );
    const merchantsQuery = useLiveQuery(
        apiQuery.money.catalogs.merchantPresets.list.queryOptions({
            input: { householdId: householdId! },
        }),
        [],
        live
    );
    const debtTypes = debtTypesQuery.data ?? [];
    const merchants = merchantsQuery.data ?? [];
    const { byKey: jarByKey } = useJarCatalog();
    const selectedType = debtTypes.find(option => option.key === typeKey) ?? null;
    const lenderChrome = catalogMarkChrome({
        icon: selectedType?.icon,
        jarKey: JarKey.NECESSITIES,
        jarByKey,
    });
    const lendersForType: MerchantPreset[] = (() => {
        const keys = selectedType?.merchantKeys ?? [];
        if (keys.length === 0) return [];
        const byKey = new Map(merchants.map(merchant => [merchant.key, merchant]));
        return keys
            .map(key => byKey.get(key))
            .filter((merchant): merchant is MerchantPreset => Boolean(merchant));
    })();

    /** Suggested lenders + full merchant catalog (banks, BNPL, …) for typeahead. */
    const fromMerchants = merchantsToNameOptions(merchants);
    const lenderOptions: NamePresetOption[] = fromMerchants;
    const form = useForm<DebtFormValues>({
        defaultValues: {
            name: defaultValues?.name ?? '',
            balance: defaultValues?.balance ?? '',
            interestRate: defaultValues?.interestRate ?? '0',
            minimumPayment: defaultValues?.minimumPayment ?? '',
            extraPayment: defaultValues?.extraPayment ?? '',
            dueDay: defaultValues?.dueDay ?? '',
            startedOn: defaultValues?.startedOn ?? '',
            scheduleKind: defaultValues?.scheduleKind ?? DebtScheduleKind.OPEN,
            paymentCadence: defaultValues?.paymentCadence ?? Cadence.MONTHLY,
            termPayments: defaultValues?.termPayments ?? '',
            maturityOn: defaultValues?.maturityOn ?? '',
            linkFixedCost: defaultValues?.linkFixedCost ?? true,
            kind: defaultValues?.kind ?? DebtKind.LOAN,
        },
        resolver: zodResolver(debtFormSchema),
    });

    const onError = createFormInvalidHandler(({ title, description }) => {
        showToast(description ?? title, 'error');
    });

    const scheduleKind = useWatch({ control: form.control, name: 'scheduleKind' });
    const paymentCadence = useWatch({ control: form.control, name: 'paymentCadence' });

    const saveMutation = useMutation({
        mutationFn: async (values: DebtFormValues) => {
            if (!householdId) throw new Error('No household');
            const balance = parseAmountToMinorUnits(values.balance);
            if (balance === null || balance < 0) throw new Error('Invalid balance');
            const minimumRaw = values.minimumPayment?.trim()
                ? parseAmountToMinorUnits(values.minimumPayment)
                : 0;
            const minimumPayment = minimumRaw === null ? 0 : minimumRaw;
            const extraRaw = values.extraPayment?.trim()
                ? parseAmountToMinorUnits(values.extraPayment)
                : 0;
            const extraPayment = extraRaw === null ? 0 : extraRaw;
            const interestRate = Number(values.interestRate.replace(',', '.'));
            const name = values.name.trim();
            const dueDayRaw = values.dueDay?.trim() ? Number(values.dueDay) : null;
            const dueDay =
                dueDayRaw !== null &&
                Number.isFinite(dueDayRaw) &&
                dueDayRaw >= 1 &&
                dueDayRaw <= 31
                    ? dueDayRaw
                    : null;
            const startedOn = values.startedOn?.trim() || null;
            const termPayments =
                values.scheduleKind === DebtScheduleKind.TERM ? Number(values.termPayments) : null;
            const maturityOn =
                values.scheduleKind === DebtScheduleKind.DEADLINE
                    ? values.maturityOn?.trim() || null
                    : null;

            const schedule = {
                scheduleKind: values.scheduleKind,
                paymentCadence: values.paymentCadence,
                termPayments,
                maturityOn,
                startedOn,
                dueDay,
                extraPayment,
            };

            if (mode === 'edit' && entityId) {
                return api.money.debts.update({
                    id: entityId,
                    householdId,
                    name,
                    kind: values.kind,
                    balance,
                    interestRate,
                    minimumPayment,
                    ...schedule,
                    linkFixedCost: values.linkFixedCost || undefined,
                });
            }
            return api.money.debts.create({
                householdId,
                name,
                kind: values.kind,
                balance,
                originalBalance: balance,
                interestRate,
                minimumPayment,
                closedOn: null,
                linkFixedCost: values.linkFixedCost,
                ...schedule,
            });
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: apiQuery.money.debts.key() });
            void queryClient.invalidateQueries({ queryKey: apiQuery.money.fixedCosts.key() });
            showToast(mode === 'edit' ? 'Debt updated' : 'Debt saved', 'success');
            dismiss();
        },
        onError: () => showToast('Save failed', 'error'),
    });

    const removeMutation = useMutation({
        mutationFn: async () => {
            if (!householdId || !entityId) throw new Error('No household');
            return api.money.debts.remove({ householdId, id: entityId });
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: apiQuery.money.debts.list.key() });
            void queryClient.invalidateQueries({ queryKey: apiQuery.money.debts.plan.key() });
            showToast('Debt deleted', 'success');
            dismiss();
        },
        onError: () => showToast('Delete failed', 'error'),
    });

    async function onSubmit(values: DebtFormValues) {
        if (!live) {
            showToast('Sign in to save debts', 'error');
            return;
        }
        if (mode === 'create' && !typeKey) {
            showToast('Pick a debt type first', 'error');
            return;
        }
        await saveMutation.mutateAsync(values);
    }

    const busy = form.formState.isSubmitting || saveMutation.isPending || removeMutation.isPending;

    const selectedLenderName = useWatch({ control: form.control, name: 'name' }) ?? '';
    const showLenderInput = customLender || lendersForType.length === 0;

    return (
        <FormCreateEditShell
            embedded={embedded}
            form={form}
            onError={onError}
            onSubmit={onSubmit}
            sidebar={
                <div className="grid gap-2">
                    <Button type="submit" className="w-full" disabled={busy}>
                        {saveMutation.isPending || form.formState.isSubmitting
                            ? 'Working…'
                            : mode === 'edit'
                              ? 'Save changes'
                              : 'Save debt'}
                    </Button>
                    {mode === 'edit' && entityId ? (
                        <ConfirmActionButton
                            variant="ghost"
                            className="w-full text-danger hover:bg-danger/10 hover:text-danger"
                            disabled={busy}
                            pending={removeMutation.isPending}
                            label="Delete"
                            confirmLabel="Click again to delete"
                            onConfirm={() => void removeMutation.mutateAsync()}
                        />
                    ) : null}
                </div>
            }>
            {mode === 'create' ? (
                <>
                    <div className="grid gap-2">
                        <p className="font-mono text-[10px] font-semibold tracking-wider text-fg-muted uppercase">
                            What kind of debt?
                        </p>
                        {selectedType ? (
                            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-raised px-3 py-2.5 text-sm">
                                <span className="min-w-0 flex-1 font-medium text-fg">
                                    {selectedType.icon ? `${selectedType.icon} ` : ''}
                                    {selectedType.name}
                                </span>
                                <button
                                    type="button"
                                    className="font-mono text-xs tracking-wide text-accent uppercase hover:underline"
                                    onClick={() => {
                                        setTypeKey(null);
                                        setTypeQuery('');
                                        setCustomLender(false);
                                        form.setValue('name', '');
                                        form.setValue('kind', DebtKind.LOAN);
                                    }}>
                                    Change
                                </button>
                            </div>
                        ) : (
                            <PresetNameField
                                value={typeQuery}
                                onChange={setTypeQuery}
                                placeholder="e.g. student loan"
                                options={debtTypes}
                                onSelect={opt => {
                                    const full = debtTypes.find(preset => preset.key === opt.key);
                                    if (!full) return;
                                    setTypeKey(full.key);
                                    setTypeQuery('');
                                    setCustomLender(false);
                                    form.setValue('kind', full.kind);
                                    form.setValue('name', '');
                                }}
                            />
                        )}
                    </div>

                    {selectedType ? (
                        <div className="grid gap-2">
                            <p className="font-mono text-[10px] font-semibold tracking-wider text-fg-muted uppercase">
                                Who do you owe?
                            </p>
                            {lendersForType.length > 0 && !customLender ? (
                                <div className="flex flex-wrap gap-1.5">
                                    {lendersForType.map(lender => {
                                        const selected =
                                            selectedLenderName.toLowerCase() ===
                                            lender.name.toLowerCase();
                                        const mark = partyMark(
                                            {
                                                key: lender.key,
                                                name: lender.name,
                                                logoDomain: lender.logoDomain,
                                                website: lender.website,
                                            },
                                            lenderChrome
                                        );
                                        return (
                                            <button
                                                key={lender.key}
                                                type="button"
                                                disabled={busy}
                                                className={
                                                    selected
                                                        ? 'inline-flex items-center gap-2 rounded-xl border border-accent bg-accent/15 px-2.5 py-1.5 text-sm text-accent'
                                                        : 'inline-flex items-center gap-2 rounded-xl border border-line bg-raised px-2.5 py-1.5 text-sm text-fg hover:border-accent hover:text-accent'
                                                }
                                                onClick={() =>
                                                    form.setValue('name', lender.name, {
                                                        shouldValidate: true,
                                                    })
                                                }>
                                                <VendorMark
                                                    name={mark.name}
                                                    src={mark.src}
                                                    fallbackIcon={mark.fallbackIcon}
                                                    tone={mark.tone}
                                                    size={20}
                                                />
                                                {lender.name}
                                            </button>
                                        );
                                    })}
                                    <button
                                        type="button"
                                        disabled={busy}
                                        className="inline-flex items-center rounded-xl border border-dashed border-line px-3 py-1.5 text-sm text-fg-muted hover:border-accent hover:text-accent"
                                        onClick={() => {
                                            setCustomLender(true);
                                            form.setValue('name', '', {
                                                shouldValidate: false,
                                            });
                                        }}>
                                        Other…
                                    </button>
                                </div>
                            ) : null}
                            {showLenderInput ? (
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <PresetNameField
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                    options={lenderOptions}
                                                    placeholder={
                                                        lendersForType.length > 0
                                                            ? 'Search lender or bank…'
                                                            : 'e.g. ING, DUO, Klarna'
                                                    }
                                                    freeTextPlaceholder="Type a lender name…"
                                                    disabled={busy}
                                                    onSelect={opt => {
                                                        field.onChange(opt.name);
                                                    }}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            ) : (
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={() => (
                                        <FormItem>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}
                        </div>
                    ) : null}
                </>
            ) : (
                <>
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Who do you owe?</FormLabel>
                                <FormControl>
                                    <PresetNameField
                                        value={field.value}
                                        onChange={field.onChange}
                                        options={lenderOptions}
                                        placeholder="e.g. ING, DUO"
                                        freeTextPlaceholder="Type a lender name…"
                                        disabled={busy}
                                        onSelect={opt => {
                                            field.onChange(opt.name);
                                        }}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="kind"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Type</FormLabel>
                                <FormControl>
                                    <select
                                        className="h-11 w-full rounded-lg border border-line bg-raised px-3 text-sm text-fg focus:border-accent focus:outline-none"
                                        {...field}>
                                        <option value="CREDIT_CARD">Credit card</option>
                                        <option value="LOAN">Loan</option>
                                        <option value="STUDENT">Student loan</option>
                                        <option value="MORTGAGE">Mortgage</option>
                                        <option value="FAMILY">Family</option>
                                        <option value="OTHER">Other</option>
                                    </select>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </>
            )}

            <FormField
                control={form.control}
                name="balance"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Balance ({symbol})</FormLabel>
                        <FormControl>
                            <FormInput inputMode="decimal" placeholder="0,00" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="interestRate"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Interest rate (% per year)</FormLabel>
                        <FormControl>
                            <FormInput inputMode="decimal" placeholder="12,9" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="minimumPayment"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Minimum payment ({symbol})</FormLabel>
                        <FormControl>
                            <FormInput inputMode="decimal" placeholder="0,00" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="extraPayment"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Extra per period ({symbol})</FormLabel>
                        <FormControl>
                            <FormInput inputMode="decimal" placeholder="0,00" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <div className="grid gap-2">
                <p className="font-mono text-[10px] font-semibold tracking-wider text-fg-muted uppercase">
                    How often do you pay?
                </p>
                <div className="flex flex-wrap gap-1.5">
                    {CADENCE_OPTIONS.map(option => {
                        const selected = paymentCadence === option.id;
                        return (
                            <button
                                key={option.id}
                                type="button"
                                disabled={busy}
                                className={
                                    selected
                                        ? 'rounded-xl border border-accent bg-accent/15 px-3 py-1.5 text-sm text-accent'
                                        : 'rounded-xl border border-line bg-raised px-3 py-1.5 text-sm text-fg hover:border-accent'
                                }
                                onClick={() =>
                                    form.setValue('paymentCadence', option.id, {
                                        shouldValidate: true,
                                    })
                                }>
                                {option.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            <FormField
                control={form.control}
                name="dueDay"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Due day (1–31)</FormLabel>
                        <FormControl>
                            <FormInput inputMode="numeric" placeholder="e.g. 28" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="startedOn"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Payments start</FormLabel>
                        <FormControl>
                            <FormInput type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <div className="grid gap-2">
                <p className="font-mono text-[10px] font-semibold tracking-wider text-fg-muted uppercase">
                    Schedule
                </p>
                <div className="grid gap-2 sm:grid-cols-3">
                    {SCHEDULE_OPTIONS.map(option => {
                        const selected = scheduleKind === option.id;
                        return (
                            <button
                                key={option.id}
                                type="button"
                                disabled={busy}
                                className={
                                    selected
                                        ? 'rounded-xl border border-accent bg-accent/15 px-3 py-2.5 text-left'
                                        : 'rounded-xl border border-line bg-raised px-3 py-2.5 text-left hover:border-accent'
                                }
                                onClick={() => {
                                    form.setValue('scheduleKind', option.id, {
                                        shouldValidate: true,
                                    });
                                    if (option.id !== DebtScheduleKind.TERM) {
                                        form.setValue('termPayments', '');
                                    }
                                    if (option.id !== DebtScheduleKind.DEADLINE) {
                                        form.setValue('maturityOn', '');
                                    }
                                }}>
                                <span className="block text-sm font-medium text-fg">
                                    {option.label}
                                </span>
                                <Typography as="span" variant="caption" className="mt-0.5 block">
                                    {option.hint}
                                </Typography>
                            </button>
                        );
                    })}
                </div>
            </div>

            {scheduleKind === DebtScheduleKind.TERM ? (
                <FormField
                    control={form.control}
                    name="termPayments"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Number of payments</FormLabel>
                            <FormControl>
                                <FormInput inputMode="numeric" placeholder="e.g. 24" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            ) : null}

            {scheduleKind === DebtScheduleKind.DEADLINE ? (
                <FormField
                    control={form.control}
                    name="maturityOn"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Pay off by</FormLabel>
                            <FormControl>
                                <FormInput type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            ) : null}

            <FormField
                control={form.control}
                name="linkFixedCost"
                render={({ field }) => (
                    <FormItem>
                        <div className="flex items-start gap-3 rounded-xl border border-line bg-raised px-3 py-3">
                            <input
                                id="debt-link-fixed-cost"
                                type="checkbox"
                                className="mt-1"
                                checked={field.value}
                                onChange={event => field.onChange(event.target.checked)}
                                disabled={busy}
                            />
                            <label htmlFor="debt-link-fixed-cost" className="cursor-pointer">
                                <span className="block text-sm font-medium text-fg">
                                    Also add as Necessities fixed cost
                                </span>
                                <Typography as="span" variant="caption" className="mt-0.5 block">
                                    Keeps the planned payment in your jar budget at this cadence.
                                </Typography>
                            </label>
                        </div>
                    </FormItem>
                )}
            />
        </FormCreateEditShell>
    );
}
