'use client';

import { useEffect } from 'react';

const BANNER_HEIGHT_PX = 40;

/** Sets layout offset while the staging banner is mounted. */
export function StagingBannerOffset() {
    useEffect(() => {
        const root = document.documentElement;
        root.dataset.stagingBanner = 'true';
        root.style.setProperty('--staging-banner-h', `${BANNER_HEIGHT_PX}px`);
        return () => {
            delete root.dataset.stagingBanner;
            root.style.removeProperty('--staging-banner-h');
        };
    }, []);

    return null;
}
