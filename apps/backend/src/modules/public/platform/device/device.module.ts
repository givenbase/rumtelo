import { Module } from '@nestjs/common';

import { AccountModule } from '../../../auth/user/account/account.module';
import { DeviceKindModule } from '../../../backoffice/reference/device-kind/device-kind.module';
import { DeviceController } from './device.controller';
import { DeviceService } from './device.service';

/** Household device registry — wearables, hubs, scales. */
@Module({
    imports: [AccountModule, DeviceKindModule],
    controllers: [DeviceController],
    providers: [DeviceService],
    exports: [DeviceService],
})
export class DeviceModule {}
