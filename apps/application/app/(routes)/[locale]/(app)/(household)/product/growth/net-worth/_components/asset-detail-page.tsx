'use client';

import { apiQuery } from '@/app/_lib/api-hooks';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';

import {
    Cadence,
    FlowDirection,
    type AssetKind,
    type FixedCost,
    type IncomeSource,
    type Jar,
    type MerchantPreset,
    type Transaction,
} from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { useLocale, useTranslations } from '@rumtelo/i18n';
import { Icon, Button, Card, Typography, VendorMark } from '@rumtelo/ui';
import { assetFlowSummary, cn, endOfPeriodIso, monthlyAmount, toPeriodKey } from '@rumtelo/utils';

import { carMarkForName } from '@/app/_lib/car-brands';
import {
    createFixedHref,
    createIncomeHref,
    createTxHref,
    assetDetailHref,
    fixedCostsForAssetHref,
    fixedDetailHref,
    transactionsForAssetHref,
    txDetailHref,
    updateHref,
} from '@/app/_lib/create-routes';
import { cadenceLabel } from '@/app/_lib/jar-chrome';
import { catalogMarkChrome } from '@/app/_lib/party-mark-chrome';
import { isLiveData } from '@/app/_lib/preview';
import { productPath } from '@/app/_lib/routes';
import { useHoldings } from '@/app/_lib/use-holdings';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';
import { useJarCatalog } from '@/app/_lib/use-jar-catalog';
import { findCatalogMerchantFromFeed, findPartyVendor, partyMark } from '@/app/_lib/vendor-brands';
import { useCategoryTemplates } from '@/components/features/forms/catalog-helpers';
import {
    JarBadge,
    MetaChip,
    formatBookedDate,
    formatDueDay,
} from '@/components/features/money/jar-badge';
import { MoneyPartyRow } from '@/components/features/money/money-party-row';
import { CoachTipCard } from '@/components/features/helpers';
import { useAuth } from '@/components/features/shell/auth-provider';
import { useHouseholdShell } from '@/components/features/shell/household-shell-context';

const EMPTY_KINDS: AssetKind[] = [];
const EMPTY_MERCHANTS: MerchantPreset[] = [];
const EMPTY_INCOME: IncomeSource[] = [];
const EMPTY_BILLS: FixedCost[] = [];
const EMPTY_JARS: Jar[] = [];
const EMPTY_TX_PAGE: { items: Transaction[]; nextCursor: string | null } = {
    items: [],
    nextCursor: null,
};
const RECENT_LIMIT = 8;

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

function Stat({
    label,
    value,
    hint,
    tone = 'neutral',
}: {
    label: string;
    value: string;
    hint?: string | null;
    tone?: 'neutral' | 'accent' | 'success' | 'danger';
}) {
    const bar = {
        neutral: 'bg-fg-muted',
        accent: 'bg-accent',
        success: 'bg-success',
        danger: 'bg-danger',
    }[tone];
    const text = {
        neutral: 'text-fg-muted',
        accent: 'text-accent',
        success: 'text-success',
        danger: 'text-danger',
    }[tone];
    return (
        <div className="flex overflow-hidden rounded-xl border border-line bg-sunken">
            <span aria-hidden className={cn('w-1 shrink-0', bar)} />
            <div className="grid min-w-0 gap-1.5 px-3.5 py-3">
                <p className="font-mono text-[10px] tracking-wider text-fg-muted uppercase">
                    {label}
                </p>
                <p
                    className={cn(
                        'font-display text-xl leading-none font-semibold tracking-tight sm:text-2xl',
                        tone === 'neutral' ? 'text-fg' : text
                    )}>
                    {value}
                </p>
                {hint ? <p className="text-[11px] leading-snug text-fg-faint">{hint}</p> : null}
            </div>
        </div>
    );
}

