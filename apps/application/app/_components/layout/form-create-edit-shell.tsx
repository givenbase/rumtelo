'use client';

import type { FieldErrors, FieldValues, UseFormReturn } from 'react-hook-form';

import { useTranslations } from '@rumtelo/i18n';
import { Form, FormErrorBox, bindFormSubmit, createFormInvalidHandler } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { useApiErrorFallbacks, useApiErrorMessage } from '@/app/_lib/api-error-messages';
import { ignorePasswordManagersForm } from '@/app/_lib/ignore-password-managers';

type FormCreateEditShellProps<T extends FieldValues> = {
    /** Optional API/mutation error shown above the fields. */
    apiError?: unknown;
    children: React.ReactNode;
    /**
     * Modal/sheet mode: single column + sticky footer action bar.
     * Full-page mode (later): two-column with sidebar — keep `embedded` false.
     */
    embedded?: boolean;
    form: UseFormReturn<T>;
    onError?: (errors: FieldErrors<T>) => void;
    onSubmit: (values: T) => Promise<void> | void;
    /** Save / actions — sticky footer when embedded. */
    sidebar: React.ReactNode;
};

/** Stronger field contrast for forms rendered inside sheets/modals. */
export const embeddedFormSurfaceClass = [
    'text-fg',
    '[&_label]:text-fg-muted',
    '[&_label]:font-semibold',
    '[&_label]:tracking-wide',
    '[&_label]:text-xs',
    '[&_label]:uppercase',
].join(' ');

export const formFieldStackClass = 'grid gap-4';

function AutofillDecoys() {
    return (
        <div
            aria-hidden
            className="pointer-events-none absolute h-0 w-0 overflow-hidden opacity-0"
            tabIndex={-1}>
            <input
                type="text"
                name="username"
                autoComplete="username"
                tabIndex={-1}
                defaultValue=""
            />
            <input
                type="password"
                name="password"
                autoComplete="current-password"
                tabIndex={-1}
                defaultValue=""
            />
        </div>
    );
}

/**
 * Form + layout for create/edit.
 * In embedded (sheet) mode: full-width fields with a sticky footer action bar.
 * Shared create/edit shell — forms stay reusable in page or modal.
 */
export function FormCreateEditShell<T extends FieldValues>({
    apiError,
    children,
    embedded = true,
    form,
    onError,
    onSubmit,
    sidebar,
}: FormCreateEditShellProps<T>) {
    const tForm = useTranslations('ui.form');
    const errorMessages = useApiErrorFallbacks();
    const formatApiMessage = useApiErrorMessage();
    const invalidMessages = {
        title: tForm('incomplete_title'),
        description: tForm('incomplete_description'),
    };
    const handleSubmit = bindFormSubmit(
        form,
        onSubmit,
        onError ?? createFormInvalidHandler(undefined, invalidMessages)
    );
    const errorBox = (
        <FormErrorBox
            apiError={apiError}
            errorMessages={errorMessages}
            resolveUserMessage={formatApiMessage}
            form={form}
            title={tForm('incomplete_title')}
            description={tForm('incomplete_description_highlighted')}
            fieldLabels={{
                api: tForm('fields.api'),
                root: tForm('fields.api'),
                email: tForm('fields.email'),
                password: tForm('fields.password'),
                firstName: tForm('fields.first_name'),
                lastName: tForm('fields.last_name'),
                phone: tForm('fields.phone'),
                name: tForm('fields.name'),
                amount: tForm('fields.amount'),
                note: tForm('fields.note'),
                date: tForm('fields.date'),
                confirmPassword: tForm('fields.confirm_password'),
                newPassword: tForm('fields.new_password'),
            }}
        />
    );

    if (embedded) {
        return (
            <Form {...form}>
                <form
                    className={cn('relative flex min-h-full flex-col', embeddedFormSurfaceClass)}
                    method="post"
                    {...ignorePasswordManagersForm}
                    onSubmit={handleSubmit}>
                    <AutofillDecoys />
                    <div className="min-w-0 flex-1 space-y-4">
                        {errorBox}
                        <fieldset className={cn('min-w-0 border-0 p-0', formFieldStackClass)}>
                            {children}
                        </fieldset>
                    </div>
                    <div className="sticky bottom-0 z-10 -mx-5 mt-6 -mb-5 border-t border-line bg-surface px-5 py-4 shadow-[0_-4px_12px_-4px_rgb(0_0_0_/0.08)]">
                        {sidebar}
                    </div>
                </form>
            </Form>
        );
    }

    return (
        <Form {...form}>
            <form
                method="post"
                {...ignorePasswordManagersForm}
                onSubmit={handleSubmit}
                className={cn(
                    'relative flex flex-col gap-6 lg:flex-row lg:items-start',
                    embeddedFormSurfaceClass
                )}>
                <AutofillDecoys />
                <div className="min-w-0 flex-1 space-y-4">
                    {errorBox}
                    <fieldset className={cn('min-w-0 border-0 p-0', formFieldStackClass)}>
                        {children}
                    </fieldset>
                </div>
                <aside className="w-full shrink-0 rounded-lg border border-line bg-raised p-4 lg:sticky lg:top-4 lg:w-60 lg:self-start">
                    {sidebar}
                </aside>
            </form>
        </Form>
    );
}
