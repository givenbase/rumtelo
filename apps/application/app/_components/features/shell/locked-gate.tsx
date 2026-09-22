'use client';

import { useTranslations } from '@rumtelo/i18n';
import { Button, Typography } from '@rumtelo/ui';

import { lockCopyFor, planLabel, type PlanKey } from '@/app/_lib/plan';

/**
 * Full-screen upgrade wall — the only content rendered when a capability is locked.
 */
export function LockedGate({
    requiredPlan,
    capabilityKey,
}: {
    requiredPlan: PlanKey;
    capabilityKey?: string | null;
}) {
    const t = useTranslations();
    const copy = lockCopyFor(capabilityKey, requiredPlan, t);
    const label = planLabel(requiredPlan, t);

    return (
        <div
            role="region"
            data-testid="locked-plan-gate"
            aria-label={t('pages.shell.gates.locked_plan_aria')}
            className="flex min-h-[min(32rem,70dvh)] animate-rise flex-col items-center justify-center gap-5 px-6 py-16 text-center">
            <span className="text-4xl" aria-hidden>
                🔒
            </span>
            <div className="max-w-sm">
                <Typography as="h2" className="text-xl sm:text-2xl">
                    {t('pages.shell.gates.locked_plan_title', { plan: label })}
                </Typography>
                <Typography as="p" size="sm" color="muted" className="mt-2">
                    {copy.line}
                </Typography>
            </div>
            <Button as="a" href="/settings/general/plan">
                {t('pages.shell.gates.upgrade_cta', { plan: label })}
            </Button>
        </div>
    );
}
