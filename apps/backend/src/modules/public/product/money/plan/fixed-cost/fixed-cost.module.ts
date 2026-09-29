import { Module } from '@nestjs/common';

import { JarModule } from '../jar/jar.module';
import { PartyModule } from '../party/party.module';
import { FixedCostController } from './fixed-cost.controller';
import { FixedCostService } from './fixed-cost.service';

@Module({
    imports: [JarModule, PartyModule],
    controllers: [FixedCostController],
    providers: [FixedCostService],
    exports: [FixedCostService],
})
export class FixedCostModule {}
