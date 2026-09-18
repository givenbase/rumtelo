import { Module } from '@nestjs/common';

import { IncomeMilestoneController } from './income-milestone.controller';
import { IncomeMilestoneService } from './income-milestone.service';

@Module({
    controllers: [IncomeMilestoneController],
    providers: [IncomeMilestoneService],
    exports: [IncomeMilestoneService],
})
export class IncomeMilestoneModule {}
