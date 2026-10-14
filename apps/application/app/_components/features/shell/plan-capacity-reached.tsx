'use client';

import Link from 'next/link';

import { HouseholdRole } from '@rumtelo/contracts';
import { useTranslations } from '@rumtelo/i18n';
import { Button, Typography } from '@rumtelo/ui';

import { planLabel, type PlanLimitKey } from '@/app/_lib/plan';
import { settingsHref } from '@/app/_lib/settings-tabs';
import { useBoardWriteAccess } from '@/app/_lib/use-board-write-access';
import { usePlanCapacity } from '@/components/features/shell/use-plan-capacity';

/**
 * Soft wall when create was opened at a filled plan ceiling (deep link / race).
 */
export function PlanCapacityReached({
    limitKey,
    occupied,
    title,
    body,
}: {
    limitKey: PlanLimitKey;
    occupied: number;
    title: string;
    body: string;
}) {
    const t = useTranslations();
    const { showFraction, occupied: used, max, upgradeTo } = usePlanCapacity(limitKey, occupied);
    const { membershipRole, membershipPending } = useBoardWriteAccess();
    const canUpgrade =
        Boolean(upgradeTo) &&
        !membershipPending &&
        membershipRole !== null &&
        membershipRole !== HouseholdRole.VIEWER;

    return (
        <div
            role="region"
            data-testid="plan-capacity-reached"
            className="flex min-h-[min(20rem,50dvh)] animate-rise flex-col items-center justify-center gap-4 px-6 py-10 text-center">
            {showFraction && max !== null ? (
                <span className="font-mono text-sm font-medium tracking-wide text-fg-faint tabular-nums">
                    {used} / {max}
                </span>
            ) : null}
            <div className="max-w-sm">
                <Typography as="h2" className="text-xl">
                    {title}
                </Typography>
                <Typography as="p" size="sm" color="muted" className="mt-2">
                    {body}
                </Typography>
            </div>
            {canUpgrade && upgradeTo ? (
                <Button as={Link} href={settingsHref('plan')}>
                    {t('pages.shell.gates.upgrade_cta', { plan: planLabel(upgradeTo, t) })}
                </Button>
            ) : null}
        </div>
    );
}
