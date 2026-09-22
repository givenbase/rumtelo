import { contract } from '@rumtelo/contracts';

import { Inject } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Implement, implement } from '@orpc/nest';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';

import { ControllerSwagger } from '../../../../common/decorators/controller-swagger.decorators';
import { ContactService } from './contact.service';

/** Transport only — public contact form → EmailService / Resend. */
@AllowAnonymous()
@ControllerSwagger('contact', 'public')
export class ContactController {
    constructor(@Inject(ContactService) private readonly contact: ContactService) {}

    // ====================================================================
    // ? CREATE Operations
    // ====================================================================

    /** Anonymous contact form submit — 3 / 15 min per IP (Redis-backed when available). */
    @Throttle({ default: { limit: 3, ttl: 900_000 } })
    @Implement(contract.contact.submit)
    submit() {
        return implement(contract.contact.submit).handler(({ input }) =>
            this.contact.submit(input)
        );
    }
}
