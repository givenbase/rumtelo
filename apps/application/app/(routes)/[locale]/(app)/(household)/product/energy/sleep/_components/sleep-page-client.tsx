'use client';

import { DeviceCapability } from '@rumtelo/contracts';
import { useTranslations } from '@rumtelo/i18n';
import { EmptyState, Section, Typography } from '@rumtelo/ui';

import { ConnectDeviceCta } from '@/app/_components/features/devices/connect-device-cta';

export function SleepPageClient() {
    const t = useTranslations('features.energy.sleep');

    return (
        <div className="grid animate-rise gap-6">
            <Section eyebrow={t('eyebrow')} title={t('title')}>
                <Typography as="p" variant="lead" size="default">
                    {t('lead')}
                </Typography>
                <div className="mt-3">
                    <ConnectDeviceCta
                        capability={DeviceCapability.SLEEP}
                        labelKey="pages.settings.panels.devices.connect_cta_sleep"
                    />
                </div>
            </Section>

            <EmptyState icon="moon" title={t('empty_title')} body={t('empty_body')} />
        </div>
    );
}
