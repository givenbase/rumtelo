import { redirect } from 'next/navigation';

import { productPath } from '@/app/_lib/routes';

/** Net worth lives under Money. Keep old Growth URLs working. */
export default async function GrowthNetWorthRedirectPage({
    params,
}: {
    params: Promise<{ path?: string[] }>;
}) {
    const { path } = await params;
    const suffix = path?.length ? `/${path.join('/')}` : '';
    redirect(`${productPath('money/net-worth')}${suffix}`);
}
