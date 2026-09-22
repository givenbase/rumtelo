import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';

import { TranslationModule } from '../../../../admin/translation';
import { JarTemplate } from './jar.entity';
import { JarTemplateService } from './jar.service';

/**
 * Backoffice-owned jar catalog. Exported so platform onboard can seed household jars.
 */
@Module({
    imports: [MikroOrmModule.forFeature([JarTemplate]), TranslationModule],
    providers: [JarTemplateService],
    exports: [JarTemplateService],
})
export class JarTemplateModule {}
