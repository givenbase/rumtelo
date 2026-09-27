import { redirect } from 'next/navigation';

import { practiceSettingsHref } from '@/app/_lib/practice-settings-tabs';

/** Default settings tab — Billing first. */
export default function PracticeSettingsIndexPage() {
    redirect(practiceSettingsHref('billing'));
}
