'use client';

import Link from 'next/link';

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
    const { formatMoney } = useHouseholdCurrency();
    if (!pressure.active) return null;

    const shortfallLine =
        pressure.shortfallCents > 0
            ? `Necessities is short ${formatMoney(pressure.shortfallCents)}/mo against its ${pressure.necessitiesPct}% envelope.`
            : `Fixed costs take ${pressure.commitmentRatio}% of income — above the ${pressure.necessitiesPct}% Necessities goal.`;

    return (
        <CoachTipCard
            title="Necessities under pressure"
            tone="warning"
            meta={
                variant === 'plan' && pressure.envelopeCents > 0 ? (
                    <>
                        Envelope {formatMoney(pressure.envelopeCents)}/mo · fixed OUT{' '}
                        {pressure.commitmentRatio}% of income
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
                            Review fixed costs
                        </Button>
                    ) : (
                        <Button
                            as={Link}
                            href={productPath('money/jars/necessities')}
                            size="sm"
                            variant="secondary">
                            Open Necessities jar
                        </Button>
                    )}
                    <Button as={Link} href={CREATE_HREF.income} size="sm">
                        + Raise income
                    </Button>
                </>
            }>
            {shortfallLine} That is common at the start — {pressure.necessitiesPct}% is a goal to
            work toward. Simplify bills and/or raise income. Do not raid Financial Freedom to paper
            over rent.
        </CoachTipCard>
    );
}
