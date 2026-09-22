/**
 * Phone write contract — E.164 only (e.g. country code + national number).
 * Pair with the `@rumtelo/ui` {@link Phone} field (stores E.164).
 */

import parsePhoneNumberFromString from 'libphonenumber-js';
import { z } from 'zod';

export const PHONE_E164_MESSAGE = 'Enter a valid phone number with country code.';

/** Normalize to E.164, or null when missing/invalid. */
export function normalizeToE164Phone(input: string): string | null {
    const trimmed = input.trim();
    if (!trimmed) return null;
    const parsed = parsePhoneNumberFromString(trimmed);
    if (!parsed?.isValid()) return null;
    return parsed.format('E.164');
}

export function isValidE164Phone(input: string): boolean {
    return normalizeToE164Phone(input) !== null;
}

/**
 * Optional phone for forms — empty string stays empty; otherwise must be valid E.164.
 * Output is `''` or `+…`.
 */
export const OptionalAuthPhone = z
    .string()
    .trim()
    .max(32)
    .superRefine((value, ctx) => {
        if (!value) return;
        if (!isValidE164Phone(value)) {
            ctx.addIssue({ code: 'custom', message: PHONE_E164_MESSAGE });
        }
    })
    .transform(value => {
        if (!value) return '';
        return normalizeToE164Phone(value) ?? value;
    });

/**
 * Optional/nullable phone for account patches — empty / null → null; else E.164.
 */
export const OptionalNullableE164Phone = z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value, ctx) => {
        if (value === null || value === undefined) return null;
        const trimmed = value.trim();
        if (!trimmed) return null;
        const normalized = normalizeToE164Phone(trimmed);
        if (!normalized) {
            ctx.addIssue({ code: 'custom', message: PHONE_E164_MESSAGE });
            return z.NEVER;
        }
        return normalized;
    });
