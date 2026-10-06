import { redirect } from 'next/navigation';

import { productPath } from '@/app/_lib/routes';

/** List lives on Money overview. Keep `/jars/{key}` for a single jar. */
export default function JarsListRedirectPage() {
    redirect(productPath('money'));
}
