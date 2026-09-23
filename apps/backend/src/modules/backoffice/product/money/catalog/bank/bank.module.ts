import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';

import { Bank } from './bank.entity';
import { BankService } from './bank.service';

@Module({
    imports: [MikroOrmModule.forFeature([Bank])],
    providers: [BankService],
    exports: [BankService],
})
export class BankModule {}
