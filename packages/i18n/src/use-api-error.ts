'use client';

import { useCallback } from 'react';

import {
    extractApiErrorPayload,
    extractErrorMessage,
    parseApiUserMessage,
    resolveApiUserMessage,
    type ExtractErrorMessageFallbacks,
} from '@rumtelo/utils';

import { useTranslations } from './next-intl';

export function useApiErrorFallbacks(): ExtractErrorMessageFallbacks {
    const t = useTranslations('common.message.error');
    return {
        invalidValue: t('invalid_value'),
        unexpected: t('unexpected'),
        generic: t('generic'),
    };
}

/** Localize a raw API / Better Auth string (i18n key, BA code path via resolve, or BA English). */
export function useApiErrorMessage(): (raw: string, code?: string | null) => string {
    const t = useTranslations('common.message.error.api');
    return useCallback(
        (raw: string, code?: string | null) =>
            resolveApiUserMessage(raw, t, code ? { code, params: undefined } : undefined),
        [t]
    );
}

/** unknown → localized toast / inline copy (keys + Better Auth codes preferred). */
export function useApiError(): (error: unknown) => string {
    const tApi = useTranslations('common.message.error.api');
    const fallbacks = useApiErrorFallbacks();

    return useCallback(
        (error: unknown) => {
            const payload = extractApiErrorPayload(error);
            if (payload) {
                const known = parseApiUserMessage(payload.message, {
                    code: payload.code,
                    params: payload.params,
                });
                if (known) {
                    return known.params ? tApi(known.key, known.params) : tApi(known.key);
                }
            }

            const raw = extractErrorMessage(error, fallbacks);
            return resolveApiUserMessage(raw, tApi, {
                code: payload?.code,
            });
        },
        [fallbacks, tApi]
    );
}
