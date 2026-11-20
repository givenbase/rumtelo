'use client';

import { useTranslations } from '@rumtelo/i18n';
import { useLiveQuery } from '@rumtelo/hooks';
import { toPeriodKey } from '@rumtelo/utils';
import { useLocale } from 'next-intl';

import { apiQuery } from '@/app/_lib/api-hooks';
import { isLiveData } from '@/app/_lib/preview';
import { moneyPortalShell } from '@/app/_lib/portal-hubs';
import { PortalHub, type PortalHubProps } from '@/components/features/home/portal-hub';
import { useAuth } from '@/components/features/shell/auth-provider';
import { useHouseholdShell } from '@/components/features/shell/household-shell-context';
import { usePlanCapabilities } from '@/components/features/shell/use-plan-capabilities';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';
import { CAPABILITIES } from '@/app/_lib/plan';
import { useBankSyncOnVisit } from '@/app/_lib/use-bank-sync-on-visit';

function formatDebtFree(on: string | null, locale: string): string {
    if (!on) return '—';
    const [year, month] = on.split('-').map(Number);
    if (!year || !month) return '—';
    return new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' }).format(
        new Date(Date.UTC(year, month - 1, 1))
    );
}

export function MoneyPortalHubClient() {
    const t = useTranslations();
    const tc = useTranslations('features.money.hub.cards');
    const locale = useLocale();
    const shell = moneyPortalShell(t);
    const { householdId } = useAuth();
    const { period } = useHouseholdShell();
    const { formatMoney } = useHouseholdCurrency();
    const { hasCapability } = usePlanCapabilities();
    const canNetWorth = hasCapability(CAPABILITIES.growthNetWorth);
    const periodKey = toPeriodKey(period.year, period.month);
    const live = isLiveData(householdId);

    useBankSyncOnVisit();

    const query = useLiveQuery(
        apiQuery.money.dashboard.get.queryOptions({
            input: { householdId: householdId!, period: periodKey },
        }),
        null,
        live
    );

    const netWorthQuery = useLiveQuery(
        apiQuery.growth.dashboard.get.queryOptions({
            input: { householdId: householdId! },
        }),
        null,
        live && canNetWorth
    );

    const data = query.data;
    const onTrack = data?.jarsOnTrack ?? 0;
    const total = data?.jarsTotal ?? 0;
    const spent = data?.spentTotal ?? 0;
    const fixed = data?.fixedCostsMonthly ?? 0;
    const ringPct = total === 0 ? 0 : Math.round((onTrack / total) * 100);
    const fixedRing =
        (data?.incomeTotal ?? 0) > 0
            ? Math.min(100, Math.round((fixed / (data?.incomeTotal ?? 1)) * 100))
            : 0;

    const stacked = data?.travel?.mode === 'stacked';
    const debtsAt = data?.debtsAtPeriod;

    const debtValue =
        stacked && debtsAt
            ? debtsAt.clearedByPeriod
                ? tc('debt.free')
                : `${formatMoney(debtsAt.totalOriginal)} → ${formatMoney(debtsAt.totalRemaining)}`
            : formatDebtFree(data?.debtFreeOn ?? null, locale);

    const debtNote =
        stacked && debtsAt
            ? debtsAt.clearedByPeriod
                ? tc('debt.cleared_by_month')
                : tc('debt.months_still_to_free', {
                      months: String(debtsAt.monthsRemaining ?? '—'),
                  })
            : data?.debtMonthsRemaining !== null && data?.debtMonthsRemaining !== undefined
              ? tc('debt.months_to_free', { months: String(data.debtMonthsRemaining) })
              : tc('debt.month_you_are_free');

    const jarsCard = {
        name: tc('jars.name'),
        value: `${onTrack} / ${total}`,
        color: 'var(--color-jar-nec)',
        chart: { kind: 'ring' as const, pct: ringPct },
        href: '/product/money#jars-list',
    };

    const netWorthCard = {
        name: tc('net_worth.name'),
        value:
            netWorthQuery.data?.netWorth === null || netWorthQuery.data?.netWorth === undefined
                ? '—'
                : formatMoney(netWorthQuery.data.netWorth),
        color: 'var(--color-jar-ff)',
        href: '/product/money/net-worth',
    };

    const props: PortalHubProps = {
        ...shell,
        compact: true,
        cards: [
            canNetWorth ? netWorthCard : jarsCard,
            {
                name: tc('transactions.name'),
                value: formatMoney(spent),
                color: 'var(--color-jar-play)',
                href: '/product/money/transactions',
            },
            {
                name: tc('debt.name'),
                value: debtValue,
                note: debtNote,
                color: 'var(--color-danger)',
                href: '/product/money/debt',
            },
            {
                name: tc('fixed_costs.name'),
                value: formatMoney(fixed),
                color: 'var(--color-jar-nec)',
                chart: { kind: 'ring', pct: fixedRing, tone: 'brand' },
                href: '/product/money/fixed-costs',
            },
        ],
    };

    return <PortalHub {...props} />;
}
