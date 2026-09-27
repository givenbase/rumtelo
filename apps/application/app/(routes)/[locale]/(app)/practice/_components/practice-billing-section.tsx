'use client';

import { PracticeSubscriptionStatus } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { useTranslations } from '@rumtelo/i18n';
import { Badge, StubNotice } from '@rumtelo/ui';

import { apiQuery } from '@/app/_lib/api-hooks';

import { practicePriceParams } from '../_utils/practice-pricing';
import { usePractice } from './practice-context';
import { PracticeInkCard, PracticeRow, PracticeRowLabel } from './practice-chrome';

function formatDate(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

function formatMoney(cents: number): string {
    return `€${(cents / 100).toFixed(2)}`;
}

function statusTone(
    status: PracticeSubscriptionStatus
): 'success' | 'warning' | 'danger' | 'neutral' {
    if (status === PracticeSubscriptionStatus.ACTIVE) return 'success';
    if (status === PracticeSubscriptionStatus.TRIALING) return 'success';
    if (status === PracticeSubscriptionStatus.PAST_DUE) return 'warning';
    if (status === PracticeSubscriptionStatus.UNPAID) return 'danger';
    if (status === PracticeSubscriptionStatus.CANCELED) return 'danger';
    return 'neutral';
}

/** Billing / invoice block — lives under Practice Settings (merged nav). */
export function PracticeBillingSection() {
    const t = useTranslations();
    const { activePractice } = usePractice();

    const billingQuery = useLiveQuery(
        apiQuery.practice.billingStatus.queryOptions({
            input: { practiceId: activePractice?.id ?? '' },
        }),
        null,
        Boolean(activePractice)
    );

    const billing = billingQuery.data;
    const totalCents = billing
        ? billing.baseAmountCents +
          billing.billableSeatCount * billing.staffUnitAmountCents +
          billing.billableClientCount * billing.clientUnitAmountCents
        : 0;

    const statusLabel = (status: PracticeSubscriptionStatus) => {
        switch (status) {
            case PracticeSubscriptionStatus.ACTIVE:
                return t('pages.practice.billing.status_active');
            case PracticeSubscriptionStatus.TRIALING:
                return t('pages.practice.billing.status_trialing');
            case PracticeSubscriptionStatus.PAST_DUE:
                return t('pages.practice.billing.status_past_due');
            case PracticeSubscriptionStatus.UNPAID:
                return t('pages.practice.billing.status_unpaid');
            case PracticeSubscriptionStatus.CANCELED:
                return t('pages.practice.billing.status_canceled');
            case PracticeSubscriptionStatus.INCOMPLETE:
                return t('pages.practice.billing.status_incomplete');
            default:
                return t('pages.practice.billing.status_none');
        }
    };

    return (
        <div id="billing" className="grid scroll-mt-24 gap-3">
            <p className="text-sm leading-snug text-fg-muted">
                {t('pages.practice.billing.blurb', practicePriceParams)}
            </p>

            {!billing ? (
                <PracticeInkCard eyebrow={t('pages.practice.billing.subscription_eyebrow')}>
                    <div className="py-6">
                        <StubNotice
                            prefix={t('pages.practice.billing.status_none')}
                            what={t('pages.practice.billing.no_subscription')}
                        />
                    </div>
                </PracticeInkCard>
            ) : (
                <>
                    <PracticeInkCard eyebrow={t('pages.practice.billing.subscription_eyebrow')}>
                        <PracticeRow>
                            <PracticeRowLabel
                                title={t('pages.practice.billing.status_label')}
                                sub={
                                    billing.status === PracticeSubscriptionStatus.PAST_DUE ||
                                    billing.status === PracticeSubscriptionStatus.UNPAID
                                        ? t('pages.practice.billing.overdue_hint')
                                        : undefined
                                }
                            />
                            <Badge tone={statusTone(billing.status)}>
                                {statusLabel(billing.status)}
                            </Badge>
                        </PracticeRow>
                        <PracticeRow>
                            <PracticeRowLabel
                                title={t('pages.practice.billing.practice_started_label')}
                            />
                            <span className="font-mono text-sm text-fg tabular-nums">
                                {formatDate(billing.practiceStartedAt)}
                            </span>
                        </PracticeRow>
                        <PracticeRow>
                            <PracticeRowLabel
                                title={t('pages.practice.billing.period_start_label')}
                            />
                            <span className="font-mono text-sm text-fg tabular-nums">
                                {formatDate(billing.periodStartedAt)}
                            </span>
                        </PracticeRow>
                        <PracticeRow last>
                            <PracticeRowLabel
                                title={t('pages.practice.billing.next_renewal_label')}
                                sub={t('pages.practice.billing.next_renewal_hint')}
                            />
                            <span className="font-mono text-sm font-medium text-fg tabular-nums">
                                {formatDate(billing.periodEndsAt)}
                            </span>
                        </PracticeRow>
                        {!billing.hasActiveSubscription ? (
                            <p className="border-t border-line py-3 text-sm text-fg-muted">
                                {t('pages.practice.billing.no_subscription')}
                            </p>
                        ) : null}
                    </PracticeInkCard>

                    <PracticeInkCard eyebrow={t('pages.practice.billing.usage_eyebrow')}>
                        <PracticeRow>
                            <PracticeRowLabel
                                title={t('pages.practice.billing.base_label')}
                                sub={t('pages.practice.billing.base_hint')}
                            />
                            <span className="font-mono text-sm font-medium text-fg tabular-nums">
                                {formatMoney(billing.baseAmountCents)}
                            </span>
                        </PracticeRow>
                        <PracticeRow>
                            <PracticeRowLabel
                                title={t('pages.practice.billing.staff_label')}
                                sub={`${billing.billableSeatCount} × ${formatMoney(billing.staffUnitAmountCents)}`}
                            />
                            <span className="font-mono text-sm font-medium text-fg tabular-nums">
                                {formatMoney(
                                    billing.billableSeatCount * billing.staffUnitAmountCents
                                )}
                            </span>
                        </PracticeRow>
                        <PracticeRow>
                            <PracticeRowLabel
                                title={t('pages.practice.billing.clients_label')}
                                sub={`${billing.billableClientCount} × ${formatMoney(billing.clientUnitAmountCents)}`}
                            />
                            <span className="font-mono text-sm font-medium text-fg tabular-nums">
                                {formatMoney(
                                    billing.billableClientCount * billing.clientUnitAmountCents
                                )}
                            </span>
                        </PracticeRow>
                        <PracticeRow last>
                            <PracticeRowLabel title={t('pages.practice.billing.total_label')} />
                            <span className="font-mono text-base font-bold text-fg tabular-nums">
                                {formatMoney(totalCents)}
                            </span>
                        </PracticeRow>
                    </PracticeInkCard>
                </>
            )}
        </div>
    );
}
