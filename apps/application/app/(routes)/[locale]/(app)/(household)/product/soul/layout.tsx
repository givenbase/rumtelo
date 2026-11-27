import type { ReactNode } from 'react';

import { redirect } from 'next/navigation';

import { isProductEnabled } from '@/app/_lib/launch-products';
import { productPath } from '@/app/_lib/routes';

/**
 * Production launch: the Soul pages are deferred. The Soul (Mindset) tab carries Learn alone
 * there, so a deep link into a deferred Soul page lands on Learn, where the Learn gates apply.
 */
export default function SoulProductLayout({ children }: { children: ReactNode }) {
    if (!isProductEnabled('soul')) redirect(productPath('growth/learn'));
    return children;
}
