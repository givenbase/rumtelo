import { Suspense } from 'react';

import { getTranslations } from '@rumtelo/i18n';
import { BrandLoader } from '@rumtelo/ui';

import { AppBootGate } from '@/components/layout/app-boot-gate';
import { MaintenanceGate } from '@/components/layout/maintenance-gate';

export default async function AppLayout({
    children,
    modal,
}: {
    children: React.ReactNode;
    modal: React.ReactNode;
}) {
    const t = await getTranslations('ui.statusPage');
    return (
        <Suspense fallback={<BrandLoader fullScreen label={t('loading')} />}>
            <MaintenanceGate>
                <AppBootGate modal={modal}>{children}</AppBootGate>
            </MaintenanceGate>
        </Suspense>
    );
}
