'use client';

import type { ReactNode } from 'react';

import { BrandLoader } from '@rumtelo/ui';

import { useAppShell } from '@/components/features/shell/app-shell-context';
import { AppShell } from '@/components/layout/shell';

/**
 * Holds the product shell until auth + household plan are known,
 * so Plus/Max routes never flash the 🔒 upgrade wall as Basic.
 */
export function AppBootGate({ children, modal }: { children: ReactNode; modal: ReactNode }) {
    const { planReady } = useAppShell();

    if (!planReady) {
        return <BrandLoader fullScreen label="Loading" />;
    }

    return (
        <AppShell>
            {children}
            {modal}
        </AppShell>
    );
}
