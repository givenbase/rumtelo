'use client';

import { apiQuery } from '@/app/_lib/api-hooks';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { FlowDirection } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { Button, Card, Typography, VendorMark } from '@rumtelo/ui';
import { monthlyAmount, toPeriodKey } from '@rumtelo/utils';

import { debtDetailHref, txDetailHref, updateHref } from '@/app/_lib/create-routes';
import { claimFixedCostMatches, fixedCostStatus } from '@/app/_lib/fixed-cost-match';
import { bgClassToCssVar, cadenceLabel } from '@/app/_lib/jar-chrome';
import { jarChrome } from '@/app/_lib/jar-meta';
import { jarKeyToSlug } from '@/app/_lib/jar-slug';
import { catalogMarkChrome } from '@/app/_lib/party-mark-chrome';
import { isLiveData } from '@/app/_lib/preview';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';
import { useJarCatalog } from '@/app/_lib/use-jar-catalog';
import { findPartyVendor, partyMark } from '@/app/_lib/vendor-brands';
import { useCategoryTemplates } from '@/components/features/forms/catalog-helpers';
import {
    JarBadge,
    MetaChip,
    formatBookedDate,
    formatDueDay,
} from '@/components/features/money/jar-badge';
import { MoneyPartyRow } from '@/components/features/money/money-party-row';
import { useAppShell } from '@/components/features/shell/app-shell-context';
import { useAuth } from '@/components/features/shell/auth-provider';

function statusLabel(status: ReturnType<typeof fixedCostStatus>) {
    if (status === 'taken') return 'Taken this period';
    if (status === 'due') return 'Still due';
    return 'Planned';
}

/**
 * Fixed-cost detail — see the plan and this period’s status; Edit opens the form.
 */
