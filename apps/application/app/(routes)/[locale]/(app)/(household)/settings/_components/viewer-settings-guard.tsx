'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { HouseholdRole } from '@rumtelo/contracts';

import { useBoardWriteAccess } from '@/app/_lib/use-board-write-access';
import {
    isViewerAllowedSettingsTab,
    settingsHref,
    settingsTabFromPathname,
} from '@/app/_lib/settings-tabs';

/**
 * VIEWER look-along — bounce off household settings (jars, bank, export, …)
 * back to personal account settings.
 */
export function ViewerSettingsGuard({ children }: { children: ReactNode }) {
    const router = useRouter();
    const pathname = usePathname() ?? '';
    const { role } = useBoardWriteAccess();
    const tab = settingsTabFromPathname(pathname);
    const blocked = role === HouseholdRole.VIEWER && !isViewerAllowedSettingsTab(tab);

    useEffect(() => {
        if (blocked) router.replace(settingsHref('account'));
    }, [blocked, router]);

    if (blocked) return null;
    return children;
}
