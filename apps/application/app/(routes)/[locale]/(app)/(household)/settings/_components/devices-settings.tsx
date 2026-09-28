'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { DeviceCapability, DeviceConnection, type Device } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { useTranslations } from '@rumtelo/i18n';
import {
    Button,
    Icon,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    StubNotice,
    type IconName,
} from '@rumtelo/ui';

import { api } from '@/app/_lib/api';
import { apiQuery } from '@/app/_lib/api-hooks';
import { isLiveData } from '@/app/_lib/preview';
import { useAuth } from '@/components/features/shell/auth-provider';

import type { DeviceFormValues } from '../_utils/device-form-zod';
import { useSettingsMutation } from '../_utils/use-settings-mutation';
import { DevicePairDialog } from './device-pair-dialog';
import { SettingsInkCard, SettingsPanel, SettingsPill, SettingsRow } from './settings-chrome';

const CAPABILITY_VALUES = new Set<string>(Object.values(DeviceCapability));
const EMPTY_DEVICES: Device[] = [];

const ASSIGNEE_TRIGGER =
    'h-8 min-w-[9rem] rounded-lg border-line-strong bg-surface px-2.5 text-xs shadow-sm ' +
    'focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/35';
const ASSIGNEE_CONTENT = 'rounded-lg border-line bg-surface text-fg shadow-md';
const ASSIGNEE_ITEM =
    'rounded-md text-xs focus:bg-accent/10 focus:text-fg data-[highlighted]:bg-accent/10 data-[highlighted]:text-fg';

const KIND_ICON: Record<string, IconName> = {
    WRISTBAND: 'watch',
    RING: 'circle',
    WATCH: 'watch',
    SLEEP_SENSOR: 'moon',
    SCALE: 'scale',
    ALARM_HUB: 'bell',
    OTHER: 'cpu',
};

function parseCapability(value: string | null): DeviceCapability | undefined {
    if (!value) return undefined;
    const upper = value.toUpperCase();
    return CAPABILITY_VALUES.has(upper) ? (upper as DeviceCapability) : undefined;
}

