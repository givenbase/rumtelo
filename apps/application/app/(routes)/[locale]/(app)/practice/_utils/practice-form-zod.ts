/**
 * Practice form schemas — shared between create and settings pages.
 * Mirrors the contract shapes from @rumtelo/contracts.
 */
import { z } from 'zod';

import { PracticeClientAccess, PracticeRole } from '@rumtelo/contracts';
import type { useTranslations } from '@rumtelo/i18n';

/** 2-char ISO country code (billing address only). */
const CountryCode = z.string().length(2, 'Must be a 2-letter country code');

export const AddressInputSchema = z.object({
    line1: z.string().min(1, 'Required').max(200),
    line2: z.string().max(200).optional().or(z.literal('')),
    postalCode: z.string().min(1, 'Required').max(32),
    city: z.string().min(1, 'Required').max(120),
    country: CountryCode,
});

export type AddressInputValues = z.infer<typeof AddressInputSchema>;

/** Full create-practice form values (mirrors PracticeCreateInput + acceptedTerms). */
export function createPracticeFormSchema(_t: ReturnType<typeof useTranslations>) {
    return z.object({
        legalName: z.string().min(1, 'Required').max(160),
        displayName: z.string().max(120).optional().or(z.literal('')),
        billingEmail: z.email('Valid email required'),
        registrationNumber: z.string().max(64).optional().or(z.literal('')),
        vatNumber: z.string().max(64).optional().or(z.literal('')),
        phone: z.string().max(40).optional().or(z.literal('')),
        website: z.string().max(240).optional().or(z.literal('')),
        acceptedTerms: z.literal(true, 'You must accept the terms of service'),
        billingAddress: AddressInputSchema,
    });
}

export type PracticeCreateValues = z.infer<ReturnType<typeof createPracticeFormSchema>>;

/** Settings update form. */
export function createPracticeUpdateSchema(_t: ReturnType<typeof useTranslations>) {
    return z.object({
        legalName: z.string().min(1, 'Required').max(160),
        displayName: z.string().max(120).optional().or(z.literal('')),
        billingEmail: z.email('Valid email required'),
        registrationNumber: z.string().max(64).optional().or(z.literal('')),
        vatNumber: z.string().max(64).optional().or(z.literal('')),
        phone: z.string().max(40).optional().or(z.literal('')),
        website: z.string().max(240).optional().or(z.literal('')),
        billingAddress: AddressInputSchema,
    });
}

export type PracticeUpdateValues = z.infer<ReturnType<typeof createPracticeUpdateSchema>>;

/** Invite staff member form. */
export function createInviteMemberSchema(_t: ReturnType<typeof useTranslations>) {
    return z.object({
        email: z.email('Valid email required'),
        role: z.enum(PracticeRole),
        isSeatBillable: z.boolean(),
    });
}

export type InviteMemberValues = z.infer<ReturnType<typeof createInviteMemberSchema>>;

/** Add client form. */
export function createAddClientSchema(_t: ReturnType<typeof useTranslations>) {
    return z
        .object({
            email: z.email('Valid email required').optional().or(z.literal('')),
            householdId: z.string().optional().or(z.literal('')),
            access: z.enum(PracticeClientAccess),
        })
        .refine(data => data.email || data.householdId, {
            message: 'Provide an email or household ID',
            path: ['email'],
        });
}

export type AddClientValues = z.infer<ReturnType<typeof createAddClientSchema>>;
