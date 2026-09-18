import { Module } from '@nestjs/common';

import { AccountModule } from '../../../../../auth/user/account/account.module';
import { ProgressModule } from '../progress/progress.module';
import { BookController } from './book.controller';
import { BookService } from './book.service';

/** Books the household added. A pointer to a public catalog, not a hosted file. */
@Module({
    imports: [AccountModule, ProgressModule],
    controllers: [BookController],
    providers: [BookService],
    exports: [BookService],
})
export class BookModule {}
