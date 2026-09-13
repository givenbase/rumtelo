import { Suspense } from 'react';

import { BrandLoader } from '@rumtelo/ui';

import { AppBootGate } from '@/components/layout/app-boot-gate';

export default function AppLayout({
    children,
    modal,
}: {
    children: React.ReactNode;
    modal: React.ReactNode;
}) {
    return (
        <Suspense fallback={<BrandLoader fullScreen label="Loading" />}>
            <AppBootGate modal={modal}>{children}</AppBootGate>
        </Suspense>
    );
}
