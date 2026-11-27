'use client';

import Link from 'next/link';
import { useState } from 'react';

import { useLocale, useTranslations } from '@rumtelo/i18n';
import { Button } from '@rumtelo/ui';

import type { BasicsFit } from '@/app/_lib/basics-fit';
import { formatShare } from '@/app/_lib/jar-group';
import { moneyPath } from '@/app/_lib/routes';

/** Same share for every pot, to the basis point (the unit the server checks). */
function sameShares(
    left: Readonly<Record<string, number>>,
    right: Readonly<Record<string, number>>
) {
    const ids = new Set([...Object.keys(left), ...Object.keys(right)]);
    return [...ids].every(
        id => Math.round((left[id] ?? NaN) * 100) === Math.round((right[id] ?? NaN) * 100)
    );
}

/**
 * "Does Basics fit your fixed costs?" above the split. Information with one next move, no alarm:
 * the button only FILLS IN the split (the household still checks the total and presses Save).
 * The parent owns the numbers (one balances query), the form and the role gate; this block only
 * says what the numbers mean and hands the prepared shares back.
 */
export function JarsBasicsFit({
    fit,
    costs,
    shares,
    onApply,
}: {
    /** Null while the numbers load: nothing is shown rather than a guess. */
    fit: BasicsFit | null;
    /** Monthly fixed costs on Basics, already formatted in the household currency. */
    costs: string;
    /** The split as it stands in the form now (percent by jar id). */
    shares: Readonly<Record<string, number>>;
    /** Fill the form with these shares (by jar id); nothing is saved. */
    onApply: (shares: Record<string, number>) => void;
}) {
    const t = useTranslations('features.money.groups.basics_fit');
    const tNav = useTranslations('pages.nav.children');
    const locale = useLocale();
    const [appliedShares, setAppliedShares] = useState<Record<string, number> | null>(null);
    // The "filled in" note only describes the split that was filled in: any later edit hides it.
    const applied = appliedShares !== null && sameShares(appliedShares, shares);

    if (!fit) return null;

    if (fit.kind === 'no_income') {
        return (
            <p className="border-b border-line pb-2 text-xs leading-snug text-fg-muted">
                {t('no_income')}
            </p>
        );
    }

    if (fit.kind === 'fits') {
        return applied ? (
            <p
                role="status"
                className="border-b border-line pb-2 text-xs leading-snug text-fg-muted">
                {t('applied')}
            </p>
        ) : null;
    }

    const needed = formatShare(fit.neededPercent, locale);
    const current = formatShare(fit.currentPercent, locale);
    const delta = formatShare(fit.deltaPercent, locale);
    const future = formatShare(fit.kind === 'over' ? fit.fromFuturePercent : 0, locale);
    const over = fit.kind === 'over' ? fit : null;
    const canApply = over ? over.applicable : true;

    return (
        <section
            aria-labelledby="basics-fit-title"
            className="mb-2 grid gap-2 rounded-md border border-line bg-raised/40 px-3 py-2.5">
            <div className="grid min-w-0 gap-1">
                <h3 id="basics-fit-title" className="text-sm font-semibold text-fg">
                    {over ? t('over_title') : t('room_title')}
                </h3>
                <p className="text-xs leading-snug text-fg-muted">
                    {over
                        ? t('over_text', { costs, needed, current })
                        : t('room_text', { costs, needed, current })}
                </p>
                {over && canApply ? (
                    <p className="text-xs leading-snug text-fg-muted">
                        {over.fromFuturePercent > 0
                            ? t('over_effect_future', { delta, future })
                            : t('over_effect', { delta })}
                    </p>
                ) : null}
            </div>
            {canApply ? (
                <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="min-h-11 justify-self-start"
                    onClick={() => {
                        onApply(fit.shares);
                        setAppliedShares(fit.shares);
                    }}>
                    {over ? t('over_apply', { needed }) : t('room_apply', { delta })}
                </Button>
            ) : (
                // Nothing left to move: the one next move is to look at the fixed costs themselves.
                <div className="grid min-w-0 gap-1">
                    <p className="text-xs leading-snug text-fg-muted">{t('over_stuck')}</p>
                    <Button
                        as={Link}
                        href={moneyPath('fixed-costs')}
                        variant="secondary"
                        size="sm"
                        className="min-h-11 justify-self-start">
                        {tNav('fixed_costs')}
                    </Button>
                </div>
            )}
        </section>
    );
}
