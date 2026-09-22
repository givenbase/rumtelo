'use client';

import type { FieldValues, UseFormReturn } from 'react-hook-form';

import {
    cn,
    extractErrorMessage,
    getOrpcValidationIssues,
    type ExtractErrorMessageFallbacks,
} from '@rumtelo/utils';

type FormErrorBoxProps<T extends FieldValues> = {
    apiError?: unknown;
    className?: string;
    description?: string;
    errorMessages?: ExtractErrorMessageFallbacks;
    /** Optional path → label map so field names stay locale-aware. */
    fieldLabels?: Record<string, string>;
    form: UseFormReturn<T>;
    /** Optional post-process for known English API messages. */
    resolveUserMessage?: (raw: string) => string;
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

function processApiError(
    error: unknown,
    messages?: ExtractErrorMessageFallbacks,
    resolveUserMessage?: (raw: string) => string
): ErrorItem[] {
    if (!error) return [];

    const localize = (message: string) => resolveUserMessage?.(message) ?? message;

    const issues = getOrpcValidationIssues(error);
    if (issues.length > 0) {
        return issues.map(issue => ({
            message: localize(issue.message),
            path: issue.path || 'api',
        }));
    }

    return [{ message: localize(extractErrorMessage(error, messages)), path: 'api' }];
}

/** `firstName` → `First name`; `api` stays as-is. Prefer `fieldLabels` from i18n. */
function formatFieldName(path: string, fieldLabels?: Record<string, string>): string {
    if (path === 'api' || path === 'root') return fieldLabels?.api ?? fieldLabels?.root ?? 'API';

    const leaf = path.split('.').pop() || path;
    const mapped = fieldLabels?.[path] ?? fieldLabels?.[leaf];
    if (mapped) return mapped;

    return leaf
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
    errorMessages,
    fieldLabels,
    form,
    resolveUserMessage,
    title = 'Form incomplete',
}: FormErrorBoxProps<T>) {
    const fieldErrors = flattenErrors(form.formState.errors);
    const apiErrors = apiError ? processApiError(apiError, errorMessages, resolveUserMessage) : [];
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
                                <span className="font-medium">
                                    {formatFieldName(err.path, fieldLabels)}
                                </span>
                                : {err.message}
                            </>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}

export type { FormErrorBoxProps };
