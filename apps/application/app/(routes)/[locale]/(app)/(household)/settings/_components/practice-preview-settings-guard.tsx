'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

import { usePracticePreview } from '@/components/features/shell/practice-preview';

/** Household settings are for members — bounce Practice preview back to the board. */
export function PracticePreviewSettingsGuard({ children }: { children: ReactNode }) {
    const router = useRouter();
    const { capabilities } = usePracticePreview();

    useEffect(() => {
        if (!capabilities.showSettings) router.replace('/');
    }, [capabilities.showSettings, router]);

    if (!capabilities.showSettings) return null;
    return children;
}
