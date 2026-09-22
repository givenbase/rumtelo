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

/**
 * Public contact form — delivers to EMAIL_FROM via Resend.
 * No persistence; email is the record of the inquiry.
 */
@Injectable()
export class ContactService {
    private readonly logger = new Logger(ContactService.name);

    constructor(@Inject(EmailService) private readonly email: EmailService) {}

    // ====================================================================
    // ? CREATE Operations
    // ====================================================================

    async submit(input: ContactSubmitInput): Promise<ContactSubmitResult> {
        const topicLabel = TOPIC_LABEL[input.topic];

        this.logger.log(`Contact form from ${input.email} (topic=${input.topic})`);

        const sent = await this.email.sendContactFormEmail({
            name: input.name,
            email: input.email,
            topic: topicLabel,
            message: input.message,
        });

        if (!sent) {
            throw new ORPCError('BAD_GATEWAY', { message: 'contact_send_failed' });
        }

        return { ok: true };
    }
}
