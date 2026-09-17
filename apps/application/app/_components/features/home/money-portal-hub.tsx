'use client';

import { CoachKind } from '@rumtelo/contracts';
import { toPeriodKey } from '@rumtelo/utils';
import { useLiveQuery } from '@rumtelo/hooks';

import { apiQuery } from '@/app/_lib/api-hooks';
import { pickPortalCoach } from '@/app/_lib/portal-coach';
import { isLiveData } from '@/app/_lib/preview';
import { moneyPortalShell } from '@/app/_lib/portal-hubs';
import { PortalHub, type PortalHubProps } from '@/components/features/home/portal-hub';
import { useAuth } from '@/components/features/shell/auth-provider';
import { useAppShell } from '@/components/features/shell/app-shell-context';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';

function formatDebtFree(on: string | null): string {
    if (!on) return '—';
    const [year, month] = on.split('-').map(Number);
    if (!year || !month) return '—';
    return new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric' }).format(
        new Date(Date.UTC(year, month - 1, 1))
    );
}

export function MoneyPortalHubClient() {
    const { householdId } = useAuth();
    const { period } = useAppShell();
    const { formatMoney } = useHouseholdCurrency();
    const periodKey = toPeriodKey(period.year, period.month);
    const live = isLiveData(householdId);

    const query = useLiveQuery(
        apiQuery.money.dashboard.get.queryOptions({
            input: { householdId: householdId!, period: periodKey },
        }),
        null,
        live
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
    const goalsAt = data?.goalsAtPeriod ?? [];
    const fulfilled = goalsAt.filter(goal => goal.fulfilledByPeriod).length;

    const debtValue =
        stacked && debtsAt
            ? debtsAt.clearedByPeriod
                ? 'Free'
                : `${formatMoney(debtsAt.totalOriginal)} → ${formatMoney(debtsAt.totalRemaining)}`
            : formatDebtFree(data?.debtFreeOn ?? null);

    const debtNote =
        stacked && debtsAt
            ? debtsAt.clearedByPeriod
                ? 'cleared by this month'
                : `${debtsAt.monthsRemaining ?? '—'} months still to free`
            : data?.debtMonthsRemaining !== null && data?.debtMonthsRemaining !== undefined
              ? `${data.debtMonthsRemaining} months to free`
              : 'the month you are free';

    const jarsNote = stacked
        ? goalsAt.length
            ? `${fulfilled}/${goalsAt.length} goals on track · put through over ${data?.travel?.monthsHorizon ?? '—'} mo`
            : `put through over ${data?.travel?.monthsHorizon ?? '—'} months`
        : 'jars on track this month';

    const coachMessages = data?.travelCoachText
        ? [
              {
                  kind: CoachKind.WIN,
                  text: data.travelCoachText,
                  ctaLabel: 'See overview',
                  ctaHref: '/',
              },
              ...(data.coach ?? []).map(message => ({
                  kind: message.kind,
                  text: message.text,
                  ctaLabel: message.ctaLabel,
                  ctaHref: message.ctaHref,
              })),
          ]
        : (data?.coach ?? []).map(message => ({
              kind: message.kind,
              text: message.text,
              ctaLabel: message.ctaLabel,
              ctaHref: message.ctaHref,
          }));

    const props: PortalHubProps = {
        ...moneyPortalShell,
        coach: pickPortalCoach(coachMessages, moneyPortalShell.fallbackCoach),
        cards: [
            {
                name: 'Jars',
                value: `${onTrack} / ${total}`,
                note: jarsNote,
                color: 'var(--color-jar-nec)',
                chart: { kind: 'ring', pct: ringPct },
                href: '/product/money/jars',
            },
            {
                name: 'Transactions',
                value: formatMoney(spent),
                note: stacked ? 'booked across span' : 'booked this month',
                color: 'var(--color-jar-play)',
                chart: { kind: 'bars', bars: [0, 0, 0, 0, 0, 0, 0] },
                href: '/product/money/transactions',
            },
            {
                name: 'Debt',
                value: debtValue,
                note: debtNote,
                color: 'var(--color-danger)',
                chart: { kind: 'bars', bars: [0, 0, 0, 0, 0, 0, 0] },
                href: '/product/money/debt',
            },
            {
                name: 'Fixed costs',
                value: formatMoney(fixed),
                note: 'fixed costs per month',
                color: 'var(--color-jar-nec)',
                chart: { kind: 'ring', pct: fixedRing, tone: 'brand' },
                href: '/product/money/fixed-costs',
            },
        ],
    };

    return <PortalHub {...props} />;
}
