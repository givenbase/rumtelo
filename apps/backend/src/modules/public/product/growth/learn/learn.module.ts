import { Module } from '@nestjs/common';

import { BookModule } from './book/book.module';
import { FocusModule } from './focus/focus.module';
import { ProgressModule } from './progress/progress.module';

/**
 * Product: Groei → Learn.
 * Three household rows: the books they added, the marks on any piece, and which skills are in focus.
 */
@Module({
    imports: [BookModule, ProgressModule, FocusModule],
    exports: [BookModule, ProgressModule, FocusModule],
})
export class LearnModule {}
