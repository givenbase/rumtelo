'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { useBoardWriteAccess } from '@/app/_lib/use-board-write-access';

/** Soft-nav create / update / import / move paths. */
function isMutatePath(pathname: string): boolean {
    const path = pathname.replace(/^\/(en|nl|es|fr)(?=\/|$)/, '') || '/';
    return /\/(create|update|import)(\/|$)/.test(path) || /\/move\/create(\/|$)/.test(path);
}

/**
 * Block create/update/import routes when the board is read-only
 * (Practice preview or household VIEWER).
 */
export function BoardMutateRouteGuard({ children }: { children: ReactNode }) {
    const router = useRouter();
    const pathname = usePathname() ?? '/';
    const { showCreateFlows } = useBoardWriteAccess();
    const blocked = !showCreateFlows && isMutatePath(pathname);

    useEffect(() => {
        if (blocked) router.replace('/');
    }, [blocked, router]);

    if (blocked) return null;
    return children;
}
