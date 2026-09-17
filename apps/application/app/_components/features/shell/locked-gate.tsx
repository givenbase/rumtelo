'use client';

import { Button, Typography } from '@rumtelo/ui';

import { lockCopyFor, PLAN_LABELS, type PlanKey } from '@/app/_lib/plan';

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
    const copy = lockCopyFor(capabilityKey, requiredPlan);
    const planLabel = PLAN_LABELS[requiredPlan];

    return (
        <div
            role="region"
            aria-label="Plan upgrade required"
            className="flex min-h-[min(32rem,70dvh)] animate-rise flex-col items-center justify-center gap-5 px-6 py-16 text-center">
            <span className="text-4xl" aria-hidden>
                🔒
            </span>
            <div className="max-w-sm">
                <Typography as="h2" className="text-xl sm:text-2xl">
                    Available in the {planLabel} plan
                </Typography>
                <Typography as="p" size="sm" color="muted" className="mt-2">
                    {copy.line}
                </Typography>
            </div>
            <Button as="a" href="/settings/general/plan">
                {copy.cta}
            </Button>
        </div>
    );
}
