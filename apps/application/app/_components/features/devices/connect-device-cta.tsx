'use client';

import Link from 'next/link';

import type { DeviceCapability } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { useTranslations } from '@rumtelo/i18n';
import { Button } from '@rumtelo/ui';

import { apiQuery } from '@/app/_lib/api-hooks';
import { isLiveData } from '@/app/_lib/preview';
import { settingsHref } from '@/app/_lib/settings-tabs';
import { useAuth } from '@/components/features/shell/auth-provider';

type ConnectDeviceCtaProps = {
    capability: DeviceCapability;
    /** Optional override for the empty-state button label. */
    labelKey?: string;
};

/**
 * Product-screen CTA: deep-link to Devices settings filtered by capability.
 * When a matching device already exists, shows who/what is tracking instead.
 */
export function ConnectDeviceCta({ capability, labelKey }: ConnectDeviceCtaProps) {
    const t = useTranslations();
    const { householdId } = useAuth();
    const live = isLiveData(householdId);
    const devicesQuery = useLiveQuery(
        apiQuery.device.list.queryOptions({ input: { capability } }),
        [],
        live
    );
    const match = (devicesQuery.data ?? [])[0];
    const href = `${settingsHref('devices')}?capability=${capability}`;

    if (match) {
        return (
            <p className="text-sm text-fg-muted">
                {t('pages.settings.panels.devices.tracked_by', { name: match.name })}
            </p>
        );
    }

    return (
        <Button as={Link} href={href} variant="secondary" size="sm">
            {t(labelKey ?? 'pages.settings.panels.devices.connect_cta')}
        </Button>
    );
}
