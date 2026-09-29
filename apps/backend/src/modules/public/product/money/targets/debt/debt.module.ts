import { Module } from '@nestjs/common';

import { PartyModule } from '../../plan/party/party.module';
import { DebtController } from './debt.controller';
import { DebtService } from './debt.service';

@Module({
    imports: [PartyModule],
    controllers: [DebtController],
    providers: [DebtService],
    exports: [DebtService],
})
export class DebtModule {}
