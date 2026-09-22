'use client';

import { apiQuery } from '@/app/_lib/api-hooks';
import Link from 'next/link';

import type { AssetKind } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { useTranslations } from '@rumtelo/i18n';
import { Button, Card, Typography } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { updateHref } from '@/app/_lib/create-routes';
import { isLiveData } from '@/app/_lib/preview';
import { productPath } from '@/app/_lib/routes';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';
import { useAuth } from '@/components/features/shell/auth-provider';
import { EditIcon } from '@/components/features/ui/action-icons';

const EMPTY_KINDS: AssetKind[] = [];

function statusLine(
    kindKey: string,
    locked: boolean,
    pays: boolean,
    t: ReturnType<typeof useTranslations<'features.growth.net_worth'>>
): string {
    if (kindKey === 'PENSION') return t('holding_pension');
    if (locked) return t('holding_locked');
    if (pays) return t('holding_pays');
    return t('holding_appreciates');
}

/**
 * One holding. Edit opens the update sheet; this page is for reading it.
 */
export function AssetDetailPageClient({ assetId }: { assetId: string }) {
    const t = useTranslations('features.growth.net_worth');
    const tAction = useTranslations('common.action');
    const { householdId } = useAuth();
    const { formatMoney } = useHouseholdCurrency();
    const live = isLiveData(householdId);

    const assetQuery = useLiveQuery(
        apiQuery.growth.assets.get.queryOptions({
            input: { householdId: householdId!, id: assetId },
        }),
        null as never,
        live
    );
    const kindsQuery = useLiveQuery(
        apiQuery.growth.catalogs.assetKinds.list.queryOptions({
            input: { householdId: householdId! },
        }),
        EMPTY_KINDS,
        live
    );

    const asset = assetQuery.data;
    const boardHref = productPath('growth/net-worth');

    if (live && assetQuery.isLoading && !asset) {
        return (
            <Typography as="p" size="sm" color="muted">
                {t('detail.loading')}
            </Typography>
        );
    }
    if (!asset) {
        return (
            <div className="grid gap-4">
                <Link
                    href={boardHref}
                    className="font-mono text-xs tracking-wide text-accent uppercase hover:underline">
                    {t('detail.back')}
                </Link>
                <p className="text-sm text-fg-muted">{t('detail.not_found')}</p>
            </div>
        );
    }

    const kind = (kindsQuery.data ?? EMPTY_KINDS).find(row => row.key === asset.kindKey);
    const locked = kind ? !kind.canPay : false;
    const pays = !locked && asset.flow > 0;
    const income = locked
        ? t('not_available_yet')
        : pays
          ? `+ ${formatMoney(asset.flow)}`
          : formatMoney(0);

    return (
        <div className="grid animate-rise gap-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="grid gap-3">
                    <Link
                        href={boardHref}
                        className="w-fit font-mono text-xs font-medium tracking-wide text-fg-faint uppercase hover:text-accent">
                        {t('detail.back')}
                    </Link>
                    <div className="flex items-start gap-3">
                        <span
                            className="grid size-10 shrink-0 place-items-center rounded-xl border border-line bg-sunken text-xl"
                            aria-hidden>
                            {kind?.icon ?? '✦'}
                        </span>
                        <div>
                            <p className="font-mono text-[10px] tracking-widest text-fg-muted uppercase">
                                {kind?.name ?? t('kind_fallback')}
                                {' · '}
                                {statusLine(asset.kindKey, locked, pays, t)}
                            </p>
                            <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-fg">
                                {asset.name}
                            </h1>
                        </div>
                    </div>
                </div>
                <Button as={Link} href={updateHref('asset', asset.id)} variant="secondary">
                    <EditIcon />
                    {tAction('edit')}
                </Button>
            </div>

            <Card className="grid gap-4 p-5">
                <div className="grid grid-cols-2 gap-3">
                    <div className="flex overflow-hidden rounded-xl border border-line bg-sunken">
                        <span aria-hidden className="w-1 shrink-0 bg-accent" />
                        <div className="grid min-w-0 gap-1.5 px-3.5 py-3">
                            <p className="font-mono text-[10px] tracking-wider text-fg-muted uppercase">
                                {t('value')}
                            </p>
                            <p className="font-display text-xl leading-none font-semibold tracking-tight text-fg sm:text-2xl">
                                {formatMoney(asset.value)}
                            </p>
                        </div>
                    </div>
                    <div className="flex overflow-hidden rounded-xl border border-line bg-sunken">
                        <span
                            aria-hidden
                            className={cn('w-1 shrink-0', pays ? 'bg-accent' : 'bg-fg-muted')}
                        />
                        <div className="grid min-w-0 gap-1.5 px-3.5 py-3">
                            <p className="font-mono text-[10px] tracking-wider text-fg-muted uppercase">
                                {t('monthly_income')}
                            </p>
                            <p
                                className={cn(
                                    'font-display text-xl leading-none font-semibold tracking-tight sm:text-2xl',
                                    pays ? 'text-accent' : 'text-fg-muted'
                                )}>
                                {income}
                            </p>
                        </div>
                    </div>
                </div>
                {kind?.description ? (
                    <Typography
                        as="p"
                        size="sm"
                        color="muted"
                        className="border-t border-line pt-4 text-pretty">
                        {kind.description}
                    </Typography>
                ) : null}
            </Card>
        </div>
    );
}
