'use client';

import type { FieldValues, UseFormReturn } from 'react-hook-form';

import { cn, extractErrorMessage, getOrpcValidationIssues } from '@rumtelo/utils';

type FormErrorBoxProps<T extends FieldValues> = {
    apiError?: unknown;
    className?: string;
    description?: string;
    form: UseFormReturn<T>;
    title?: string;
};

type ErrorItem = { message: string; path: string };

function flattenErrors(obj: Record<string, unknown>, prefix = ''): ErrorItem[] {
    return Object.entries(obj).reduce<ErrorItem[]>((acc, [key, value]) => {
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

function processApiError(error: unknown): ErrorItem[] {
    if (!error) return [];

    const issues = getOrpcValidationIssues(error);
    if (issues.length > 0) {
        return issues.map(issue => ({
            message: issue.message,
            path: issue.path || 'api',
        }));
    }

    return [{ message: extractErrorMessage(error), path: 'api' }];
}

/** `firstName` → `First name`; `api` stays as-is. */
function formatFieldName(path: string): string {
    if (path === 'api' || path === 'root') return 'API';

    const fieldName = path.split('.').pop() || path;
    return fieldName
        .replace(/([A-Z])/g, ' $1')
        .replace(/[._-]+/g, ' ')
        .replace(/^./, str => str.toUpperCase())
        .trim();
}

/**
 * Central validation / API error summary for create/edit forms.
 * Understands RHF field errors and oRPC `{ data: { issues } }` payloads.
 */
export function FormErrorBox<T extends FieldValues>({
    apiError,
    className,
    description = 'Check the highlighted fields and try again.',
    form,
    title = 'Form incomplete',
}: FormErrorBoxProps<T>) {
    const fieldErrors = flattenErrors(form.formState.errors);
    const apiErrors = apiError ? processApiError(apiError) : [];
    const errorItems = [...fieldErrors, ...apiErrors];

    if (errorItems.length === 0) return null;

    return (
        <div
            role="alert"
            aria-live="polite"
            className={cn(
                'rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger',
                className
            )}>
            <p className="font-semibold">{title}</p>
            <p className="mt-0.5 text-danger/80">{description}</p>
            <ul className="mt-2 list-inside list-disc space-y-0.5">
                {errorItems.map(err => (
                    <li key={`${err.path}:${err.message}`}>
                        {err.path === 'api' || err.path === 'root' ? (
                            err.message
                        ) : (
                            <>
                                <span className="font-medium">{formatFieldName(err.path)}</span>:{' '}
                                {err.message}
                            </>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}

export type { FormErrorBoxProps };
