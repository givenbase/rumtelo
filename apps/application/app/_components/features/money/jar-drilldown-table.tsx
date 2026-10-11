'use client';

import Link from 'next/link';
import { useState } from 'react';

import { useTranslations } from '@rumtelo/i18n';

import type {
    CategoryTemplate,
    FixedCost,
    FixedCostSettlement,
    GivingOrganization,
    MerchantPreset,
    Transaction,
} from '@rumtelo/contracts';
import { FlowDirection, FixedCostPeriodStatus, jarCapabilitiesFor } from '@rumtelo/contracts';
import { describePeriodTravel, endOfPeriodIso, isFixedCostCounting } from '@rumtelo/utils';
import { Typography } from '@rumtelo/ui';

import { fixedCostStatus, settlementsByFixedCostId } from '@/app/_lib/fixed-cost-match';
import { jarKeyToSlug } from '@/app/_lib/jar-slug';
import { listFixedCostsForPeriodView } from '@/app/_lib/period-plan-list';
import { JarCategoryBreakdown } from '@/components/features/money/jar-category-breakdown';
import {
    JarDrilldownTrigger,
    type JarDrilldownItem,
} from '@/components/features/money/jar-drilldown-parts';

function jarHref(jar: JarDrilldownItem): string | undefined {
    if (jar.href) return jar.href;
    if (jar.key) return `/product/money/jars/${jarKeyToSlug(jar.key)}`;
    return undefined;
}

export type JarDrilldownExtras = {
    period: { year: number; month: number };
    fixedCosts: readonly FixedCost[];
    transactions: readonly Transaction[];
    settlements?: readonly FixedCostSettlement[];
    categoryTemplates: readonly Pick<CategoryTemplate, 'name' | 'icon'>[];
    merchants: readonly MerchantPreset[];
    givingOrgs: readonly Pick<GivingOrganization, 'name' | 'website'>[];
    jarByKey?: Map<string, { icon: string | null }>;
};

/**
 * Expandable jar list — row toggles categories; “Open jar” navigates to detail.
 */
export function JarDrilldownTable({
    jars,
    extras,
}: {
    jars: JarDrilldownItem[];
    extras?: JarDrilldownExtras;
}) {
    const t = useTranslations('features.money.jars.drilldown');
    const [openId, setOpenId] = useState<string | null>(null);
    const settlementById = extras?.settlements
        ? settlementsByFixedCostId(extras.settlements)
        : new Map();
    const periodKey = extras
        ? `${extras.period.year}-${String(extras.period.month).padStart(2, '0')}`
        : null;
    const travel = extras ? describePeriodTravel(extras.period) : null;
    const asOf = periodKey ? endOfPeriodIso(periodKey) : null;

    return (
        <div className="grid">
            {jars.map(jar => {
                const id = jar.id ?? jar.name;
                const open = openId === id;
                const href = jarHref(jar);
                const jarFixedAll = extras
                    ? extras.fixedCosts.filter(
                          cost => cost.jarId === jar.id && cost.direction === FlowDirection.OUT
                      )
                    : [];
                const jarFixed = jarFixedAll.filter(cost => isFixedCostCounting(cost));
                const applyingFixed =
                    extras && asOf && travel
                        ? listFixedCostsForPeriodView(jarFixed, asOf, travel.direction).applying
                        : jarFixed;
                let openCount = 0;
                if (extras) {
                    for (const cost of applyingFixed) {
                        const status = fixedCostStatus(
                            cost,
                            settlementById.get(cost.id),
                            extras.period
                        );
                        if (
                            status === FixedCostPeriodStatus.DUE ||
                            status === FixedCostPeriodStatus.ROLLED
                        ) {
                            openCount += 1;
                        }
                    }
                }
                const jarTxs = extras ? extras.transactions.filter(tx => tx.jarId === jar.id) : [];
                const allowFixed = jar.key
                    ? jarCapabilitiesFor(jar.key).allowsFixedCosts
                    : jarFixed.length > 0;

                return (
                    <div key={id} className="border-b border-line last:border-b-0">
                        <JarDrilldownTrigger
                            jar={jar}
                            open={open}
                            onToggle={() => setOpenId(open ? null : id)}
                            meta={extras ? { openCount } : undefined}
                        />
                        {open && (
                            <div className="animate-rise border-t border-line bg-raised/40">
                                {extras ? (
                                    <JarCategoryBreakdown
                                        categories={[...(jar.categories ?? [])].filter(
                                            category => !category.isArchived
                                        )}
                                        fixedCosts={jarFixed}
                                        transactions={jarTxs}
                                        settlements={extras.settlements}
                                        period={extras.period}
                                        jarKey={jar.key ?? ''}
                                        jarIcon={jar.icon}
                                        jarByKey={extras.jarByKey}
                                        categoryTemplates={extras.categoryTemplates}
                                        merchants={extras.merchants}
                                        givingOrgs={extras.givingOrgs}
                                        allowFixedCosts={allowFixed}
                                    />
                                ) : (
                                    <Typography
                                        as="p"
                                        size="sm"
                                        color="muted"
                                        className="px-5 py-3">
                                        {t('category_detail_hint')}
                                    </Typography>
                                )}
                                {href ? (
                                    <div className="border-t border-line px-5 py-2.5">
                                        <Link
                                            href={href}
                                            className="inline-flex font-mono text-xs font-semibold tracking-wide text-fg-muted uppercase hover:text-accent">
                                            {t('open_jar_link')}
                                        </Link>
                                    </div>
                                ) : null}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
