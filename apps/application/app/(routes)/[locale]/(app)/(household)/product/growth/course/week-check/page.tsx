import { permanentRedirect } from 'next/navigation';

import { productPath } from '@/app/_lib/routes';

/**
 * The Course week check is part of the one week check now (Money stages, then Course).
 * Old links and calendar events land on the Money week check, opened at the Course stages.
 * The locale is a cookie, not a path prefix (`localePrefix: 'never'`), so it is kept as is.
 */
export default function Page() {
    permanentRedirect(`${productPath('money/week-check')}?from=course`);
}
