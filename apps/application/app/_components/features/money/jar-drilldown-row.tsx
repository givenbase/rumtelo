'use client';

import Link from 'next/link';
import { useState } from 'react';

import { FlowDirection, jarCapabilitiesFor } from '@rumtelo/contracts';
import { isFixedCostCounting } from '@rumtelo/utils';

import { jarKeyToSlug } from '@/app/_lib/jar-slug';
import { JarCategoryBreakdown } from '@/components/features/money/jar-category-breakdown';
import {
    JarDrilldownTrigger,
    type JarDrilldownItem,
} from '@/components/features/money/jar-drilldown-parts';
import type { JarDrilldownExtras } from '@/components/features/money/jar-drilldown-table';

/** One collapsible jar row — same layout as {@link JarDrilldownTable}. */
export function JarDrilldownRow({
    jar,
    extras,
}: {
    jar: JarDrilldownItem;
    extras?: JarDrilldownExtras;
}) {
    const [open, setOpen] = useState(false);
    const href = jar.href ?? (jar.key ? `/product/money/jars/${jarKeyToSlug(jar.key)}` : undefined);
    const jarFixed = extras
        ? extras.fixedCosts.filter(
              row =>
                  row.jarId === jar.id &&
                  row.direction === FlowDirection.OUT &&
                  isFixedCostCounting(row)
          )
        : [];
    const jarTxs = extras ? extras.transactions.filter(tx => tx.jarId === jar.id) : [];
    const allowFixed = jar.key ? jarCapabilitiesFor(jar.key).allowsFixedCosts : jarFixed.length > 0;

    return (
        <div className="border-b border-line last:border-b-0">
            <JarDrilldownTrigger
                jar={jar}
                open={open}
                onToggle={() => setOpen(previous => !previous)}
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
                            period={extras.period}
                            jarKey={jar.key ?? ''}
                            jarIcon={jar.icon}
                            jarByKey={extras.jarByKey}
                            categoryTemplates={extras.categoryTemplates}
                            merchants={extras.merchants}
                            givingOrgs={extras.givingOrgs}
                            allowFixedCosts={allowFixed}
                        />
                    ) : null}
                    {href ? (
                        <div className="border-t border-line px-5 py-2.5">
                            <Link
                                href={href}
                                className="inline-flex font-mono text-xs font-semibold tracking-wide text-fg-muted uppercase hover:text-accent">
                                Open jar ▸
                            </Link>
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    );
}
