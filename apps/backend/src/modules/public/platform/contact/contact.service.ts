import type { ContactSubmitInput, ContactSubmitResult, ContactTopic } from '@rumtelo/contracts';

import { Inject, Injectable, Logger } from '@nestjs/common';
import { ORPCError } from '@orpc/server';

import { EmailService } from '../../../backoffice/communication/email/email.service';

const TOPIC_LABEL: Record<ContactTopic, string> = {
    support: 'Product support',
    press: 'Press & partnerships',
    privacy: 'Privacy request',
    other: 'Other',
};

/** Reject obvious link dumps (common spam pattern). */
const URL_RE = /https?:\/\/|www\./gi;
const MAX_URLS = 3;

/**
 * Public contact form — delivers to EMAIL_FROM via Resend.
 * No persistence; email is the record of the inquiry.
 *
 * Anti-spam: honeypot (`website`), URL flood check, controller rate limit.
 */
@Injectable()
export class ContactService {
    private readonly logger = new Logger(ContactService.name);

    constructor(@Inject(EmailService) private readonly email: EmailService) {}

    // ====================================================================
    // ? CREATE Operations
    // ====================================================================

    async submit(input: ContactSubmitInput): Promise<ContactSubmitResult> {
        // Honeypot filled → pretend success, do not email.
        if (input.website?.trim()) {
            this.logger.warn(`Contact honeypot tripped (${input.email})`);
            return { ok: true };
        }

        const urlHits = input.message.match(URL_RE)?.length ?? 0;
        if (urlHits > MAX_URLS) {
            this.logger.warn(`Contact rejected: too many URLs (${urlHits}) from ${input.email}`);
            throw new ORPCError('BAD_REQUEST', { message: 'contact_message_rejected' });
        }

        const topicLabel = TOPIC_LABEL[input.topic];

        this.logger.log(`Contact form from ${input.email} (topic=${input.topic})`);

        const sent = await this.email.sendContactFormEmail({
            name: input.name,
            email: input.email,
            topic: topicLabel,
            message: input.message,
            ...(input.phone ? { phone: input.phone } : {}),
        });

        if (!sent) {
            throw new ORPCError('BAD_GATEWAY', { message: 'contact_send_failed' });
        }

        return { ok: true };
    }
}