export function FixedCostDetailPageClient({ fixedCostId }: { fixedCostId: string }) {
    const { householdId } = useAuth();
    const { period } = useAppShell();
    const router = useRouter();
    const { formatMoney } = useHouseholdCurrency();
    const live = isLiveData(householdId);
    const periodKey = toPeriodKey(period.year, period.month);
    const { byKey: jarByKey } = useJarCatalog();
    const categoryTemplatesQuery = useCategoryTemplates(live);

    const listQuery = useLiveQuery(
        apiQuery.money.fixedCosts.list.queryOptions({ input: { householdId: householdId! } }),
        [] as never,
        live
    );
    const jarsQuery = useLiveQuery(
        apiQuery.money.jars.list.queryOptions({ input: { householdId: householdId! } }),
        [] as never,
        live
    );
    const periodTxQuery = useLiveQuery(
        apiQuery.money.transactions.list.queryOptions({
            input: { householdId: householdId!, period: periodKey, limit: 200 },
        }),
        { items: [], nextCursor: null },
        live
    );
    const merchantsQuery = useLiveQuery(
        apiQuery.money.catalogs.merchantPresets.list.queryOptions({
            input: { householdId: householdId! },
        }),
        [] as never,
        live
    );
    const givingOrgsQuery = useLiveQuery(
        apiQuery.money.catalogs.givingOrganisations.list.queryOptions({
            input: { householdId: householdId! },
        }),
        [] as never,
        live
    );

    const item = (listQuery.data ?? []).find(row => row.id === fixedCostId);
    const jars = jarsQuery.data ?? [];
    const jar = item ? jars.find(row => row.id === item.jarId) : undefined;
    const merchants = merchantsQuery.data ?? [];
    const givingOrgs = givingOrgsQuery.data ?? [];
    const categoryTemplates = categoryTemplatesQuery.data ?? [];
    const periodTxs = periodTxQuery.data?.items ?? [];

    if (live && listQuery.isLoading && !item) {
        return (
            <Typography as="p" size="sm" color="muted">
                Loading…
            </Typography>
        );
    }
    if (!item) {
        return (
            <div className="grid gap-4">
                <Link
                    href="/product/money/fixed-costs"
                    className="w-fit font-mono text-xs font-medium tracking-wide text-fg-faint uppercase hover:text-accent">
                    ← Fixed costs
                </Link>
                <Typography as="p" size="sm" color="muted">
                    Fixed cost not found.
                </Typography>
            </div>
        );
    }

    const monthly = monthlyAmount(Math.abs(item.amount), item.cadence);
    const { matchByFixedCostId } = claimFixedCostMatches([item], periodTxs);
    const match = matchByFixedCostId.get(item.id);
    const status = fixedCostStatus(item, match, period);
    const company = item.counterparty?.trim() || item.name;
    const subtitle =
        item.counterparty?.trim() && item.counterparty.trim() !== item.name.trim()
            ? item.name
            : null;
    const mark = partyMark(
        findPartyVendor(company, merchants, givingOrgs),
        catalogMarkChrome({
            billName: item.name,
            jarKey: jar?.key,
            jarByKey,
            categoryTemplates,
        })
    );
    const due = formatDueDay(item.dueDay);
    const signedMonthly =
        item.direction === FlowDirection.IN ? Math.abs(monthly) : -Math.abs(monthly);
    const jarHref = jar?.key ? `/product/money/jars/${jarKeyToSlug(jar.key)}` : null;
    const jarIcon =
        jar?.icon?.trim() || (jar?.key ? jarByKey.get(jar.key)?.icon?.trim() : null) || '◇';
    const jarTone = jar?.key ? bgClassToCssVar(jarChrome(jar.key).color) : null;

    return (
        <div className="grid animate-rise gap-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="grid gap-3">
                    <Link
                        href="/product/money/fixed-costs"
                        className="w-fit font-mono text-xs font-medium tracking-wide text-fg-faint uppercase hover:text-accent">
                        ← Fixed costs
                    </Link>
                    <div className="flex items-center gap-3">
                        <VendorMark
                            name={mark.name}
                            src={mark.src}
                            fallbackIcon={mark.fallbackIcon}
                            tone={mark.tone}
                            size={40}
                        />
                        <div>
                            <h1 className="text-2xl font-semibold tracking-tight text-fg">
                                {company}
                            </h1>
                            {subtitle ? (
                                <p className="mt-0.5 font-mono text-xs text-fg-muted">{subtitle}</p>
                            ) : null}
                        </div>
                    </div>
                </div>
                <Button
                    type="button"
                    variant="secondary"
                    onClick={() => router.push(updateHref('fixed', item.id))}>
                    Edit
                </Button>
            </div>

            <Card className="grid gap-4 p-5">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <p className="font-mono text-[10px] tracking-wider text-fg-muted uppercase">
                            This period
                        </p>
                        <p className="mt-1 text-2xl font-semibold text-fg">
                            {formatMoney(signedMonthly)}
                        </p>
                    </div>
                    <MetaChip
                        className={
                            status === 'taken'
                                ? 'border-success/30 text-success'
                                : status === 'due'
                                  ? 'border-danger/30 text-danger'
                                  : undefined
                        }>
                        {statusLabel(status)}
                    </MetaChip>
                </div>
                <div className="flex flex-wrap gap-1.5">
                    <MetaChip>{cadenceLabel(item.cadence)}</MetaChip>
                    {due ? <MetaChip>{due}</MetaChip> : null}
                    {Math.abs(monthly) !== Math.abs(item.amount) ? (
                        <MetaChip>
                            {formatMoney(item.amount)} / {cadenceLabel(item.cadence).toLowerCase()}
                        </MetaChip>
                    ) : null}
                    {jar && jarHref ? (
                        <button
                            type="button"
                            onClick={() => router.push(jarHref)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-raised py-0.5 pr-2 pl-1 outline-none hover:border-accent-hover focus-visible:ring-2 focus-visible:ring-accent/25">
                            <span
                                className="grid size-5 place-items-center rounded-md text-[11px]"
                                style={
                                    jarTone
                                        ? { background: jarTone }
                                        : { background: 'var(--color-raised)' }
                                }
                                aria-hidden>
                                {jarIcon}
                            </span>
                            <JarBadge
                                jarKey={jar.key}
                                name={jar.name}
                                className="border-0 bg-transparent p-0"
                            />
                        </button>
                    ) : jar ? (
                        <JarBadge jarKey={jar.key} name={jar.name} />
                    ) : null}
                    {!item.isActive ? <MetaChip>Inactive</MetaChip> : null}
                </div>
            </Card>

            <Card className="grid gap-3 p-5">
                <p className="font-mono text-[10px] tracking-wider text-fg-muted uppercase">Plan</p>
                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                    <div>
                        <dt className="font-mono text-[10px] tracking-wide text-fg-faint uppercase">
                            Amount
                        </dt>
                        <dd className="mt-0.5 text-fg">{formatMoney(Math.abs(item.amount))}</dd>
                    </div>
                    <div>
                        <dt className="font-mono text-[10px] tracking-wide text-fg-faint uppercase">
                            Direction
                        </dt>
                        <dd className="mt-0.5 text-fg">
                            {item.direction === FlowDirection.IN ? 'Money in' : 'Money out'}
                        </dd>
                    </div>
                    {item.endsOn ? (
                        <div>
                            <dt className="font-mono text-[10px] tracking-wide text-fg-faint uppercase">
                                Ends
                            </dt>
                            <dd className="mt-0.5 text-fg">{formatBookedDate(item.endsOn)}</dd>
                        </div>
                    ) : null}
                    {item.note ? (
                        <div className="sm:col-span-2">
                            <dt className="font-mono text-[10px] tracking-wide text-fg-faint uppercase">
                                Note
                            </dt>
                            <dd className="mt-0.5 text-fg-secondary">{item.note}</dd>
                        </div>
                    ) : null}
                </dl>
            </Card>

            <section className="grid gap-3">
                <Typography as="h2" variant="eyebrow" color="primary">
                    ✦ This period’s payment
                </Typography>
                <Card className="p-0">
                    {match ? (
                        <MoneyPartyRow
                            title={match.counterparty?.trim() || match.description}
                            subtitle={
                                match.counterparty?.trim() &&
                                match.description !== match.counterparty.trim()
                                    ? match.description
                                    : null
                            }
                            mark={partyMark(
                                findPartyVendor(
                                    match.counterparty?.trim() || match.description,
                                    merchants,
                                    givingOrgs
                                ),
                                catalogMarkChrome({
                                    jarKey: jar?.key,
                                    jarByKey,
                                    categoryTemplates,
                                })
                            )}
                            amount={formatMoney(match.amount)}
                            amountClassName={match.amount < 0 ? 'text-fg' : 'text-success'}
                            badges={<MetaChip>{formatBookedDate(match.bookedOn)}</MetaChip>}
                            onClick={() => router.push(txDetailHref(match.id))}
                        />
                    ) : (
                        <Typography as="p" size="sm" color="muted" className="px-5 py-4">
                            No matching payment logged in this period yet.
                        </Typography>
                    )}
                </Card>
            </section>

            {item.debtId ? (
                <section className="grid gap-3">
                    <Typography as="h2" variant="eyebrow" color="primary">
                        ✦ Linked debt
                    </Typography>
                    <Card className="p-0">
                        <button
                            type="button"
                            onClick={() => router.push(debtDetailHref(item.debtId!))}
                            className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-raised">
                            <span className="text-sm text-fg">Open linked debt</span>
                            <span className="font-mono text-xs text-accent uppercase">Open ›</span>
                        </button>
                    </Card>
                </section>
            ) : null}
        </div>
    );
}
