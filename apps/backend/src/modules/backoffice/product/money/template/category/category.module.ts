import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';

import { TranslationModule } from '../../../../admin/translation';
import { CategoryTemplate } from './category.entity';
import { CategoryTemplateService } from './category.service';

@Module({
    imports: [MikroOrmModule.forFeature([CategoryTemplate]), TranslationModule],
    providers: [CategoryTemplateService],
    exports: [CategoryTemplateService],
})
export class CategoryTemplateModule {}
