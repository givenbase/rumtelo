import { redirect } from 'next/navigation';

import { productPath } from '@/app/_lib/routes';

/** Net worth lives under Money. */
export default function GrowthNetWorthListRedirectPage() {
    redirect(productPath('money/net-worth'));
}
