import { Module } from '@nestjs/common';

import { DeviceKindService } from './device-kind.service';

/** Cross-product device kind catalog — what households can register. */
@Module({
    providers: [DeviceKindService],
    exports: [DeviceKindService],
})
export class DeviceKindModule {}

export { DeviceKindCatalog } from './device-kind.entity';
export { DeviceKindService };
