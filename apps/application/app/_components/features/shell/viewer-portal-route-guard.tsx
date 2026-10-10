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
    // Coach product only — Why stays under HOME (VIEWER may open it).
    if (path.includes('/product/coach')) return HouseholdPermissionSection.COACH;
    if (path.includes('/product/why')) return HouseholdPermissionSection.HOME;
    if (path.includes('/product/money')) return HouseholdPermissionSection.MONEY;
    if (path.includes('/settings')) return HouseholdPermissionSection.HOUSEHOLD_SETTINGS;
    return HouseholdPermissionSection.HOME;
}

/**
 * VIEWER look-along — bounce off portals they cannot read (growth/energy/soul/coach).
 * Why (`/product/why`) stays allowed.
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
