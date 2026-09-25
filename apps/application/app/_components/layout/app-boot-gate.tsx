'use client';

import type { ReactNode } from 'react';

import { useTranslations } from '@rumtelo/i18n';
import { BrandLoader } from '@rumtelo/ui';

import { useAppShell } from '@/components/features/shell/app-shell-context';
import { AppShell } from '@/components/layout/shell';

/**
 * Holds the product shell until auth + household plan are known,
 * so Plus/Max routes never flash the 🔒 upgrade wall as Basic.
 * New users (session, no household) pass through so onboarding can mount.
 */
export function AppBootGate({ children, modal }: { children: ReactNode; modal: ReactNode }) {
    const t = useTranslations();
    const { planReady } = useAppShell();

    if (!planReady) {
        return <BrandLoader fullScreen label={t('ui.statusPage.loading')} />;
    }

    return (
        <AppShell>
            {children}
            {modal}
        </AppShell>
    );
}
