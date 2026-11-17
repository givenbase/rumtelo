'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { HouseholdPermissionSection, HouseholdRole, roleCanSee } from '@rumtelo/contracts';

import { normalizeAppPathname } from '@/app/_lib/path';
import { routeAccessForPath } from '@/app/_lib/route-capabilities';
import { useBoardWriteAccess } from '@/app/_lib/use-board-write-access';

function sectionFromPath(pathname: string): HouseholdPermissionSection {
    const routeSection = routeAccessForPath(pathname)?.section;
    if (routeSection) return routeSection;
    const path = normalizeAppPathname(pathname);
    if (path.startsWith('/settings')) return HouseholdPermissionSection.HOUSEHOLD_SETTINGS;
    return HouseholdPermissionSection.HOME;
}

/**
 * VIEWER look-along — bounce off routes they cannot read (growth, income, energy, soul, coach).
 * The section comes from the route table, not the nav. Why (`/product/why`) stays allowed.
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
