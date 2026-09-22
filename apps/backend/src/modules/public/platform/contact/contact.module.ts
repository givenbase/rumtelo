import { Module } from '@nestjs/common';

import { EmailModule } from '../../../backoffice/communication/email/email.module';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';

/** Public marketing contact form (Resend). */
@Module({
    imports: [EmailModule],
    controllers: [ContactController],
    providers: [ContactService],
})
export class ContactModule {}