/** Devices registry — `/settings/general/devices`. */
export function DevicesSettings() {
    const t = useTranslations();
    const searchParams = useSearchParams();
    const preferCapability = parseCapability(searchParams.get('capability'));
    const preferKindKey = searchParams.get('kind')?.toUpperCase() || undefined;
    const { householdId } = useAuth();
    const live = isLiveData(householdId);
    const [pairOpen, setPairOpen] = useState(() => Boolean(preferCapability));
    const [confirmForgetId, setConfirmForgetId] = useState<string | null>(null);

    const capabilityLabels: Record<DeviceCapability, string> = {
        [DeviceCapability.SLEEP]: t('pages.settings.panels.devices.capability_sleep'),
        [DeviceCapability.STEPS]: t('pages.settings.panels.devices.capability_steps'),
        [DeviceCapability.TRAINING]: t('pages.settings.panels.devices.capability_training'),
        [DeviceCapability.HEART_RATE]: t('pages.settings.panels.devices.capability_heart_rate'),
        [DeviceCapability.ALARM]: t('pages.settings.panels.devices.capability_alarm'),
        [DeviceCapability.MIND]: t('pages.settings.panels.devices.capability_mind'),
    };

    const connectionLabels: Record<DeviceConnection, string> = {
        [DeviceConnection.BLUETOOTH]: t('pages.settings.panels.devices.connection_bluetooth'),
        [DeviceConnection.WIFI]: t('pages.settings.panels.devices.connection_wifi'),
        [DeviceConnection.CLOUD]: t('pages.settings.panels.devices.connection_cloud'),
    };

    const devicesQuery = useLiveQuery(
        apiQuery.device.list.queryOptions({ input: {} }),
        EMPTY_DEVICES,
        live
    );
    const kindsQuery = useLiveQuery(apiQuery.device.kinds.queryOptions(), undefined, live);
    const membersQuery = useLiveQuery(
        apiQuery.household.members.queryOptions({ input: { householdId: householdId! } }),
        undefined,
        live && Boolean(householdId)
    );

    const devices = devicesQuery.data ?? EMPTY_DEVICES;
    const kinds = kindsQuery.data ?? [];
    const members = membersQuery.data ?? [];
    const memberName = useMemo(() => {
        const map = new Map<string, string>();
        for (const member of membersQuery.data ?? []) {
            map.set(member.accountId, member.displayName);
        }
        return map;
    }, [membersQuery.data]);

    const createDevice = useSettingsMutation({
        mutationFn: async (values: DeviceFormValues) => {
            await api.device.create({
                name: values.name,
                kindKey: values.kindKey,
                connection: values.connection,
                capabilities: values.capabilities,
                accountId: values.accountId,
                vendor: values.vendor.trim() || null,
                model: values.model.trim() || null,
                externalId: values.externalId.trim() || null,
            });
        },
        invalidateKeys: [apiQuery.device.list.key()],
        successMessage: t('pages.settings.saved'),
    });

    const forgetDevice = useSettingsMutation({
        mutationFn: async (id: string) => {
            await api.device.delete({ id });
        },
        invalidateKeys: [apiQuery.device.list.key()],
        successMessage: t('pages.settings.saved'),
    });

    const reassignDevice = useSettingsMutation({
        mutationFn: async (input: { id: string; accountId: string | null }) => {
            await api.device.update(input);
        },
        invalidateKeys: [apiQuery.device.list.key()],
        successMessage: t('pages.settings.saved'),
    });

    function assigneeLabel(device: Device): string {
        if (!device.accountId) return t('pages.settings.panels.devices.shared');
        return memberName.get(device.accountId) ?? t('pages.settings.panels.devices.shared');
    }

    function kindLabel(kindKey: string): string {
        return kinds.find(kind => kind.key === kindKey)?.name ?? kindKey;
    }

    function kindIcon(kindKey: string): IconName {
        const fromCatalog = kinds.find(kind => kind.key === kindKey)?.icon;
        if (fromCatalog) return fromCatalog as IconName;
        return KIND_ICON[kindKey] ?? 'cpu';
    }

    return (
        <SettingsPanel>
            {preferCapability ? (
                <p className="rounded-xl border border-accent/30 bg-accent/5 px-3.5 py-2.5 text-sm text-fg">
                    {t('pages.settings.panels.devices.capability_banner', {
                        capability:
                            capabilityLabels[preferCapability] ?? preferCapability.toLowerCase(),
                    })}
                </p>
            ) : null}

            <SettingsInkCard
                eyebrow={t('pages.settings.panels.devices.eyebrow')}
                blurb={t('pages.settings.panels.devices.blurb')}
                badge={
                    <Button type="button" size="sm" onClick={() => setPairOpen(true)}>
                        {t('pages.settings.panels.devices.add')}
                    </Button>
                }>
                {devices.length === 0 ? (
                    <SettingsRow last>
                        <p className="text-sm text-fg-muted">
                            {t('pages.settings.panels.devices.empty')}
                        </p>
                    </SettingsRow>
                ) : (
                    devices.map((device, index) => (
                        <SettingsRow
                            key={device.id}
                            last={index === devices.length - 1}
                            className="items-start gap-3 py-3.5 sm:items-center">
                            <div className="flex min-w-0 flex-1 items-start gap-3">
                                <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-full bg-accent/10 text-accent">
                                    <Icon name={kindIcon(device.kindKey)} size="sm" />
                                </span>
                                <div className="grid min-w-0 flex-1 gap-1.5">
                                    <div className="grid min-w-0 gap-0.5">
                                        <p className="truncate text-sm font-medium text-fg">
                                            {device.name}
                                        </p>
                                        <p className="text-[11px] leading-snug text-fg-muted">
                                            {kindLabel(device.kindKey)}
                                            {device.vendor ? ` · ${device.vendor}` : ''}
                                            {device.model ? ` ${device.model}` : ''}
                                            {' · '}
                                            {assigneeLabel(device)}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                        <SettingsPill tone="accent">
                                            {connectionLabels[device.connection]}
                                        </SettingsPill>
                                        {device.capabilities.map(capability => (
                                            <SettingsPill key={capability}>
                                                {capabilityLabels[capability] ?? capability}
                                            </SettingsPill>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
                                <Select
                                    value={device.accountId ?? 'shared'}
                                    onValueChange={value => {
                                        reassignDevice.mutate({
                                            id: device.id,
                                            accountId: value === 'shared' ? null : value,
                                        });
                                    }}>
                                    <SelectTrigger
                                        size="sm"
                                        className={ASSIGNEE_TRIGGER}
                                        aria-label={t('pages.settings.panels.devices.reassign')}>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent
                                        position="popper"
                                        align="end"
                                        className={ASSIGNEE_CONTENT}>
                                        <SelectItem value="shared" className={ASSIGNEE_ITEM}>
                                            {t('pages.settings.panels.devices.shared')}
                                        </SelectItem>
                                        {members.map(member => (
                                            <SelectItem
                                                key={member.accountId}
                                                value={member.accountId}
                                                className={ASSIGNEE_ITEM}>
                                                {member.displayName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {confirmForgetId === device.id ? (
                                    <>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => {
                                                forgetDevice.mutate(device.id);
                                                setConfirmForgetId(null);
                                            }}>
                                            {t('pages.settings.panels.devices.forget')}
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => setConfirmForgetId(null)}>
                                            {t('pages.settings.cancel')}
                                        </Button>
                                    </>
                                ) : (
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setConfirmForgetId(device.id)}>
                                        {t('pages.settings.panels.devices.forget')}
                                    </Button>
                                )}
                            </div>
                        </SettingsRow>
                    ))
                )}
            </SettingsInkCard>

            {!live ? (
                <StubNotice
                    prefix={t('ui.statusPage.scaffold')}
                    what={t('pages.settings.panels.devices.empty')}
                />
            ) : null}

            <DevicePairDialog
                open={pairOpen}
                onOpenChange={setPairOpen}
                kinds={kinds}
                members={members.map(member => ({
                    accountId: member.accountId,
                    displayName: member.displayName,
                }))}
                preferCapability={preferCapability}
                preferKindKey={preferKindKey}
                submitting={createDevice.isPending}
                onSubmit={async values => {
                    await createDevice.mutateAsync(values);
                }}
            />
        </SettingsPanel>
    );
}
