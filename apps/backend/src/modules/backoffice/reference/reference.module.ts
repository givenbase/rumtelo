import { Module } from '@nestjs/common';

import { DeviceKindModule } from './device-kind';

/**
 * Cross-product lookups Rumtelo writes (devices span Energy, Soul, platform).
 */
@Module({
    imports: [DeviceKindModule],
    exports: [DeviceKindModule],
})
export class ReferenceModule {}
