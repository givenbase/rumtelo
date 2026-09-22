'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

import type { ContactSubmitInput, ContactTopic } from '@rumtelo/contracts';
import { ContactSubmitInput as ContactSubmitSchema } from '@rumtelo/contracts';
import { useTranslations } from '@rumtelo/i18n';
import {
    Button,
    Email,
    Form,
    FormControl,
    FormErrorBox,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    Input,
    Select,
    Textarea,
    bindFormSubmit,
    createFormInvalidHandler,
} from '@rumtelo/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { useApiErrorFallbacks, useApiErrorMessage } from '@/app/_lib/api-error-messages';
import { api } from '@/lib/api';

const TOPICS = ['support', 'press', 'privacy', 'other'] as const satisfies readonly ContactTopic[];

/** Localized contact form → `api.contact.submit` (Resend). */
export function ContactForm() {
    const t = useTranslations();
    const tv = useTranslations('ui.form.validation');
    const errorMessages = useApiErrorFallbacks();
    const formatApiMessage = useApiErrorMessage();
    const [apiError, setApiError] = useState<unknown>(null);
    const [sent, setSent] = useState(false);

    const schema = useMemo(
        () =>
            ContactSubmitSchema.extend({
                name: z.string().trim().min(1, tv('name_required')).max(120),
                email: z.email(tv('email_invalid')),
                message: z
                    .string()
                    .trim()
                    .min(10, tv('message_min', { count: 10 }))
                    .max(5000),
            }),
        [tv]
    );

    const form = useForm<ContactSubmitInput>({
        defaultValues: {
            name: '',
            email: '',
            topic: 'support',
            message: '',
        },
        mode: 'onTouched',
        resolver: zodResolver(schema),
    });

    const onError = createFormInvalidHandler(undefined, {
        title: t('ui.form.incomplete_title'),
        description: t('ui.form.incomplete_description'),
    });

    async function onSubmit(values: ContactSubmitInput) {
        setApiError(null);
        try {
            await api.contact.submit(values);
            setSent(true);
            form.reset({ name: '', email: '', topic: values.topic, message: '' });
        } catch (error) {
            setApiError(error);
        }
    }

    const busy = form.formState.isSubmitting;

    if (sent) {
        return (
            <div className="grid gap-4 rounded-xl border border-line bg-chrome p-6">
                <div className="grid gap-1.5">
                    <p className="font-display text-lg font-semibold tracking-tight text-fg">
                        {t('pages.support.contact.form.success_title')}
                    </p>
                    <p className="text-sm leading-relaxed text-fg-secondary">
                        {t('pages.support.contact.form.success_body')}
                    </p>
                </div>
                <Button
                    type="button"
                    variant="secondary"
                    className="w-fit"
                    onClick={() => {
                        setSent(false);
                        setApiError(null);
                    }}>
                    {t('pages.support.contact.form.send_another')}
                </Button>
            </div>
        );
    }

    return (
        <Form {...form}>
            <form
                className="grid gap-4 rounded-xl border border-line bg-chrome p-6"
                onSubmit={bindFormSubmit(form, onSubmit, onError)}
                noValidate>
                <FormErrorBox
                    apiError={apiError}
                    errorMessages={errorMessages}
                    resolveUserMessage={formatApiMessage}
                    form={form}
                    title={t('ui.form.incomplete_title')}
                    description={t('ui.form.incomplete_description_highlighted')}
                    fieldLabels={{
                        api: t('ui.form.fields.api'),
                        root: t('ui.form.fields.api'),
                        name: t('pages.support.contact.form.name'),
                        email: t('pages.support.contact.form.email'),
                        topic: t('pages.support.contact.form.topic'),
                        message: t('pages.support.contact.form.message'),
                    }}
                />

                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t('pages.support.contact.form.name')}</FormLabel>
                            <FormControl>
                                <Input
                                    {...field}
                                    autoComplete="name"
                                    placeholder={t('pages.support.contact.form.name_placeholder')}
                                    disabled={busy}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t('pages.support.contact.form.email')}</FormLabel>
                            <FormControl>
                                <Email
                                    {...field}
                                    autoComplete="email"
                                    placeholder={t('pages.support.contact.form.email_placeholder')}
                                    disabled={busy}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="topic"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t('pages.support.contact.form.topic')}</FormLabel>
                            <FormControl>
                                <Select {...field} disabled={busy}>
                                    {TOPICS.map(topic => (
                                        <option key={topic} value={topic}>
                                            {t(`pages.support.contact.form.topics.${topic}`)}
                                        </option>
                                    ))}
                                </Select>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t('pages.support.contact.form.message')}</FormLabel>
                            <FormControl>
                                <Textarea
                                    {...field}
                                    rows={6}
                                    placeholder={t(
                                        'pages.support.contact.form.message_placeholder'
                                    )}
                                    disabled={busy}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <Button type="submit" disabled={busy} className="w-fit">
                    {busy
                        ? t('pages.support.contact.form.submitting')
                        : t('pages.support.contact.form.submit')}
                </Button>
            </form>
        </Form>
    );
}
