import { Module, forwardRef } from '@nestjs/common';

import { GoalModule } from '../../targets/goal/goal.module';
import { JarModule } from '../jar/jar.module';
import { PartyModule } from '../party/party.module';
import { IncomeController } from './income.controller';
import { IncomeService } from './income.service';

@Module({
    imports: [JarModule, PartyModule, forwardRef(() => GoalModule)],
    controllers: [IncomeController],
    providers: [IncomeService],
    exports: [IncomeService],
})
export class IncomeModule {}
