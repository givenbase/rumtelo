/**
 * Contact form — public support inquiry submitted from the marketing site.
 */

import { z } from 'zod';

/** Inbox routing for the contact form. */
export const ContactTopic = z.enum(['support', 'press', 'privacy', 'other']);
export type ContactTopic = z.infer<typeof ContactTopic>;

export const ContactSubmitInput = z.object({
    name: z.string().trim().min(1).max(120),
    email: z.email(),
    topic: ContactTopic,
    message: z.string().trim().min(10).max(5000),
});
export type ContactSubmitInput = z.infer<typeof ContactSubmitInput>;

export const ContactSubmitResult = z.object({
    ok: z.literal(true),
});
export type ContactSubmitResult = z.infer<typeof ContactSubmitResult>;
