import type { FieldErrors, FieldValues, UseFormReturn } from 'react-hook-form';

export type FormInvalidNotifyOptions = {
    description?: string;
    title: string;
};

export type FormInvalidNotify = (options: FormInvalidNotifyOptions) => void;

/** Log react-hook-form / zod validation errors for debugging. */
export function logFormValidationErrors<T extends FieldValues>(errors: FieldErrors<T>) {
    if (process.env.NODE_ENV !== 'production') {
        console.warn('[form] validation failed', errors);
    }
}

/**
 * Standard wrapper around react-hook-form submit handling.
 *
 * @example
 * ```tsx
 * const onError = createFormInvalidHandler(notify);
 * <form onSubmit={bindFormSubmit(form, onSubmit, onError)} />
 * ```
 */
export function bindFormSubmit<T extends FieldValues>(
    form: UseFormReturn<T>,
    onSubmit: (values: T) => void | Promise<void>,
    onError?: (errors: FieldErrors<T>) => void
) {
    return form.handleSubmit(onSubmit, onError);
}

/**
 * Default invalid-submit handler: log errors and optionally notify (toast).
 */
export function createFormInvalidHandler(
    notify?: FormInvalidNotify,
    messages?: { title?: string; description?: string }
) {
    return <T extends FieldValues>(errors: FieldErrors<T>) => {
        logFormValidationErrors(errors);
        notify?.({
            description: messages?.description ?? 'Check the required fields and try again.',
            title: messages?.title ?? 'Form incomplete',
        });
    };
}
