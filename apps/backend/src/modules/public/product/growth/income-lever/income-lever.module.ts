import { Module } from '@nestjs/common';

import { LeverController } from './lever.controller';
import { LeverService } from './lever.service';

@Module({ controllers: [LeverController], providers: [LeverService], exports: [LeverService] })
export class LeverModule {}
