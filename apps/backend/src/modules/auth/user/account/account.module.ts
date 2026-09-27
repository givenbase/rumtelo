import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';

import { AccountSettingsModule } from './account-settings';
import { AccountAddress } from './account-address/account-address.entity';
import { AccountController } from './account.controller';
import { Account } from './account.entity';
import { AccountService } from './account.service';

/**
 * Account Module
 *
 * Rumtelo-owned person data (not better-auth machinery, not household board).
 * Board money settings live under auth/household/household-settings.
 */
@Module({
    imports: [MikroOrmModule.forFeature([Account, AccountAddress]), AccountSettingsModule],
    controllers: [AccountController],
    providers: [AccountService],
    exports: [AccountSettingsModule, AccountService],
})
export class AccountModule {}
