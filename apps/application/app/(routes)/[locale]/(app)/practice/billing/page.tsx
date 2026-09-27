import { redirect } from 'next/navigation';

import { practiceSettingsHref } from '@/app/_lib/practice-settings-tabs';

/** Legacy `/practice/billing` → Settings → Billing. */
export default function BillingPage() {
    redirect(practiceSettingsHref('billing'));
}
