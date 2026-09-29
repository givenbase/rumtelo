import { Module } from '@nestjs/common';

import { PartyController } from './party.controller';
import { PartyService } from './party.service';

/** Household-saved counterparties, shared by income, fixed costs, transactions and debts. */
@Module({
    controllers: [PartyController],
    providers: [PartyService],
    exports: [PartyService],
})
export class PartyModule {}
