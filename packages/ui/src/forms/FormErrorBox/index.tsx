'use client';

import type { FieldValues, UseFormReturn } from 'react-hook-form';

import { cn } from '@rumtelo/utils';

type FormErrorBoxProps<T extends FieldValues> = {
    apiError?: unknown;
    className?: string;
    description?: string;
    form: UseFormReturn<T>;
    title?: string;
};

function flattenErrors(
    obj: Record<string, unknown>,
    prefix = ''
): { message: string; path: string }[] {
    return Object.entries(obj).reduce<{ message: string; path: string }[]>((acc, [key, value]) => {
        const path = prefix ? `${prefix}.${key}` : key;
        if (value && typeof value === 'object' && 'message' in value) {
            acc.push({ message: String(value.message), path });
        } else if (Array.isArray(value)) {
            value.forEach(item => {
                if (typeof item === 'string') acc.push({ message: item, path });
                else if (item && typeof item === 'object') {
                    acc.push(...flattenErrors(item as Record<string, unknown>, path));
                }
            });
        } else if (value && typeof value === 'object') {
            acc.push(...flattenErrors(value as Record<string, unknown>, path));
        }
        return acc;
    }, []);
}

function apiErrorMessage(apiError: unknown): string | null {
    if (!apiError) return null;
    if (typeof apiError === 'string') return apiError;
    if (apiError instanceof Error) return apiError.message;
    if (typeof apiError === 'object' && apiError !== null && 'message' in apiError) {
        return String(apiError.message);
    }
    return null;
}

/**
 * Central validation / API error summary for create/edit forms.
 */
export function FormErrorBox<T extends FieldValues>({
    apiError,
    className,
    description = 'Check the highlighted fields and try again.',
    form,
    title = 'Form incomplete',
}: FormErrorBoxProps<T>) {
    const fieldErrors = flattenErrors(form.formState.errors);
    const apiMessage = apiErrorMessage(apiError);

    if (fieldErrors.length === 0 && !apiMessage) return null;

    return (
        <div
            role="alert"
            className={cn(
                'rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger',
                className
            )}>
            <p className="font-semibold">{title}</p>
            <p className="mt-0.5 text-danger/80">{description}</p>
            <ul className="mt-2 list-inside list-disc space-y-0.5">
                {apiMessage ? <li>{apiMessage}</li> : null}
                {fieldErrors.map(err => (
                    <li key={err.path}>
                        <span className="font-medium">{err.path}</span>: {err.message}
                    </li>
                ))}
            </ul>
        </div>
    );
}
