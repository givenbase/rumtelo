'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { DeviceCapability, DeviceConnection, type DeviceKindCatalogItem } from '@rumtelo/contracts';
import { useTranslations } from '@rumtelo/i18n';
import {
    Button,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    Field,
    Form,
    FormControl,
    FormField,
    FormItem,
    FormMessage,
    Icon,
    Input,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    type IconName,
} from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { createDeviceFormSchema, type DeviceFormValues } from '../_utils/device-form-zod';
import { SettingsPill } from './settings-chrome';

type MemberOption = { accountId: string; displayName: string };

type DevicePairDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    kinds: DeviceKindCatalogItem[];
    members: MemberOption[];
    preferCapability?: DeviceCapability;
    preferKindKey?: string;
    onSubmit: (values: DeviceFormValues) => Promise<void>;
    submitting?: boolean;
};

const ALL_CAPABILITIES = Object.values(DeviceCapability);

function bluetoothAvailable(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}

export function DevicePairDialog({
    open,
    onOpenChange,
    kinds,
    members,
    preferCapability,
    preferKindKey,
    onSubmit,
    submitting,
}: DevicePairDialogProps) {
    const t = useTranslations();
    const schema = createDeviceFormSchema(t);
    const canBluetooth = bluetoothAvailable();

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

    const defaultKind =
        kinds.find(kind => kind.key === preferKindKey) ??
        kinds.find(kind =>
            preferCapability ? kind.defaultCapabilities.includes(preferCapability) : false
        ) ??
        kinds[0];

    const form = useForm<DeviceFormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            name: '',
            kindKey: defaultKind?.key ?? '',
            connection: defaultKind?.defaultConnection ?? DeviceConnection.BLUETOOTH,
            capabilities: defaultKind
                ? [...defaultKind.defaultCapabilities]
                : [DeviceCapability.STEPS],
            accountId: null,
            vendor: '',
            model: '',
            externalId: '',
        },
    });

    const kindKey = useWatch({ control: form.control, name: 'kindKey' });
    const externalId = useWatch({ control: form.control, name: 'externalId' });
    const name = useWatch({ control: form.control, name: 'name' });
    const capabilities = useWatch({ control: form.control, name: 'capabilities' });

    useEffect(() => {
        if (!open) return;
        const kind =
            kinds.find(row => row.key === preferKindKey) ??
            kinds.find(row =>
                preferCapability ? row.defaultCapabilities.includes(preferCapability) : false
            ) ??
            kinds[0];
        if (!kind) return;
        form.reset({
            name: '',
            kindKey: kind.key,
            connection: kind.defaultConnection,
            capabilities: [...kind.defaultCapabilities],
            accountId: null,
            vendor: '',
            model: '',
            externalId: '',
        });
    }, [open, kinds, preferCapability, preferKindKey, form]);

    useEffect(() => {
        const kind = kinds.find(row => row.key === kindKey);
        if (!kind) return;
        form.setValue('connection', kind.defaultConnection);
        form.setValue('capabilities', [...kind.defaultCapabilities]);
    }, [kindKey, kinds, form]);

    async function pairBluetooth() {
        if (!canBluetooth) return;
        try {
            const bluetooth = (
                navigator as Navigator & {
                    bluetooth: {
                        requestDevice: (options: {
                            acceptAllDevices: boolean;
                        }) => Promise<{ id: string; name?: string }>;
                    };
                }
            ).bluetooth;
            const device = await bluetooth.requestDevice({ acceptAllDevices: true });
            form.setValue('connection', DeviceConnection.BLUETOOTH);
            if (device.name) form.setValue('name', device.name.slice(0, 60));
            form.setValue('externalId', device.id.slice(0, 120));
        } catch {
            // User cancelled the picker — leave the form as-is.
        }
    }

    const paired = Boolean(externalId?.trim());

    function toggleCapability(capability: DeviceCapability) {
        const current = form.getValues('capabilities');
        const next = current.includes(capability)
            ? current.filter(row => row !== capability)
            : [...current, capability];
        if (next.length === 0) return;
        form.setValue('capabilities', next, { shouldDirty: true, shouldValidate: true });
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[min(90vh,44rem)] gap-0 overflow-y-auto p-0 sm:max-w-lg">
                <DialogHeader className="sticky top-0 z-10 border-b border-line bg-background px-5 pt-5 pr-12 pb-4">
                    <DialogTitle>{t('pages.settings.panels.devices.add')}</DialogTitle>
                    <DialogDescription>
                        {t('pages.settings.panels.devices.blurb')}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form
                        className="grid gap-5 px-5 py-4"
                        onSubmit={form.handleSubmit(async values => {
                            await onSubmit(values);
                            onOpenChange(false);
                        })}>
                        <section
                            className={cn(
                                'grid gap-3 rounded-xl border px-3.5 py-3',
                                paired ? 'border-success bg-success/5' : 'border-line bg-fg/[0.03]'
                            )}>
                            <div className="flex items-start gap-3">
                                <span
                                    className={cn(
                                        'grid size-9 shrink-0 place-items-center rounded-full',
                                        paired
                                            ? 'bg-success/15 text-success'
                                            : 'bg-accent/10 text-accent'
                                    )}>
                                    <Icon name={paired ? 'circle-check' : 'bluetooth'} size="sm" />
                                </span>
                                <div className="grid min-w-0 flex-1 gap-1">
                                    <p className="text-sm font-medium text-fg">
                                        {paired
                                            ? t('pages.settings.panels.devices.paired_title')
                                            : t('pages.settings.panels.devices.pair_bluetooth')}
                                    </p>
                                    <p className="text-xs leading-snug text-fg-muted">
                                        {paired
                                            ? t('pages.settings.panels.devices.paired_subtitle', {
                                                  name: name || '—',
                                              })
                                            : canBluetooth
                                              ? t('pages.settings.panels.devices.pair_hint')
                                              : t(
                                                    'pages.settings.panels.devices.bluetooth_unsupported'
                                                )}
                                    </p>
                                    {paired && externalId ? (
                                        <p className="truncate font-mono text-[10px] tracking-wide text-fg-secondary">
                                            {t('pages.settings.panels.devices.paired_id', {
                                                id: externalId,
                                            })}
                                        </p>
                                    ) : null}
                                </div>
                            </div>
                            {canBluetooth ? (
                                <Button
                                    type="button"
                                    variant={paired ? 'secondary' : 'primary'}
                                    iconLeft={<Icon name="bluetooth" size="sm" />}
                                    onClick={pairBluetooth}>
                                    {paired
                                        ? t('pages.settings.panels.devices.pair_again')
                                        : t('pages.settings.panels.devices.pair_bluetooth')}
                                </Button>
                            ) : null}
                        </section>

                        <div className="grid gap-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <Field
                                            label={t('pages.settings.panels.devices.name')}
                                            htmlFor="device-name">
                                            <FormControl>
                                                <Input
                                                    id="device-name"
                                                    {...field}
                                                    placeholder={t(
                                                        'pages.settings.panels.devices.name_placeholder'
                                                    )}
                                                />
                                            </FormControl>
                                        </Field>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid items-start gap-4 sm:grid-cols-2">
                                <FormField
                                    control={form.control}
                                    name="kindKey"
                                    render={({ field }) => (
                                        <FormItem>
                                            <Field
                                                label={t('pages.settings.panels.devices.kind')}
                                                hint={t('pages.settings.panels.devices.kind_hint')}>
                                                <Select
                                                    value={field.value}
                                                    onValueChange={field.onChange}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent position="popper">
                                                        {kinds.map(kind => (
                                                            <SelectItem
                                                                key={kind.key}
                                                                value={kind.key}>
                                                                <Icon
                                                                    name={kind.icon as IconName}
                                                                    size="sm"
                                                                />
                                                                {kind.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </Field>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="connection"
                                    render={({ field }) => (
                                        <FormItem>
                                            <Field
                                                label={t(
                                                    'pages.settings.panels.devices.connection'
                                                )}>
                                                <Select
                                                    value={field.value}
                                                    onValueChange={field.onChange}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent position="popper">
                                                        {Object.values(DeviceConnection).map(
                                                            connection => (
                                                                <SelectItem
                                                                    key={connection}
                                                                    value={connection}>
                                                                    <Icon
                                                                        name={
                                                                            connection ===
                                                                            DeviceConnection.BLUETOOTH
                                                                                ? 'bluetooth'
                                                                                : connection ===
                                                                                    DeviceConnection.WIFI
                                                                                  ? 'wifi'
                                                                                  : 'cloud'
                                                                        }
                                                                        size="sm"
                                                                    />
                                                                    {connectionLabels[connection]}
                                                                </SelectItem>
                                                            )
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            </Field>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="accountId"
                                render={({ field }) => (
                                    <FormItem>
                                        <Field label={t('pages.settings.panels.devices.reassign')}>
                                            <Select
                                                value={field.value ?? 'shared'}
                                                onValueChange={value =>
                                                    field.onChange(
                                                        value === 'shared' ? null : value
                                                    )
                                                }>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent position="popper">
                                                    <SelectItem value="shared">
                                                        {t('pages.settings.panels.devices.shared')}
                                                    </SelectItem>
                                                    {members.map(member => (
                                                        <SelectItem
                                                            key={member.accountId}
                                                            value={member.accountId}>
                                                            {member.displayName}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </Field>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="capabilities"
                                render={() => (
                                    <FormItem>
                                        <Field
                                            label={t('pages.settings.panels.devices.capabilities')}
                                            hint={t(
                                                'pages.settings.panels.devices.capabilities_hint'
                                            )}>
                                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                                                {ALL_CAPABILITIES.map(capability => {
                                                    const on =
                                                        capabilities?.includes(capability) ?? false;
                                                    return (
                                                        <button
                                                            key={capability}
                                                            type="button"
                                                            onClick={() =>
                                                                toggleCapability(capability)
                                                            }
                                                            className={cn(
                                                                'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                                                                on
                                                                    ? 'border-accent bg-accent/10 text-accent'
                                                                    : 'border-line bg-surface text-fg-muted hover:text-fg'
                                                            )}>
                                                            {capabilityLabels[capability]}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </Field>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid items-start gap-4 sm:grid-cols-2">
                                <FormField
                                    control={form.control}
                                    name="vendor"
                                    render={({ field }) => (
                                        <FormItem>
                                            <Field
                                                label={t('pages.settings.panels.devices.vendor')}
                                                htmlFor="device-vendor">
                                                <FormControl>
                                                    <Input
                                                        id="device-vendor"
                                                        {...field}
                                                        placeholder={t(
                                                            'pages.settings.panels.devices.vendor_placeholder'
                                                        )}
                                                    />
                                                </FormControl>
                                            </Field>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="model"
                                    render={({ field }) => (
                                        <FormItem>
                                            <Field
                                                label={t('pages.settings.panels.devices.model')}
                                                htmlFor="device-model">
                                                <FormControl>
                                                    <Input
                                                        id="device-model"
                                                        {...field}
                                                        placeholder={t(
                                                            'pages.settings.panels.devices.model_placeholder'
                                                        )}
                                                    />
                                                </FormControl>
                                            </Field>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="externalId"
                                render={({ field }) => (
                                    <FormItem>
                                        <Field
                                            label={t('pages.settings.panels.devices.external_id')}
                                            htmlFor="device-external-id"
                                            hint={t(
                                                'pages.settings.panels.devices.external_id_hint'
                                            )}>
                                            <FormControl>
                                                <Input
                                                    id="device-external-id"
                                                    {...field}
                                                    className="font-mono text-xs"
                                                />
                                            </FormControl>
                                        </Field>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {paired ? (
                            <div className="flex flex-wrap gap-1.5">
                                <SettingsPill tone="success">
                                    {t('pages.settings.panels.devices.paired_title')}
                                </SettingsPill>
                                <SettingsPill tone="accent">
                                    {connectionLabels[DeviceConnection.BLUETOOTH]}
                                </SettingsPill>
                            </div>
                        ) : null}

                        <DialogFooter className="border-t border-line pt-4 pb-1">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => onOpenChange(false)}>
                                {t('pages.settings.cancel')}
                            </Button>
                            <Button type="submit" disabled={submitting}>
                                {t('pages.settings.panels.devices.save')}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
