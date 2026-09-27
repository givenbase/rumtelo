'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';

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
    Typography,
} from '@rumtelo/ui';

import { api } from '@/app/_lib/api';
import { practicePath } from '@/app/_lib/routes';

import { createPracticeFormSchema, type PracticeCreateValues } from '../_utils/practice-form-zod';
import { usePracticeMutation } from './use-practice-mutation';

export function PracticeCreatePage() {
    const t = useTranslations();
    const router = useRouter();

    const schema = createPracticeFormSchema(t);
    const form = useForm<PracticeCreateValues>({
        defaultValues: {
            legalName: '',
            displayName: '',
            billingEmail: '',
            registrationNumber: '',
            vatNumber: '',
            phone: '',
            website: '',
            acceptedTerms: false as unknown as true,
            billingAddress: {
                line1: '',
                line2: '',
                postalCode: '',
                city: '',
                country: 'NL',
            },
        },
        resolver: zodResolver(schema),
    });

    const create = usePracticeMutation({
        mutationFn: async (values: PracticeCreateValues) => {
            return api.practice.create({
                legalName: values.legalName,
                displayName: values.displayName || undefined,
                billingEmail: values.billingEmail,
                registrationNumber: values.registrationNumber || undefined,
                vatNumber: values.vatNumber || undefined,
                phone: values.phone || undefined,
                website: values.website || undefined,
                acceptedTermsAt: new Date().toISOString(),
                billingAddress: {
                    line1: values.billingAddress.line1,
                    line2: values.billingAddress.line2 || undefined,
                    postalCode: values.billingAddress.postalCode,
                    city: values.billingAddress.city,
                    country: values.billingAddress.country,
                },
            });
        },
        successMessage: t('pages.practice.create.created'),
        onSuccess: () => router.push(practicePath()),
    });

    return (
        <div className="mx-auto max-w-2xl py-8">
            {/* Header */}
            <div className="mb-8">
                <p className="font-mono text-[10px] font-medium tracking-[0.14em] text-accent uppercase">
                    ✦ {t('pages.practice.nav.practice_label')}
                </p>
                <Typography as="h1" size="sm" className="mt-1.5">
                    {t('pages.practice.create.title')}
                </Typography>
                <Typography as="p" size="sm" color="muted" className="mt-1.5 text-pretty">
                    {t('pages.practice.create.lead')}
                </Typography>
            </div>

            <Form {...form}>
                <form
                    className="grid gap-6"
                    onSubmit={form.handleSubmit(values => create.mutate(values))}>
                    {/* ── Identity ─────────────────────────────────────────── */}
                    <fieldset className="grid gap-3 rounded-xl border border-line bg-surface p-4 sm:grid-cols-2">
                        <legend className="mb-2 font-mono text-[10px] font-medium tracking-[0.14em] text-accent uppercase sm:col-span-2">
                            Identity
                        </legend>

                        <FormField
                            control={form.control}
                            name="legalName"
                            render={({ field }) => (
                                <FormItem className="sm:col-span-2">
                                    <Field
                                        label={t('pages.practice.create.legal_name')}
                                        htmlFor="c-legal-name">
                                        <FormControl>
                                            <Input
                                                id="c-legal-name"
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
                                        label={t('pages.practice.create.display_name')}
                                        htmlFor="c-display-name"
                                        hint={t('pages.practice.create.display_name_hint')}>
                                        <FormControl>
                                            <Input
                                                id="c-display-name"
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
                                        label={t('pages.practice.create.billing_email')}
                                        htmlFor="c-billing-email">
                                        <FormControl>
                                            <Email
                                                id="c-billing-email"
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
                            name="registrationNumber"
                            render={({ field }) => (
                                <FormItem>
                                    <Field
                                        label={t('pages.practice.create.registration_number')}
                                        htmlFor="c-reg"
                                        hint={t('pages.practice.create.registration_hint')}>
                                        <FormControl>
                                            <Input id="c-reg" {...field} placeholder="12345678" />
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
                                        label={t('pages.practice.create.vat_number')}
                                        htmlFor="c-vat"
                                        hint={t('pages.practice.create.vat_hint')}>
                                        <FormControl>
                                            <Input
                                                id="c-vat"
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
                            name="phone"
                            render={({ field }) => (
                                <FormItem>
                                    <Field
                                        label={t('pages.practice.create.phone')}
                                        htmlFor="c-phone"
                                        hint={t('pages.practice.create.phone_hint')}>
                                        <FormControl>
                                            <Phone
                                                value={field.value ?? ''}
                                                onChange={field.onChange}
                                                aria-label={t('pages.practice.create.phone')}
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
                            name="website"
                            render={({ field }) => (
                                <FormItem>
                                    <Field
                                        label={t('pages.practice.create.website')}
                                        htmlFor="c-website"
                                        hint={t('pages.practice.create.website_hint')}>
                                        <FormControl>
                                            <Input
                                                id="c-website"
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
                    </fieldset>

                    {/* ── Billing address ──────────────────────────────────── */}
                    <fieldset className="grid gap-3 rounded-xl border border-line bg-surface p-4 sm:grid-cols-2">
                        <legend className="mb-2 font-mono text-[10px] font-medium tracking-[0.14em] text-accent uppercase sm:col-span-2">
                            {t('pages.practice.create.billing_address_title')}
                        </legend>

                        <FormField
                            control={form.control}
                            name="billingAddress.line1"
                            render={({ field }) => (
                                <FormItem className="sm:col-span-2">
                                    <Field
                                        label={t('pages.practice.create.address_line1')}
                                        htmlFor="c-addr1">
                                        <FormControl>
                                            <Input
                                                id="c-addr1"
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
                                        label={t('pages.practice.create.address_line2')}
                                        htmlFor="c-addr2"
                                        hint={t('pages.practice.create.address_line2_hint')}>
                                        <FormControl>
                                            <Input id="c-addr2" {...field} placeholder="Floor 3" />
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
                                        label={t('pages.practice.create.address_postal')}
                                        htmlFor="c-postal">
                                        <FormControl>
                                            <Input id="c-postal" {...field} placeholder="1234 AB" />
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
                                        label={t('pages.practice.create.address_city')}
                                        htmlFor="c-city">
                                        <FormControl>
                                            <Input id="c-city" {...field} placeholder="Amsterdam" />
                                        </FormControl>
                                    </Field>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </fieldset>

                    {/* ── Terms ────────────────────────────────────────────── */}
                    <FormField
                        control={form.control}
                        name="acceptedTerms"
                        render={({ field }) => (
                            <FormItem>
                                <div className="flex items-start gap-3">
                                    <FormControl>
                                        {/* Native checkbox — @rumtelo/ui has no Checkbox yet */}
                                        <input
                                            id="c-terms"
                                            type="checkbox"
                                            checked={field.value}
                                            onChange={e => field.onChange(e.target.checked)}
                                            aria-describedby="c-terms-hint"
                                            className="mt-0.5 size-4 shrink-0 cursor-pointer accent-accent"
                                        />
                                    </FormControl>
                                    <div className="grid gap-0.5">
                                        <label
                                            htmlFor="c-terms"
                                            className="cursor-pointer text-sm text-fg">
                                            {t('pages.practice.create.accept_terms')}
                                        </label>
                                        <p id="c-terms-hint" className="text-xs text-fg-muted">
                                            {t('pages.practice.create.accept_terms_hint')}
                                        </p>
                                    </div>
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="flex items-center justify-between gap-3">
                        <p className="text-xs text-fg-muted">
                            {t('pages.practice.create.already_have')}{' '}
                            <Link href={practicePath()} className="text-accent hover:underline">
                                {t('pages.practice.create.go_to_practice')}
                            </Link>
                        </p>
                        <Button type="submit" disabled={create.isPending}>
                            {create.isPending ? '…' : t('pages.practice.create.submit')}
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}
