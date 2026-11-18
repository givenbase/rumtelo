import { permanentRedirect } from 'next/navigation';

import { productPath } from '@/app/_lib/routes';

/**
 * Income lives under Money. Old Growth URLs (list, create, update/[id]) keep working: a
 * 308 to the same sub-path, with the query string kept (`?assetId=` prefill).
 */
export default async function GrowthIncomeRedirectPage({
    params,
    searchParams,
}: {
    params: Promise<{ path?: string[] }>;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const { path } = await params;
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(await searchParams)) {
        for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) {
            query.append(key, item);
        }
    }
    const suffix = path?.length ? `/${path.join('/')}` : '';
    const search = query.size > 0 ? `?${query.toString()}` : '';
    permanentRedirect(`${productPath('money/income')}${suffix}${search}`);
}
