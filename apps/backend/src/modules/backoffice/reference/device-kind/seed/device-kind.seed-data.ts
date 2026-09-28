import { DeviceCapability, DeviceConnection } from '@rumtelo/contracts';

/** Seed rows for backoffice.reference_platform_device_kind. */
export const DEVICE_KIND_SEED = [
    {
        key: 'WRISTBAND',
        name: 'Wristband',
        icon: 'watch',
        defaultConnection: DeviceConnection.BLUETOOTH,
        defaultCapabilities: [
            DeviceCapability.SLEEP,
            DeviceCapability.STEPS,
            DeviceCapability.TRAINING,
            DeviceCapability.HEART_RATE,
        ],
    },
    {
        key: 'RING',
        name: 'Ring',
        icon: 'circle',
        defaultConnection: DeviceConnection.BLUETOOTH,
        defaultCapabilities: [
            DeviceCapability.SLEEP,
            DeviceCapability.STEPS,
            DeviceCapability.HEART_RATE,
        ],
    },
    {
        key: 'WATCH',
        name: 'Watch',
        icon: 'watch',
        defaultConnection: DeviceConnection.CLOUD,
        defaultCapabilities: [
            DeviceCapability.SLEEP,
            DeviceCapability.STEPS,
            DeviceCapability.TRAINING,
            DeviceCapability.HEART_RATE,
            DeviceCapability.ALARM,
        ],
    },
    {
        key: 'SLEEP_SENSOR',
        name: 'Sleep sensor',
        icon: 'moon',
        defaultConnection: DeviceConnection.WIFI,
        defaultCapabilities: [DeviceCapability.SLEEP],
    },
    {
        key: 'SCALE',
        name: 'Scale',
        icon: 'scale',
        defaultConnection: DeviceConnection.WIFI,
        defaultCapabilities: [DeviceCapability.STEPS],
    },
    {
        key: 'ALARM_HUB',
        name: 'Alarm hub',
        icon: 'alarm-clock',
        defaultConnection: DeviceConnection.WIFI,
        defaultCapabilities: [DeviceCapability.ALARM],
    },
    {
        key: 'OTHER',
        name: 'Other',
        icon: 'cpu',
        defaultConnection: DeviceConnection.BLUETOOTH,
        defaultCapabilities: [DeviceCapability.STEPS],
    },
] as const;
