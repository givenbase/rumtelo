import type { ReactNode } from 'react';

import { redirect } from 'next/navigation';

import { isProductEnabled } from '@/app/_lib/launch-products';

/** Production launch: Soul is deferred — deep links go home. */
export default function SoulProductLayout({ children }: { children: ReactNode }) {
    if (!isProductEnabled('soul')) redirect('/');
    return children;
}
