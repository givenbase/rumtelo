import { Module } from '@nestjs/common';

import { IncomeLeverController } from './income-lever.controller';
import { IncomeLeverService } from './income-lever.service';

@Module({
    controllers: [IncomeLeverController],
    providers: [IncomeLeverService],
    exports: [IncomeLeverService],
})
export class IncomeLeverModule {}