function LinkedSection({
    heading,
    count,
    addHref,
    addLabel,
    openHref,
    openLabel,
    empty,
    children,
}: {
    heading: string;
    count: number;
    addHref: string;
    addLabel: string;
    openHref: string;
    openLabel: string;
    empty: string;
    children: ReactNode;
}) {
    return (
        <section className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <Typography as="h2" variant="eyebrow" color="primary">
                    ✦ {heading}
                </Typography>
                <div className="flex items-center gap-2">
                    {count > 0 ? (
                        <Link
                            href={openHref}
                            className="inline-flex h-9 items-center rounded-full px-3 font-mono text-xs tracking-wide text-fg-muted uppercase hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
                            {openLabel}
                        </Link>
                    ) : null}
                    <Button as={Link} href={addHref} size="sm">
                        {addLabel}
                    </Button>
                </div>
            </div>
            <Card className="p-0">
                {count > 0 ? (
                    <div className="grid">{children}</div>
                ) : (
                    <p className="px-5 py-4 text-sm text-fg-muted">{empty}</p>
                )}
            </Card>
        </section>
    );
}

/**
 * One holding. Edit opens the update sheet; this page is for reading it.
 * With net-worth linking it also rolls up what the holding brings in and costs
 * (attribution only — bills and income keep their jar).
 */
