import { Module } from '@nestjs/common';

import { IncomeModule } from '../../plan/income/income.module';
import { JarModule } from '../../plan/jar/jar.module';
import { BankAccountController } from './bank-account.controller';
import { BankAccountService } from './bank-account.service';

@Module({
    imports: [JarModule, IncomeModule],
    controllers: [BankAccountController],
    providers: [BankAccountService],
    exports: [BankAccountService],
})
export class BankAccountModule {}
