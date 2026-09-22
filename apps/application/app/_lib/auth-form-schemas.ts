'use client';

import { useMemo } from 'react';

import { AUTH_MIN_PASSWORD_LENGTH } from '@rumtelo/contracts';
import { useTranslations } from '@rumtelo/i18n';
import { z } from 'zod';

/** Localized Zod schemas for application auth forms — contracts keep English wire defaults. */
export function useAuthFormSchemas() {
    const t = useTranslations('ui.form.validation');

    return useMemo(() => {
        const email = z.email(t('email_invalid'));
        const password = z
            .string()
            .min(AUTH_MIN_PASSWORD_LENGTH, t('password_min', { count: AUTH_MIN_PASSWORD_LENGTH }));

        return {
            signIn: z.object({ email, password }),
        };
    }, [t]);
}
