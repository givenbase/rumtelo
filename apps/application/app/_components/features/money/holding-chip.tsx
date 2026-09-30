'use client';

import Link from 'next/link';

import { useTranslations } from '@rumtelo/i18n';
import { cn } from '@rumtelo/utils';

import { assetDetailHref } from '@/app/_lib/create-routes';
import { useHoldings } from '@/app/_lib/use-holdings';

type HoldingChipProps = {
    assetId: string | null | undefined;
    /**
     * Render as a link to the holding. Leave false inside a `MoneyPartyRow`
     * (the row is already a link — nested anchors are invalid).
     */
    link?: boolean;
    className?: string;
};

/**
 * “Part of a holding” pill — the company, the car, the rental this row belongs to.
 * Separate from the payee chip: payee is who was paid, holding is what it was for.
 */
export function HoldingChip({ assetId, link = false, className }: HoldingChipProps) {
    const t = useTranslations('features.money.holding_link');
    const { byId } = useHoldings();
    if (!assetId) return null;
    const holding = byId.get(assetId);
    if (!holding) return null;

    const body = (
        <>
            <span aria-hidden className="text-[13px] leading-none">
                {holding.icon ?? '✦'}
            </span>
            {holding.name}
        </>
    );
    const chipClass = cn(
        'inline-flex min-h-6 items-center gap-1.5 rounded-full border border-accent/40 bg-accent-soft px-2.5 py-1 font-mono text-[10px] font-medium tracking-wide text-accent uppercase',
        link &&
            'hover:border-accent hover:bg-accent/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        className
    );

    if (link) {
        return (
            <Link
                href={assetDetailHref(holding.id)}
                aria-label={t('chip_aria', { name: holding.name })}
                className={chipClass}>
                {body}
            </Link>
        );
    }
    return (
        <span aria-label={t('chip_aria', { name: holding.name })} className={chipClass}>
            {body}
        </span>
    );
}
