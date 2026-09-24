import { AccountKind } from '@rumtelo/contracts';
import { isValidIban, normalizeIban } from '@rumtelo/utils';
import { z } from 'zod';

/** Scoped `useTranslations` for settings validation messages. */
export type SettingsFormT = (key: string) => string;

export function createProfileFormSchema(msg: SettingsFormT) {
    return z.object({
        displayName: z.string().trim().min(1, msg('pages.settings.account.display_name')).max(120),
        firstName: z.string().max(80),
        middleName: z.string().max(80),
        lastName: z.string().max(80),
        phone: z.string().max(40),
        dateOfBirth: z.string().max(32),
    });
}

export type ProfileFormValues = z.infer<ReturnType<typeof createProfileFormSchema>>;

export function createPasswordFormSchema(msg: SettingsFormT) {
    return z.object({
        currentPassword: z.string().min(1, msg('pages.settings.account.current_password')),
        newPassword: z.string().min(8, msg('pages.settings.account.new_password')),
    });
}

export type PasswordFormValues = z.infer<ReturnType<typeof createPasswordFormSchema>>;

export function createInviteFormSchema(msg: SettingsFormT) {
    return z.object({
        email: z.string().trim().email(msg('pages.settings.account.invite_email')),
    });
}

export type InviteFormValues = z.infer<ReturnType<typeof createInviteFormSchema>>;

export function createPeriodFormSchema(_v: SettingsFormT) {
    return z.object({
        periodStartDay: z.number().int().min(1).max(28),
    });
}

export type PeriodFormValues = z.infer<ReturnType<typeof createPeriodFormSchema>>;

export function createBankAccountFormSchema(msg: SettingsFormT) {
    return z.object({
        label: z.string().max(80),
        iban: z
            .string()
            .max(64)
            .refine(
                value => {
                    const trimmed = value.trim();
                    if (!trimmed) return true;
                    // Stub / incomplete IBANs are cleared on submit; only reject clear invalids
                    const compact = trimmed.replace(/\s+/g, '').toUpperCase();
                    if (/^NL\d{0,2}[A-Z]{0,4}\d{0,10}$/.test(compact) && compact.length <= 8) {
                        return true;
                    }
                    return isValidIban(normalizeIban(trimmed));
                },
                { message: msg('pages.settings.panels.bank.iban') }
            ),
        kind: z.enum(AccountKind),
        bankId: z.uuid(),
        settlementAccountId: z.uuid().nullable().optional(),
    });
}

export type BankAccountFormValues = z.infer<ReturnType<typeof createBankAccountFormSchema>>;

/** New Open Banking seat fields (wizard step 2 — create mode). */
export function createBankWizardSeatFormSchema(msg: SettingsFormT) {
    return z.object({
        label: z.string().max(80),
        bankId: z.uuid(msg('pages.settings.panels.bank.bank_required')),
    });
}

export type BankWizardSeatFormValues = z.infer<ReturnType<typeof createBankWizardSeatFormSchema>>;
