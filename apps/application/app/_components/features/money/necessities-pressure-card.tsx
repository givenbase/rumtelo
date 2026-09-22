'use client';

import Link from 'next/link';

import { useTranslations } from '@rumtelo/i18n';
import { Button } from '@rumtelo/ui';

import { CREATE_HREF } from '@/app/_lib/create-routes';
import type { NecessitiesPressure } from '@/app/_lib/necessities-pressure';
import { productPath } from '@/app/_lib/routes';
import { CoachTipCard } from '@/components/features/helpers';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';

/**
 * Coach tip when fixed costs / Necessities exceed the Eker envelope.
 * Doctrine: apps/backend/.../money/README.md → “When Necessities can’t fit in 55%”
 */
export function NecessitiesPressureCard({
    pressure,
    variant = 'plan',
}: {
    pressure: NecessitiesPressure;
    /** `plan` = fixed-costs overview; `jar` = jars list (envelope already known). */
    variant?: 'plan' | 'jar';
}) {
    const t = useTranslations('features.money.necessities_pressure');
    const { formatMoney } = useHouseholdCurrency();
    if (!pressure.active) return null;

    const shortfallLine =
        pressure.shortfallCents > 0
            ? t('shortfall_line', {
                  amount: formatMoney(pressure.shortfallCents),
                  pct: pressure.necessitiesPct,
              })
            : t('commitment_line', {
                  ratio: pressure.commitmentRatio,
                  pct: pressure.necessitiesPct,
              });

    return (
        <CoachTipCard
            title={t('title')}
            tone="warning"
            meta={
                variant === 'plan' && pressure.envelopeCents > 0 ? (
                    <>
                        {t('meta', {
                            envelope: formatMoney(pressure.envelopeCents),
                            ratio: pressure.commitmentRatio,
                        })}
                    </>
                ) : undefined
            }
            actions={
                <>
                    {variant === 'jar' ? (
                        <Button
                            as={Link}
                            href={productPath('money/fixed-costs')}
                            size="sm"
                            variant="secondary">
                            {t('review_fixed')}
                        </Button>
                    ) : (
                        <Button
                            as={Link}
                            href={productPath('money/jars/necessities')}
                            size="sm"
                            variant="secondary">
                            {t('open_jar')}
                        </Button>
                    )}
                    <Button as={Link} href={CREATE_HREF.income} size="sm">
                        {t('raise_income')}
                    </Button>
                </>
            }>
            {shortfallLine} {t('body', { pct: pressure.necessitiesPct })}
        </CoachTipCard>
    );
}
