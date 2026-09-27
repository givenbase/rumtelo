'use client';

import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { useLiveQuery } from '@rumtelo/hooks';
import { useTranslations } from '@rumtelo/i18n';
import {
    Button,
    Email,
    Field,
    Form,
    FormControl,
    FormField,
    FormItem,
    FormMessage,
    Input,
    Phone,
} from '@rumtelo/ui';

import { api } from '@/app/_lib/api';
import { apiQuery } from '@/app/_lib/api-hooks';

import { createPracticeUpdateSchema, type PracticeUpdateValues } from '../_utils/practice-form-zod';
import { usePractice } from './practice-context';
import { PracticeInkCard, PracticePageHeader } from './practice-chrome';
import { usePracticeMutation } from './use-practice-mutation';

/** Company profile + billing address — Practice settings → Company tab. */
export function PracticeCompanySettings() {
    const t = useTranslations();
    const { activePractice } = usePractice();

    const detailQuery = useLiveQuery(
        apiQuery.practice.get.queryOptions({
            input: { practiceId: activePractice?.id ?? '' },
        }),
        null,
        Boolean(activePractice)
    );

    const practice = detailQuery.data;

    const updateSchema = createPracticeUpdateSchema(t);
    const form = useForm<PracticeUpdateValues>({
        defaultValues: {
            legalName: '',
            displayName: '',
            billingEmail: '',
            registrationNumber: '',
            vatNumber: '',
            phone: '',
            website: '',
            billingAddress: {
                line1: '',
                line2: '',
                postalCode: '',
                city: '',
                country: 'NL',
            },
        },
        resolver: zodResolver(updateSchema),
    });

    useEffect(() => {
        if (!practice) return;
        form.reset({
            legalName: practice.legalName ?? '',
            displayName: practice.displayName ?? '',
            billingEmail: practice.billingEmail ?? '',
            registrationNumber: practice.registrationNumber ?? '',
            vatNumber: practice.vatNumber ?? '',
            phone: practice.phone ?? '',
            website: practice.website ?? '',
            billingAddress: {
                line1: practice.billingAddress?.line1 ?? '',
                line2: practice.billingAddress?.line2 ?? '',
                postalCode: practice.billingAddress?.postalCode ?? '',
                city: practice.billingAddress?.city ?? '',
                country: practice.billingAddress?.country ?? 'NL',
            },
        });
    }, [practice, form]);

    const save = usePracticeMutation({
        mutationFn: async (values: PracticeUpdateValues) => {
            if (!activePractice) throw new Error('No active practice');
            return api.practice.update({
                practiceId: activePractice.id,
                legalName: values.legalName,
                displayName: values.displayName || undefined,
                billingEmail: values.billingEmail,
                registrationNumber: values.registrationNumber || undefined,
                vatNumber: values.vatNumber || undefined,
                phone: values.phone || undefined,
                website: values.website || undefined,
                billingAddress: {
                    line1: values.billingAddress.line1,
                    line2: values.billingAddress.line2 || undefined,
                    postalCode: values.billingAddress.postalCode,
                    city: values.billingAddress.city,
                    country: values.billingAddress.country,
                },
            });
        },
        invalidateKeys: [apiQuery.practice.get.key(), apiQuery.practice.list.key()],
        successMessage: t('pages.practice.settings.saved'),
    });

    return (
        <div className="grid gap-3">
            <PracticePageHeader
                title={t('pages.practice.settings.tabs.company.label')}
                blurb={t('pages.practice.settings.tabs.company.sub')}
            />

            <Form {...form}>
                <form
                    className="grid gap-3"
                    onSubmit={form.handleSubmit(values => save.mutate(values))}>
                    <PracticeInkCard eyebrow={t('pages.practice.settings.identity_eyebrow')}>
                        <div className="grid gap-3 py-3 sm:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="legalName"
                                render={({ field }) => (
                                    <FormItem className="sm:col-span-2">
                                        <Field
                                            label={t('pages.practice.settings.legal_name')}
                                            htmlFor="p-legal-name">
                                            <FormControl>
                                                <Input
                                                    id="p-legal-name"
                                                    {...field}
                                                    placeholder="Acme Coaching B.V."
                                                />
                                            </FormControl>
                                        </Field>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="displayName"
                                render={({ field }) => (
                                    <FormItem>
                                        <Field
                                            label={t('pages.practice.settings.display_name')}
                                            htmlFor="p-display-name"
                                            hint={t('pages.practice.settings.display_name_hint')}>
                                            <FormControl>
                                                <Input
                                                    id="p-display-name"
                                                    {...field}
                                                    placeholder="Acme Coaching"
                                                />
                                            </FormControl>
                                        </Field>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="billingEmail"
                                render={({ field }) => (
                                    <FormItem>
                                        <Field
                                            label={t('pages.practice.settings.billing_email')}
                                            htmlFor="p-billing-email">
                                            <FormControl>
                                                <Email
                                                    id="p-billing-email"
                                                    {...field}
                                                    placeholder="billing@yourpractice.com"
                                                />
                                            </FormControl>
                                        </Field>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="phone"
                                render={({ field }) => (
                                    <FormItem>
                                        <Field
                                            label={t('pages.practice.settings.phone')}
                                            htmlFor="p-phone">
                                            <FormControl>
                                                <Phone
                                                    value={field.value ?? ''}
                                                    onChange={field.onChange}
                                                    aria-label={t('pages.practice.settings.phone')}
                                                    placeholder="+31 6 ..."
                                                />
                                            </FormControl>
                                        </Field>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="registrationNumber"
                                render={({ field }) => (
                                    <FormItem>
                                        <Field
                                            label={t('pages.practice.settings.registration_number')}
                                            htmlFor="p-reg">
                                            <FormControl>
                                                <Input
                                                    id="p-reg"
                                                    {...field}
                                                    placeholder="12345678"
                                                />
                                            </FormControl>
                                        </Field>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="vatNumber"
                                render={({ field }) => (
                                    <FormItem>
                                        <Field
                                            label={t('pages.practice.settings.vat_number')}
                                            htmlFor="p-vat">
                                            <FormControl>
                                                <Input
                                                    id="p-vat"
                                                    {...field}
                                                    placeholder="NL123456789B01"
                                                />
                                            </FormControl>
                                        </Field>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="website"
                                render={({ field }) => (
                                    <FormItem>
                                        <Field
                                            label={t('pages.practice.settings.website')}
                                            htmlFor="p-website">
                                            <FormControl>
                                                <Input
                                                    id="p-website"
                                                    type="url"
                                                    {...field}
                                                    placeholder="https://yourpractice.com"
                                                />
                                            </FormControl>
                                        </Field>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </PracticeInkCard>

                    <PracticeInkCard eyebrow={t('pages.practice.settings.billing_address_eyebrow')}>
                        <div className="grid gap-3 py-3 sm:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="billingAddress.line1"
                                render={({ field }) => (
                                    <FormItem className="sm:col-span-2">
                                        <Field
                                            label={t('pages.practice.settings.address_line1')}
                                            htmlFor="p-addr1">
                                            <FormControl>
                                                <Input
                                                    id="p-addr1"
                                                    {...field}
                                                    placeholder="Keizersgracht 100"
                                                />
                                            </FormControl>
                                        </Field>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="billingAddress.line2"
                                render={({ field }) => (
                                    <FormItem className="sm:col-span-2">
                                        <Field
                                            label={t('pages.practice.settings.address_line2')}
                                            htmlFor="p-addr2">
                                            <FormControl>
                                                <Input
                                                    id="p-addr2"
                                                    {...field}
                                                    placeholder="Floor 3"
                                                />
                                            </FormControl>
                                        </Field>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="billingAddress.postalCode"
                                render={({ field }) => (
                                    <FormItem>
                                        <Field
                                            label={t('pages.practice.settings.address_postal')}
                                            htmlFor="p-postal">
                                            <FormControl>
                                                <Input
                                                    id="p-postal"
                                                    {...field}
                                                    placeholder="1234 AB"
                                                />
                                            </FormControl>
                                        </Field>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="billingAddress.city"
                                render={({ field }) => (
                                    <FormItem>
                                        <Field
                                            label={t('pages.practice.settings.address_city')}
                                            htmlFor="p-city">
                                            <FormControl>
                                                <Input
                                                    id="p-city"
                                                    {...field}
                                                    placeholder="Amsterdam"
                                                />
                                            </FormControl>
                                        </Field>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </PracticeInkCard>

                    <div className="flex justify-end">
                        <Button type="submit" disabled={save.isPending}>
                            {save.isPending ? '…' : t('pages.practice.settings.save')}
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}
