import { Module } from '@nestjs/common';

import { PracticeCoreModule } from './practice-core.module';
import { PracticeController } from './practice.controller';

/**
 * Practice Module — B2B control plane HTTP surface.
 * Domain logic lives in PracticeCoreModule (shared with Household practiceLinks).
 */
@Module({
    imports: [PracticeCoreModule],
    controllers: [PracticeController],
    exports: [PracticeCoreModule],
})
export class PracticeModule {}
