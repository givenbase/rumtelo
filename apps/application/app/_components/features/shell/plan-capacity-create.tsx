'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

import { useTranslations } from '@rumtelo/i18n';
import { Button } from '@rumtelo/ui';

import { planLabel, type PlanLimitKey } from '@/app/_lib/plan';
import { settingsHref } from '@/app/_lib/settings-tabs';
import { usePlanCapacity } from '@/components/features/shell/use-plan-capacity';

type PlanCapacityCreateProps = {
    limitKey: PlanLimitKey;
    occupied: number;
    createLabel: string;
    /** Screen-reader label for the fraction, e.g. "1 of 5 active goals". */
    usageAria?: string;
} & ({ createHref: string; onCreate?: never } | { onCreate: () => void; createHref?: never });

/**
 * Create control that mirrors plan ceilings client-side: `used / max`, Add while
 * under the limit, Upgrade (or disabled Add) when full. Unlimited plans hide the
 * fraction and only show Add.
 */
export function PlanCapacityCreate({
    limitKey,
    occupied,
    createHref,
    onCreate,
    createLabel,
    usageAria,
}: PlanCapacityCreateProps) {
    const t = useTranslations();
    const {
        canAdd,
        showFraction,
        occupied: used,
        max,
        upgradeTo,
    } = usePlanCapacity(limitKey, occupied);

    const upgradeLabel = upgradeTo
        ? t('pages.shell.gates.upgrade_cta', { plan: planLabel(upgradeTo, t) })
        : null;

    const fraction =
        showFraction && max !== null ? (
            <span
                className="font-mono text-xs font-medium tracking-wide text-fg-faint tabular-nums"
                aria-label={usageAria ?? `${used} / ${max}`}>
                {used} / {max}
            </span>
        ) : null;

    let action: ReactNode;
    if (canAdd) {
        action = createHref ? (
            <Button as={Link} href={createHref} size="sm" data-testid="list-toolbar-create">
                {createLabel}
            </Button>
        ) : (
            <Button
                size="sm"
                data-testid="list-toolbar-create"
                onClick={() => {
                    onCreate?.();
                }}>
                {createLabel}
            </Button>
        );
    } else if (upgradeLabel) {
        action = (
            <Button
                as={Link}
                href={settingsHref('plan')}
                size="sm"
                data-testid="list-toolbar-upgrade">
                {upgradeLabel}
            </Button>
        );
    } else {
        action = (
            <Button size="sm" disabled data-testid="list-toolbar-create">
                {createLabel}
            </Button>
        );
    }

    return (
        <div className="flex flex-wrap items-center gap-2">
            {fraction}
            {action}
        </div>
    );
}
