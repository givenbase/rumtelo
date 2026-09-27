'use client';

import { useTranslations } from '@rumtelo/i18n';

import { PracticeBillingSection } from './practice-billing-section';
import { PracticePageHeader } from './practice-chrome';

/** Subscription / invoice — Practice settings → Billing tab (default). */
export function PracticeBillingSettings() {
    const t = useTranslations();
    return (
        <div className="grid gap-3">
            <PracticePageHeader
                title={t('pages.practice.settings.tabs.billing.label')}
                blurb={t('pages.practice.settings.tabs.billing.sub')}
            />
            <PracticeBillingSection />
        </div>
    );
}
