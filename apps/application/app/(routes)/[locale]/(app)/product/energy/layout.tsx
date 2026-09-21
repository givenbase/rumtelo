import type { ReactNode } from 'react';

import { redirect } from 'next/navigation';

import { isProductEnabled } from '@/app/_lib/launch-products';

/** Production launch: Energy is deferred — deep links go home. */
export default function EnergyProductLayout({ children }: { children: ReactNode }) {
    if (!isProductEnabled('energy')) redirect('/');
    return children;
}
