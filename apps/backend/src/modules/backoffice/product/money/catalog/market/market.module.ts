import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';

import { Market } from './market.entity';
import { MarketService } from './market.service';

@Module({
    imports: [MikroOrmModule.forFeature([Market])],
    providers: [MarketService],
    exports: [MarketService],
})
export class MarketModule {}
