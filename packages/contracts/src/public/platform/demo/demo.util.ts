/**
 * Seeded demo personas — shared by backend seed, sign-in chips, and E2E defaults.
 * Domain: @rumtelo.com. Plan and Stripe billing are read-only for these accounts.
 *
 * Password pattern: `telo{Persona}1!` (e.g. teloBasic1!).
 */

import { PlanKey } from '../../../backoffice/plan/enums';

import { composeDisplayName } from '../auth/auth.util';

export type DemoPersona = 'basic' | 'plus' | 'max';

/** Demo password: `telo` + capitalized persona + `1!`. */
export function demoPassword(persona: DemoPersona): string {
    const label = persona.charAt(0).toUpperCase() + persona.slice(1);
    return `telo${label}1!`;
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

const DEMO_EMAILS = new Set(DEMO_ACCOUNTS.map(account => account.email.toLowerCase()));
const DEMO_HOUSEHOLD_SLUGS = new Set(DEMO_ACCOUNTS.map(account => account.slug));

/** Seeded demo personas — plan and Stripe billing are read-only. */
export function isDemoAccountEmail(email: string | null | undefined): boolean {
    if (!email) return false;
    return DEMO_EMAILS.has(email.trim().toLowerCase());
}

export function isDemoHouseholdSlug(slug: string | null | undefined): boolean {
    if (!slug) return false;
    return DEMO_HOUSEHOLD_SLUGS.has(slug);
}
