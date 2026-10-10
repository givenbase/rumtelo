'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { HouseholdPermissionSection, HouseholdRole, roleCanSee } from '@rumtelo/contracts';

import { useBoardWriteAccess } from '@/app/_lib/use-board-write-access';

function sectionFromPath(pathname: string): HouseholdPermissionSection {
    const path = pathname.replace(/^\/(en|nl|es|fr)(?=\/|$)/, '') || '/';
    if (path.includes('/product/growth')) return HouseholdPermissionSection.GROWTH;
    if (path.includes('/product/energy')) return HouseholdPermissionSection.ENERGY;
    if (path.includes('/product/soul')) return HouseholdPermissionSection.SOUL;
    if (path.includes('/product/coach') || path.includes('/product/why')) {
        return HouseholdPermissionSection.COACH;
    }
    if (path.includes('/product/money')) return HouseholdPermissionSection.MONEY;
    if (path.includes('/settings')) return HouseholdPermissionSection.HOUSEHOLD_SETTINGS;
    return HouseholdPermissionSection.HOME;
}

/**
 * VIEWER look-along — bounce off portals they cannot read (growth/energy/soul/coach).
 */
export function ViewerPortalRouteGuard({ children }: { children: ReactNode }) {
    const router = useRouter();
    const pathname = usePathname() ?? '/';
    const { role } = useBoardWriteAccess();
    const section = sectionFromPath(pathname);
    const blocked =
        role === HouseholdRole.VIEWER &&
        section !== HouseholdPermissionSection.HOUSEHOLD_SETTINGS &&
        !roleCanSee(role, section);

    useEffect(() => {
        if (blocked) router.replace('/');
    }, [blocked, router]);

    if (blocked) return null;
    return children;
}
