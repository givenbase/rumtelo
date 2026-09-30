'use client';

import Link from 'next/link';

import type { BusinessHouseholdLeak } from '@rumtelo/utils';
import { useTranslations } from '@rumtelo/i18n';
import { Button } from '@rumtelo/ui';

import { assetDetailHref, fixedCostsForAssetHref } from '@/app/_lib/create-routes';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';
import { CoachTipCard } from '@/components/features/helpers';

/**
 * Coach tip when BUSINESS holding costs still run through household jars.
 * Never blocks — visibility only (Eker: pay from the business or raise the draw).
 */
export function BusinessHouseholdLeakCard({ leak }: { leak: BusinessHouseholdLeak }) {
    const t = useTranslations('features.money.business_household_leak');
    const { formatMoney } = useHouseholdCurrency();
    if (!leak.active) return null;

    const amount = formatMoney(leak.monthlyOutCents);
    const primaryId = leak.assetIds[0];

    return (
        <CoachTipCard
            title={t('title')}
            tone="warning"
            meta={t('meta', { count: leak.billCount })}
            actions={
                primaryId ? (
                    <>
                        <Button
                            as={Link}
                            href={assetDetailHref(primaryId)}
                            size="sm"
                            variant="secondary">
                            {t('open_holding')}
                        </Button>
                        <Button as={Link} href={fixedCostsForAssetHref(primaryId)} size="sm">
                            {t('review_bills')}
                        </Button>
                    </>
                ) : undefined
            }>
            {leak.primaryName
                ? t('body_named', { amount, name: leak.primaryName })
                : t('body', { amount })}
        </CoachTipCard>
    );
}
