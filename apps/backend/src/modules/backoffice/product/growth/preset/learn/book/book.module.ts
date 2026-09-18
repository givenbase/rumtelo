import { Module } from '@nestjs/common';

import { BookPreset } from './book.entity';
import { BookPresetService } from './book.service';

/** Growth book presets — titles we recommend, never host. */
@Module({
    providers: [BookPresetService],
    exports: [BookPresetService],
})
export class BookPresetModule {}

export { BookPreset, BookPresetService };
