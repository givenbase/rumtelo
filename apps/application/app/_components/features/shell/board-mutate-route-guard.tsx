'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { isBoardMutatePath } from '@/app/_lib/board-mutate-path';
import { useBoardWriteAccess } from '@/app/_lib/use-board-write-access';

/**
 * Block product create/update/import routes when the board is read-only
 * (Practice preview, household VIEWER, or frozen period).
 *
 * Never gates `/settings/…` — Export and archive Import are not soft-nav
 * create flows. (A broad `/(create|update|import)/` matcher used to send
 * `/settings/data/import` home whenever `showCreateFlows` was false.)
 */
export function BoardMutateRouteGuard({ children }: { children: ReactNode }) {
    const router = useRouter();
    const pathname = usePathname() ?? '/';
    const { showCreateFlows } = useBoardWriteAccess();
    const blocked = !showCreateFlows && isBoardMutatePath(pathname);

    useEffect(() => {
        if (blocked) router.replace('/');
    }, [blocked, router]);

    if (blocked) return null;
    return children;
}
