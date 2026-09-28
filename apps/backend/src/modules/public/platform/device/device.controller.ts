import { contract } from '@rumtelo/contracts';

import { Inject } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';

import { ControllerSwagger } from '../../../../common/decorators/controller-swagger.decorators';
import { DeviceService } from './device.service';

/** Transport only — household device registry. Handler order is always CRUD. */
@ControllerSwagger('device', 'public')
export class DeviceController {
    constructor(@Inject(DeviceService) private readonly devices: DeviceService) {}

    // ====================================================================
    // ? CREATE Operations
    // ====================================================================

    /** Register a device for the current household. */
    @Implement(contract.device.create)
    create() {
        return implement(contract.device.create).handler(({ input }) => this.devices.create(input));
    }

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    /** List devices, optionally filtered by capability. */
    @Implement(contract.device.list)
    list() {
        return implement(contract.device.list).handler(({ input }) =>
            this.devices.list(input.capability)
        );
    }

    /** Active device-kind catalog for the pair dialog. */
    @Implement(contract.device.kinds)
    kinds() {
        return implement(contract.device.kinds).handler(() => this.devices.kindsList());
    }

    // ====================================================================
    // ? UPDATE Operations
    // ====================================================================

    /** Rename, reassign, or edit capabilities. */
    @Implement(contract.device.update)
    update() {
        return implement(contract.device.update).handler(({ input }) => this.devices.update(input));
    }

    // ====================================================================
    // ? DELETE Operations
    // ====================================================================

    /** Forget a device. */
    @Implement(contract.device.delete)
    delete() {
        return implement(contract.device.delete).handler(async ({ input }) =>
            this.devices.delete(input.id)
        );
    }
}
