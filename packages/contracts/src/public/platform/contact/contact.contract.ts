/**
 * Contact Contracts
 * Public support form — Resend delivery via EmailService.
 */

import { oc } from '@orpc/contract';

import { ContactSubmitInput, ContactSubmitResult } from './contact.schema';

// ====================================================================
// ? CREATE Operations
// ====================================================================

/** Anonymous contact form → Resend to support/info inbox. */
export const contactSubmit = oc.input(ContactSubmitInput).output(ContactSubmitResult);

/** Nested contract object mounted at `contract.contact`. */
export const contactContract = {
    submit: contactSubmit,
};
