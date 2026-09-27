'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { usePracticePreview } from '@/components/features/shell/practice-preview';

/** Soft-nav create / update / import / move paths. */
function isMutatePath(pathname: string): boolean {
    const path = pathname.replace(/^\/(en|nl|es|fr)(?=\/|$)/, '') || '/';
    return /\/(create|update|import)(\/|$)/.test(path) || /\/move\/create(\/|$)/.test(path);
}

/**
 * Block create/update modals while Practice is previewing a client board.
 * VIEW and MANAGE both start with showCreateFlows: false.
 * Only acts when the URL is actually a mutate route (empty modal slot is fine).
 */
export function PracticePreviewCreateGuard({ children }: { children: ReactNode }) {
    const router = useRouter();
    const pathname = usePathname() ?? '/';
    const { capabilities } = usePracticePreview();
    const blocked = !capabilities.showCreateFlows && isMutatePath(pathname);

    useEffect(() => {
        if (blocked) router.replace('/');
    }, [blocked, router]);

    if (blocked) return null;
    return children;
}
