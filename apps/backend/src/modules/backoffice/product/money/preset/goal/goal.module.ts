import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';

import { TranslationModule } from '../../../../admin/translation';
import { GoalPreset } from './goal.entity';
import { GoalPresetService } from './goal.service';

@Module({
    imports: [MikroOrmModule.forFeature([GoalPreset]), TranslationModule],
    providers: [GoalPresetService],
    exports: [GoalPresetService],
})
export class GoalPresetModule {}
