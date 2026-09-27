/**
 * Seeded demo personas — shared by backend seed, sign-in chips, and E2E defaults.
 * Domain: @rumtelo.com. Plan and Stripe billing are read-only for these accounts.
 *
 * Password pattern: `telo{Persona}1!` (e.g. teloBasic1!, teloPractice1!).
 */

import { PlanKey } from '../../../backoffice/plan/enums';

import { composeDisplayName } from '../auth/auth.util';

export type DemoPersona = 'basic' | 'plus' | 'max';

/** Demo password: `telo` + capitalized label + `1!`. */
export function demoPassword(label: string): string {
    const capped = label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();
    return `telo${capped}1!`;
}

export type DemoAccount = {
    persona: DemoPersona;
    planKey: PlanKey;
    email: string;
    password: string;
    /** Sign-in chip label */
    label: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    phone: string;
    /** ISO calendar date `YYYY-MM-DD`. */
    dateOfBirth: string;
    /** Better Auth display name — composed from legal name parts. */
    name: string;
    householdName: string;
    slug: string;
    why: string;
};

function person(
    input: Omit<DemoAccount, 'name' | 'password'> & { middleName?: string }
): DemoAccount {
    return {
        ...input,
        password: demoPassword(input.persona),
        name: composeDisplayName(input.firstName, input.middleName, input.lastName),
    };
}

export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
    person({
        persona: 'basic',
        planKey: PlanKey.BASIC,
        email: 'basic@rumtelo.com',
        label: 'Basic',
        firstName: 'Jamie',
        middleName: 'Lee',
        lastName: 'Rivera',
        phone: '+1 555 010 2101',
        dateOfBirth: '1997-04-18',
        householdName: 'Rivera Household',
        slug: 'demo-basic',
        why: 'Breathing room — every coin is already spoken for.',
    }),
    person({
        persona: 'plus',
        planKey: PlanKey.PLUS,
        email: 'plus@rumtelo.com',
        label: 'Plus',
        firstName: 'Avery',
        lastName: 'Chen',
        phone: '+1 555 010 2202',
        dateOfBirth: '1992-09-03',
        householdName: 'Chen Studio',
        slug: 'demo-plus',
        why: 'Break the rat race — stop living invoice to invoice.',
    }),
    person({
        persona: 'max',
        planKey: PlanKey.MAX,
        email: 'max@rumtelo.com',
        label: 'Max',
        firstName: 'Morgan',
        middleName: 'Ellis',
        lastName: 'Blake',
        phone: '+1 555 010 2303',
        dateOfBirth: '1986-11-27',
        householdName: 'Blake & Co',
        slug: 'demo-max',
        why: 'Compound business profits into Financial Freedom without gambling.',
    }),
];

/** B2B Practice demo — coaches into the Practice shell; also owns a light household. */
export type DemoPracticeAccount = {
    email: string;
    password: string;
    label: string;
    firstName: string;
    lastName: string;
    phone: string;
    dateOfBirth: string;
    name: string;
    /** Solo household so the consumer shell still works after login. */
    householdName: string;
    householdSlug: string;
    why: string;
    practice: {
        legalName: string;
        displayName: string;
        slug: string;
        billingEmail: string;
        registrationNumber: string;
        vatNumber: string;
        phone: string;
        website: string;
        address: {
            line1: string;
            line2: string | null;
            postalCode: string;
            city: string;
            country: string;
        };
    };
    /**
     * Household slug for ACTIVE MANAGE after household accepted
     * (sponsored board + snapshot — typically Plus/Max).
     */
    clientHouseholdSlug: string;
    /**
     * Household slug for ACTIVE VIEW after household accepted.
     * Stays on its own plan (Basic) so coaches can preview locked gates.
     */
    viewClientHouseholdSlug: string;
    /**
     * Household slug for a pending INVITED contract (dual-consent not yet accepted).
     * Lets Practice roster show “waiting” and household settings show Accept / Decline.
     */
    pendingClientHouseholdSlug: string;
};

export const DEMO_PRACTICE: DemoPracticeAccount = {
    email: 'practice@rumtelo.com',
    password: demoPassword('practice'),
    label: 'Practice',
    firstName: 'Sam',
    lastName: 'Coach',
    phone: '+31 20 555 0140',
    dateOfBirth: '1988-06-12',
    name: composeDisplayName('Sam', undefined, 'Coach'),
    householdName: 'Coach Studio',
    householdSlug: 'demo-practice-owner',
    why: 'Run client households from the Practice control plane.',
    practice: {
        legalName: 'Rumtelo Coaching B.V.',
        displayName: 'Rumtelo Coaching',
        slug: 'demo-practice',
        billingEmail: 'practice@rumtelo.com',
        registrationNumber: '12345678',
        vatNumber: 'NL123456789B01',
        phone: '+31 20 555 0140',
        website: 'https://rumtelo.com',
        address: {
            line1: 'Keizersgracht 123',
            line2: null,
            postalCode: '1015 CJ',
            city: 'Amsterdam',
            country: 'NL',
        },
    },
    /** Blake (Max) — ACTIVE MANAGE after household accepted (board + snapshot). */
    clientHouseholdSlug: 'demo-max',
    /** Rivera (Basic) — ACTIVE VIEW; plan stays Basic so locked gates are visible. */
    viewClientHouseholdSlug: 'demo-basic',
    /** Chen (Plus) — INVITED VIEW pending household accept. */
    pendingClientHouseholdSlug: 'demo-plus',
};

const DEMO_EMAILS = new Set([
    ...DEMO_ACCOUNTS.map(account => account.email.toLowerCase()),
    DEMO_PRACTICE.email.toLowerCase(),
]);
const DEMO_HOUSEHOLD_SLUGS = new Set([
    ...DEMO_ACCOUNTS.map(account => account.slug),
    DEMO_PRACTICE.householdSlug,
]);
const DEMO_PRACTICE_SLUGS = new Set([DEMO_PRACTICE.practice.slug]);

/** Seeded demo personas — plan and Stripe billing are read-only. */
export function isDemoAccountEmail(email: string | null | undefined): boolean {
    if (!email) return false;
    return DEMO_EMAILS.has(email.trim().toLowerCase());
}

export function isDemoHouseholdSlug(slug: string | null | undefined): boolean {
    if (!slug) return false;
    return DEMO_HOUSEHOLD_SLUGS.has(slug.trim().toLowerCase());
}

export function isDemoPracticeSlug(slug: string | null | undefined): boolean {
    if (!slug) return false;
    return DEMO_PRACTICE_SLUGS.has(slug.trim().toLowerCase());
}

/**
 * Staff allowlist for maintenance / early access.
 * Any `*@rumtelo.com` address (includes seeded demo personas).
 */
export function isRumteloStaffEmail(email: string | null | undefined): boolean {
    if (!email) return false;
    return email.trim().toLowerCase().endsWith('@rumtelo.com');
}

/** All sign-in demo chips (household personas + Practice). */
export const DEMO_SIGN_IN_ACCOUNTS: readonly {
    label: string;
    email: string;
    password: string;
    key: string;
    /** Post-login path when no `?redirectTo=` is set (Practice → control plane). */
    homePath?: string;
}[] = [
    ...DEMO_ACCOUNTS.map(account => ({
        key: account.persona,
        label: account.label,
        email: account.email,
        password: account.password,
    })),
    {
        key: 'practice',
        label: DEMO_PRACTICE.label,
        email: DEMO_PRACTICE.email,
        password: DEMO_PRACTICE.password,
        homePath: '/practice',
    },
];