export function AssetDetailPageClient({ assetId }: { assetId: string }) {
    const t = useTranslations('features.growth.net_worth');
    const tChips = useTranslations('features.money.chips');
    const tAction = useTranslations('common.action');
    const appLocale = useLocale();
    const searchParams = useSearchParams();
    const setupParam = searchParams.get('setup');
    const { householdId } = useAuth();
    const { period } = useHouseholdShell();
    const { formatMoney } = useHouseholdCurrency();
    const { canLink } = useHoldings();
    const live = isLiveData(householdId);
    const liveLinked = live && canLink;
    const periodKey = toPeriodKey(period.year, period.month);
    const asOf = endOfPeriodIso(periodKey);

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
    const merchantsQuery = useLiveQuery(
        apiQuery.money.catalogs.merchantPresets.list.queryOptions({
            input: { householdId: householdId! },
        }),
        EMPTY_MERCHANTS,
        live
    );
    const incomeQuery = useLiveQuery(
        apiQuery.money.income.list.queryOptions({
            input: { householdId: householdId!, assetId },
        }),
        EMPTY_INCOME,
        liveLinked
    );
    const billsQuery = useLiveQuery(
        apiQuery.money.fixedCosts.list.queryOptions({
            input: { householdId: householdId!, assetId },
        }),
        EMPTY_BILLS,
        liveLinked
    );
    const recentQuery = useLiveQuery(
        apiQuery.money.transactions.list.queryOptions({
            input: { householdId: householdId!, assetId, limit: RECENT_LIMIT },
        }),
        EMPTY_TX_PAGE,
        liveLinked
    );
    const jarsQuery = useLiveQuery(
        apiQuery.money.jars.list.queryOptions({ input: { householdId: householdId! } }),
        EMPTY_JARS,
        liveLinked
    );
    const categoryTemplatesQuery = useCategoryTemplates(liveLinked);
    const { byKey: jarByKey } = useJarCatalog();

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
                    className="rounded-sm font-mono text-xs tracking-wide text-accent uppercase hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
                    {t('detail.back')}
                </Link>
                <p className="text-sm text-fg-muted">{t('detail.not_found')}</p>
            </div>
        );
    }

    const kind = (kindsQuery.data ?? EMPTY_KINDS).find(row => row.key === asset.kindKey);
    const merchants = merchantsQuery.data ?? EMPTY_MERCHANTS;
    const categoryTemplates = categoryTemplatesQuery.data ?? [];
    const jars = jarsQuery.data ?? EMPTY_JARS;
    const jarById = new Map(jars.map(jar => [jar.id, jar]));
    const brandMark = asset.kindKey === 'VEHICLE' ? carMarkForName(asset.name, merchants) : null;
    const locked = kind ? !kind.canPay : false;

    const linkedIncome = incomeQuery.data ?? EMPTY_INCOME;
    const linkedBills = (billsQuery.data ?? EMPTY_BILLS).filter(
        bill => bill.direction === FlowDirection.OUT
    );
    const recent = recentQuery.data?.items ?? [];
    const flow = assetFlowSummary(asset, linkedIncome, linkedBills, asOf);
    const pays = !locked && flow.monthlyIn > 0;

    // Smooth register after create: `?setup=in` → `?setup=out` → Done clears URL.
    // In auto-advances once a source (or skip) is there; Out stays until Done so
    // they can add another bill without leaving the card.
    const setupStep: 'in' | 'out' | null =
        !canLink || (setupParam !== 'in' && setupParam !== 'out')
            ? null
            : setupParam === 'in' && linkedIncome.length === 0
              ? 'in'
              : 'out';

    const inHint = locked
        ? t('not_available_yet')
        : flow.inFromSources
          ? t('detail.in_from_sources', { count: linkedIncome.length })
          : flow.monthlyIn > 0
            ? t('detail.in_from_flow')
            : t('detail.in_none');
    const outHint =
        linkedBills.length > 0
            ? t('detail.out_from_bills', { count: linkedBills.length })
            : t('detail.out_none');

    return (
        <div className="grid animate-rise gap-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="grid gap-3">
                    <Link
                        href={boardHref}
                        className="w-fit rounded-sm font-mono text-xs font-medium tracking-wide text-fg-faint uppercase hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
                        {t('detail.back')}
                    </Link>
                    <div className="flex items-start gap-3">
                        <span
                            className="grid size-10 shrink-0 place-items-center rounded-xl border border-line bg-sunken text-xl"
                            aria-hidden>
                            {brandMark ? (
                                <VendorMark
                                    name={brandMark.name}
                                    src={brandMark.src}
                                    fallbackIcon={brandMark.fallbackIcon ?? kind?.icon ?? '✦'}
                                    tone={brandMark.tone}
                                    size={28}
                                />
                            ) : (
                                (kind?.icon ?? '✦')
                            )}
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
                    <Icon name="pencil" size="sm" />
                    {tAction('edit')}
                </Button>
            </div>

            {setupStep ? (
                <Card className="grid gap-4 border-accent/40 bg-accent-soft p-5">
                    <div className="flex items-center justify-between gap-3">
                        <Typography as="span" variant="eyebrow" color="primary">
                            ✦ {t('setup.eyebrow')}
                        </Typography>
                        <span className="font-mono text-[10px] tracking-wider text-fg-muted uppercase">
                            {t('setup.step_of', { step: setupStep === 'in' ? 1 : 2 })}
                        </span>
                    </div>
                    <div className="grid gap-1.5">
                        <h2 className="text-lg font-semibold tracking-tight text-fg">
                            {setupStep === 'in'
                                ? t('setup.step_in_title', { name: asset.name })
                                : t('setup.step_out_title', { name: asset.name })}
                        </h2>
                        <Typography as="p" size="sm" color="muted" className="text-pretty">
                            {setupStep === 'in'
                                ? t('setup.step_in_body')
                                : t('setup.step_out_body')}
                        </Typography>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {setupStep === 'in' ? (
                            <Button as={Link} href={createIncomeHref({ assetId: asset.id })}>
                                {t('setup.add_income')}
                            </Button>
                        ) : (
                            <Button as={Link} href={createFixedHref({ assetId: asset.id })}>
                                {t('setup.add_bill')}
                            </Button>
                        )}
                        <Button
                            as={Link}
                            variant="ghost"
                            href={
                                setupStep === 'in'
                                    ? assetDetailHref(asset.id, { setup: 'out' })
                                    : assetDetailHref(asset.id)
                            }
                            replace>
                            {setupStep === 'in' ? t('setup.skip') : t('setup.done')}
                        </Button>
                    </div>
                </Card>
            ) : null}

            <Card className="grid gap-4 p-5">
                {canLink ? (
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <Stat label={t('value')} value={formatMoney(asset.value)} tone="accent" />
                        <Stat
                            label={t('detail.in_eyebrow')}
                            value={
                                locked ? t('not_available_yet') : `+ ${formatMoney(flow.monthlyIn)}`
                            }
                            hint={inHint}
                            tone={pays ? 'success' : 'neutral'}
                        />
                        <Stat
                            label={t('detail.out_eyebrow')}
                            value={`− ${formatMoney(flow.monthlyOut)}`}
                            hint={outHint}
                            tone={flow.monthlyOut > 0 ? 'danger' : 'neutral'}
                        />
                        <Stat
                            label={t('detail.net_eyebrow')}
                            value={formatMoney(flow.monthlyNet)}
                            tone={
                                flow.monthlyNet > 0
                                    ? 'success'
                                    : flow.monthlyNet < 0
                                      ? 'danger'
                                      : 'neutral'
                            }
                        />
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3">
                        <Stat label={t('value')} value={formatMoney(asset.value)} tone="accent" />
                        <Stat
                            label={t('monthly_income')}
                            value={
                                locked
                                    ? t('not_available_yet')
                                    : pays
                                      ? `+ ${formatMoney(asset.flow)}`
                                      : formatMoney(0)
                            }
                            tone={pays ? 'accent' : 'neutral'}
                        />
                    </div>
                )}
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

            {canLink ? (
                <>
                    <LinkedSection
                        heading={t('detail.linked_income_heading')}
                        count={linkedIncome.length}
                        addHref={createIncomeHref({ assetId: asset.id })}
                        addLabel={t('detail.add_income')}
                        openHref={fixedCostsForAssetHref(asset.id, 'in')}
                        openLabel={t('detail.open_in_money')}
                        empty={t('detail.linked_empty_income')}>
                        {linkedIncome.map(source => {
                            const due = formatDueDay(source.expectedDay, tChips);
                            const monthly = monthlyAmount(source.amount, source.cadence);
                            return (
                                <MoneyPartyRow
                                    key={source.id}
                                    title={source.name}
                                    subtitle={
                                        source.counterparty?.trim() &&
                                        source.counterparty.trim() !== source.name.trim()
                                            ? source.counterparty
                                            : null
                                    }
                                    mark={partyMark(
                                        { name: source.counterparty?.trim() || source.name },
                                        catalogMarkChrome({
                                            billName: source.name,
                                            categoryTemplates,
                                        })
                                    )}
                                    amount={`+ ${formatMoney(monthly)}`}
                                    amountClassName="text-success"
                                    badges={
                                        <>
                                            {due ? <MetaChip>{due}</MetaChip> : null}
                                            <MetaChip>
                                                {cadenceLabel(source.cadence, tChips)}
                                            </MetaChip>
                                            {source.cadence !== Cadence.MONTHLY ? (
                                                <MetaChip>
                                                    {tChips('amount_per_month', {
                                                        amount: formatMoney(monthly),
                                                    })}
                                                </MetaChip>
                                            ) : null}
                                        </>
                                    }
                                    href={updateHref('income', source.id)}
                                />
                            );
                        })}
                    </LinkedSection>

                    <LinkedSection
                        heading={t('detail.linked_bills_heading')}
                        count={linkedBills.length}
                        addHref={createFixedHref({ assetId: asset.id })}
                        addLabel={t('detail.add_bill')}
                        openHref={fixedCostsForAssetHref(asset.id, 'out')}
                        openLabel={t('detail.open_in_money')}
                        empty={t('detail.linked_empty_bills')}>
                        {linkedBills.map(bill => {
                            const company = bill.counterparty?.trim() || bill.name;
                            const subtitle =
                                bill.counterparty?.trim() &&
                                bill.counterparty.trim() !== bill.name.trim()
                                    ? bill.name
                                    : null;
                            const jar = jarById.get(bill.jarId);
                            const monthly = monthlyAmount(Math.abs(bill.amount), bill.cadence);
                            const due = formatDueDay(bill.dueDay, tChips);
                            return (
                                <MoneyPartyRow
                                    key={bill.id}
                                    title={company}
                                    subtitle={subtitle}
                                    mark={partyMark(
                                        findPartyVendor(company, merchants, []),
                                        catalogMarkChrome({
                                            billName: bill.name,
                                            jarKey: jar?.key,
                                            jarByKey,
                                            categoryTemplates,
                                        })
                                    )}
                                    amount={formatMoney(-monthly)}
                                    amountClassName={bill.isActive ? 'text-fg' : 'text-fg-muted'}
                                    badges={
                                        <>
                                            {due ? <MetaChip>{due}</MetaChip> : null}
                                            <MetaChip>
                                                {cadenceLabel(bill.cadence, tChips)}
                                            </MetaChip>
                                            {jar ? (
                                                <JarBadge
                                                    jarKey={jar.key}
                                                    name={jar.name}
                                                    icon={jar.icon}
                                                />
                                            ) : null}
                                        </>
                                    }
                                    href={fixedDetailHref(bill.id)}
                                />
                            );
                        })}
                    </LinkedSection>

                    <LinkedSection
                        heading={t('detail.linked_recent_heading')}
                        count={recent.length}
                        addHref={createTxHref({ direction: 'out', assetId: asset.id })}
                        addLabel={t('detail.add_expense')}
                        openHref={transactionsForAssetHref(asset.id)}
                        openLabel={t('detail.open_in_money')}
                        empty={t('detail.linked_empty_recent')}>
                        {recent.map(transaction => {
                            const title =
                                transaction.counterparty?.trim() || transaction.description;
                            const feedText = `${transaction.counterparty ?? ''} ${transaction.description}`;
                            const merchant = findCatalogMerchantFromFeed(feedText, merchants);
                            const jar = transaction.jarId
                                ? jarById.get(transaction.jarId)
                                : undefined;
                            return (
                                <MoneyPartyRow
                                    key={transaction.id}
                                    title={title}
                                    subtitle={
                                        transaction.note?.trim() ||
                                        (transaction.counterparty?.trim() &&
                                        transaction.description !== transaction.counterparty.trim()
                                            ? transaction.description
                                            : null)
                                    }
                                    mark={partyMark(
                                        merchant ?? { name: title },
                                        catalogMarkChrome({
                                            billName: title,
                                            searchText: feedText,
                                            categoryTemplateKey: merchant?.categoryTemplateKey,
                                            jarKey: jar?.key,
                                            jarByKey,
                                            categoryTemplates,
                                        })
                                    )}
                                    amount={formatMoney(transaction.amount)}
                                    amountClassName={
                                        transaction.amount < 0 ? 'text-fg' : 'text-success'
                                    }
                                    badges={
                                        <>
                                            <MetaChip>
                                                {formatBookedDate(transaction.bookedOn, appLocale)}
                                            </MetaChip>
                                            {jar ? (
                                                <JarBadge
                                                    jarKey={jar.key}
                                                    name={jar.name}
                                                    icon={jar.icon}
                                                />
                                            ) : null}
                                        </>
                                    }
                                    href={txDetailHref(transaction.id)}
                                />
                            );
                        })}
                    </LinkedSection>

                    <Typography as="p" size="sm" color="muted" className="text-pretty">
                        {t('detail.money_note')}
                    </Typography>

                    {asset.kindKey === 'BUSINESS' && flow.monthlyOut > 0 ? (
                        <CoachTipCard title={t('detail.coach_business_title')} tone="warning">
                            {t('detail.coach_business_body', {
                                amount: formatMoney(flow.monthlyOut),
                            })}
                        </CoachTipCard>
                    ) : null}
                </>
            ) : null}
        </div>
    );
}
