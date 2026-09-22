import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';

import { Translation } from './translation.entity';
import { TranslationService } from './translation.service';

@Module({
    imports: [MikroOrmModule.forFeature([Translation])],
    providers: [TranslationService],
    exports: [TranslationService],
})
export class TranslationModule {}
