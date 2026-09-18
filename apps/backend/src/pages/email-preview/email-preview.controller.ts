import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { type FastifyReply } from 'fastify';

import { loadEnv } from '../../common/config/env.config';
import { isSwaggerEnabled } from '../../common/config/setup-swagger.config';
import {
    EmailTemplate,
    renderTemplate,
} from '../../modules/backoffice/communication/email/utils/template-adapter';

const TEMPLATES = [EmailTemplate.HOUSEHOLD_INVITE, EmailTemplate.ACCOUNT_VERIFICATION] as const;
type TemplateId = (typeof TEMPLATES)[number];

/**
 * Dev/docs-only browser preview of outbound email HTML.
 * Gated the same way as Swagger (dev, or ENABLE_SWAGGER).
 */
@ApiExcludeController()
@AllowAnonymous()
@Controller('email-preview')
export class EmailPreviewController {
    @Get()
    list(@Res() reply: FastifyReply): void {
        if (!this.assertEnabled(reply)) return;
        void reply.send({
            templates: TEMPLATES.map(id => ({
                id,
                preview: `/email-preview/${id}`,
            })),
        });
    }

    @Get(':template')
    async preview(@Param('template') template: string, @Res() reply: FastifyReply): Promise<void> {
        if (!this.assertEnabled(reply)) return;

        if (!TEMPLATES.includes(template as TemplateId)) {
            throw new NotFoundException({
                message: 'Unknown template',
                available: [...TEMPLATES],
            });
        }

        const html = await this.render(template as TemplateId);
        void reply.type('text/html').send(html);
    }

    /** @returns false when the request was already redirected */
    private assertEnabled(reply: FastifyReply): boolean {
        const env = loadEnv();
        if (!isSwaggerEnabled(env)) {
            void reply.redirect('/access-denied', 302);
            return false;
        }
        return true;
    }

    private async render(template: TemplateId): Promise<string> {
        switch (template) {
            case EmailTemplate.HOUSEHOLD_INVITE:
                return renderTemplate(
                    EmailTemplate.HOUSEHOLD_INVITE,
                    {
                        householdName: 'Huishouden van Anna',
                        inviteUrl: 'https://app.rumtelo.local/invite/demo-id',
                        inviterName: 'Anna',
                        role: 'MEMBER',
                    },
                    'nl'
                );
            case EmailTemplate.ACCOUNT_VERIFICATION:
                return renderTemplate(
                    EmailTemplate.ACCOUNT_VERIFICATION,
                    {
                        firstName: 'Anna',
                        verificationUrl:
                            'https://app.rumtelo.local/api/auth/verify-email?token=demo',
                        expiresInHours: 48,
                    },
                    'en'
                );
            default: {
                const exhaustive: never = template;
                throw new Error(`Unknown email template: ${String(exhaustive)}`);
            }
        }
    }
}
