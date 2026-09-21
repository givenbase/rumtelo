/**
 * Auth Schemas
 * Website + application auth forms (sign-in / sign-up / reset / verify).
 * Keep AUTH_MIN_PASSWORD_LENGTH in sync with Better Auth emailAndPassword.minPasswordLength.
 */

import { z } from 'zod';

import { OptionalAuthPhone } from '../../../common/phone.schema';

export const AUTH_MIN_PASSWORD_LENGTH = 8;

export const AuthEmail = z.email('Enter a valid email');
/** Maps to Better Auth `user.name` — how we greet you in the product (editable later). */
export const AuthDisplayName = z.string().trim().min(1, 'Display name is required').max(80);
export const AuthFirstName = z.string().trim().min(1, 'First name is required').max(80);
export const AuthLastName = z.string().trim().min(1, 'Last name is required').max(80);
export const AuthPassword = z
    .string()
    .min(
        AUTH_MIN_PASSWORD_LENGTH,
        `Password must be at least ${AUTH_MIN_PASSWORD_LENGTH} characters`
    );

export const SignInForm = z.object({
    email: AuthEmail,
    password: AuthPassword,
});

/**
 * Full sign-up — first + last required (seed `auth.user.name`); middle/phone/DOB optional.
 * Display name is composed once at signup and can be changed later in settings.
 * Phone is E.164 when set (from the Phone field).
 */
export const SignUpForm = z.object({
    firstName: AuthFirstName,
    middleName: z.string().trim().max(80),
    lastName: AuthLastName,
    email: AuthEmail,
    password: AuthPassword,
    phone: OptionalAuthPhone,
    dateOfBirth: z.union([z.literal(''), z.iso.date()]),
});

/** Profile fields forwarded with Better Auth sign-up (not stored on `auth.user`). */
export const SignUpAccountProfile = z.object({
    firstName: AuthFirstName,
    middleName: z.string().trim().max(80).optional(),
    lastName: AuthLastName,
    /** Already validated E.164 on SignUpForm when set. */
    phone: z.string().trim().max(32).optional(),
    dateOfBirth: z.union([z.literal(''), z.iso.date()]).optional(),
});

/** Landing CTA — name + email + terms; password and full profile on `/sign-up`. */
export const LandingSignUpForm = z.object({
    firstName: AuthFirstName,
    lastName: AuthLastName,
    email: AuthEmail,
    terms: z.boolean().refine(value => value, { message: 'Please agree to the terms.' }),
});

export const ForgotPasswordForm = z.object({
    email: AuthEmail,
});

export const ResetPasswordForm = z
    .object({
        password: AuthPassword,
        confirm: z.string(),
    })
    .refine(data => data.password === data.confirm, {
        message: 'Passwords do not match',
        path: ['confirm'],
    });

export const VerifyEmailForm = z.object({
    email: AuthEmail,
});

// Inferred types (same-module merge for consumers)
export type SignInForm = z.infer<typeof SignInForm>;
export type SignUpForm = z.infer<typeof SignUpForm>;
export type SignUpAccountProfile = z.infer<typeof SignUpAccountProfile>;
export type LandingSignUpForm = z.infer<typeof LandingSignUpForm>;
export type ForgotPasswordForm = z.infer<typeof ForgotPasswordForm>;
export type ResetPasswordForm = z.infer<typeof ResetPasswordForm>;
export type VerifyEmailForm = z.infer<typeof VerifyEmailForm>;
