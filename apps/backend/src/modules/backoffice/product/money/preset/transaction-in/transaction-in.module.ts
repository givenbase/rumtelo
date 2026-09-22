import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';

import { TranslationModule } from '../../../../admin/translation';
import { TransactionInPreset } from './transaction-in.entity';
import { TransactionInPresetService } from './transaction-in.service';

@Module({
    imports: [MikroOrmModule.forFeature([TransactionInPreset]), TranslationModule],
    providers: [TransactionInPresetService],
    exports: [TransactionInPresetService],
})
export class TransactionInPresetModule {}
