'use client';

import { useMemo } from 'react';

import { AUTH_MIN_PASSWORD_LENGTH } from '@rumtelo/contracts';
import { useTranslations } from '@rumtelo/i18n';
import { z } from 'zod';

const E164_RE = /^\+[1-9]\d{6,14}$/;

/** Localized Zod schemas for website auth forms — contracts keep English wire defaults. */
export function useAuthFormSchemas() {
    const t = useTranslations('ui.form.validation');

    return useMemo(() => {
        const email = z.email(t('email_invalid'));
        const firstName = z.string().trim().min(1, t('first_name_required')).max(80);
        const lastName = z.string().trim().min(1, t('last_name_required')).max(80);
        const password = z
            .string()
            .min(AUTH_MIN_PASSWORD_LENGTH, t('password_min', { count: AUTH_MIN_PASSWORD_LENGTH }));
        const optionalPhone = z
            .string()
            .trim()
            .max(32)
            .superRefine((value, ctx) => {
                if (!value) return;
                if (!E164_RE.test(value)) {
                    ctx.addIssue({ code: 'custom', message: t('phone_e164') });
                }
            });

        const landingSignUp = z.object({
            firstName,
            lastName,
            email,
            terms: z.boolean().refine(value => value, { message: t('terms_required') }),
        });

        const signUp = z.object({
            firstName,
            middleName: z.string().trim().max(80),
            lastName,
            email,
            password,
            phone: optionalPhone,
            dateOfBirth: z.union([z.literal(''), z.iso.date(t('valid_date'))]),
        });

        const forgotPassword = z.object({ email });

        const resetPassword = z
            .object({
                password,
                confirm: z.string(),
            })
            .refine(data => data.password === data.confirm, {
                message: t('passwords_match'),
                path: ['confirm'],
            });

        return {
            landingSignUp,
            signUp,
            forgotPassword,
            resetPassword,
        };
    }, [t]);
}
