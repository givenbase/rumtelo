import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';

import { TransactionInPreset } from './transaction-in.entity';
import { TransactionInPresetService } from './transaction-in.service';

@Module({
    imports: [MikroOrmModule.forFeature([TransactionInPreset])],
    providers: [TransactionInPresetService],
    exports: [TransactionInPresetService],
})
export class TransactionInPresetModule {}
