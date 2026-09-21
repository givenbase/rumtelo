import type { ReactNode } from 'react';

import { redirect } from 'next/navigation';

import { isProductEnabled } from '@/app/_lib/launch-products';

/** Production launch: Soul settings deferred with the portal. */
export default function SoulSettingsLayout({ children }: { children: ReactNode }) {
    if (!isProductEnabled('soul')) redirect('/settings');
    return children;
}
