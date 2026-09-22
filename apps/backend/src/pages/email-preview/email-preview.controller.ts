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
import { escapeHtml, renderBrandPage } from '../shared/brand-shell';

const TEMPLATES = [
    EmailTemplate.HOUSEHOLD_INVITE,
    EmailTemplate.ACCOUNT_VERIFICATION,
    EmailTemplate.PASSWORD_RESET,
    EmailTemplate.CONTACT_FORM,
] as const;
type TemplateId = (typeof TEMPLATES)[number];

const TEMPLATE_LABELS: Record<TemplateId, string> = {
    [EmailTemplate.HOUSEHOLD_INVITE]: 'Household invite',
    [EmailTemplate.ACCOUNT_VERIFICATION]: 'Account verification',
    [EmailTemplate.PASSWORD_RESET]: 'Password reset',
    [EmailTemplate.CONTACT_FORM]: 'Contact form',
};

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

        const linksHtml = `<div class="links">${TEMPLATES.map(
            id =>
                `<a href="/email-preview/${escapeHtml(id)}">${escapeHtml(TEMPLATE_LABELS[id])}<span>${escapeHtml(id)}</span></a>`
        ).join('')}</div>`;

        const html = renderBrandPage({
            title: 'Email preview',
            eyebrow: 'Templates',
            headline: 'Email preview',
            message: 'Open a template to see the HTML we send via Resend.',
            primaryHref: '/',
            primaryLabel: 'API home',
            bodyExtraHtml: linksHtml,
            footerHtml: 'Dev / ENABLE_SWAGGER only · demo copy, not live mail.',
            lang: 'en',
        });
        void reply.type('text/html').send(html);
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
            case EmailTemplate.PASSWORD_RESET:
                return renderTemplate(
                    EmailTemplate.PASSWORD_RESET,
                    {
                        firstName: 'Anna',
                        resetUrl: 'https://rumtelo.local/reset-password?token=demo',
                        expiresInHours: 1,
                    },
                    'en'
                );
            case EmailTemplate.CONTACT_FORM:
                return renderTemplate(
                    EmailTemplate.CONTACT_FORM,
                    {
                        name: 'Anna de Vries',
                        email: 'anna@example.com',
                        phone: '+15555550100',
                        topic: 'Product support',
                        message:
                            'I have a question about my household jars and how Coach tips work.',
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
