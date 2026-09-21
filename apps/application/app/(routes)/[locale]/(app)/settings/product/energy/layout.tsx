import type { ReactNode } from 'react';

import { redirect } from 'next/navigation';

import { isProductEnabled } from '@/app/_lib/launch-products';

/** Production launch: Energy settings deferred with the portal. */
export default function EnergySettingsLayout({ children }: { children: ReactNode }) {
    if (!isProductEnabled('energy')) redirect('/settings');
    return children;
}
