export { EmailModule } from './email.module';
export { EmailService } from './email.service';
export type {
    EmailProvider,
    EmailVerificationEmailInput,
    HouseholdInviteAcceptedEmailInput,
    HouseholdInviteEmailInput,
    SendEmailInput,
} from './email.types';
export { EmailTemplate, renderTemplate } from './utils/template-adapter';
