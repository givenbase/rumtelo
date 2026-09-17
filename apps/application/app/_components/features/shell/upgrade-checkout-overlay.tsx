'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import { PlanKey } from '@rumtelo/contracts';
import { Button, Typography } from '@rumtelo/ui';

import { api } from '@/app/_lib/api';
import { PLAN_LABELS } from '@/app/_lib/plan';
import { useAuth } from '@/components/features/shell/auth-provider';
import { useAppShell } from '@/components/features/shell/app-shell-context';
import { useOptionalPlanIntent } from '@/components/features/shell/plan-intent-provider';

/**
 * After household onboard (or sign-in with a remembered Plus/Max pick from marketing):
 * open Stripe Checkout automatically once setup succeeded.
 */
export function UpgradeCheckoutOverlay({ open, onSkip }: { open: boolean; onSkip: () => void }) {
    const { householdId } = useAuth();
    const { showToast } = useAppShell();
    const planIntent = useOptionalPlanIntent();
    const intent = planIntent?.intent ?? null;
    const [busy, setBusy] = useState(false);
    const autoStarted = useRef(false);

    const checkout = useMutation({
        mutationFn: async () => {
            if (!householdId || !intent) throw new Error('Missing household or plan');
            return api.billing.createCheckoutSession({
                householdId,
                planKey: intent.planKey,
                interval: intent.interval,
            });
        },
        onSuccess: result => {
            planIntent?.clearIntent();
            if (result.url) {
                window.location.assign(result.url);
                return;
            }
            if (result.applied) {
                showToast(`${PLAN_LABELS[intent!.planKey]} is active`, 'success');
                onSkip();
            }
        },
        onError: () => {
            showToast('Could not start Stripe checkout — try Settings → Plan', 'error');
            setBusy(false);
            autoStarted.current = false;
        },
    });

    useEffect(() => {
        if (!open) {
            autoStarted.current = false;
            return;
        }
        if (!intent || !householdId || autoStarted.current) return;
        if (intent.planKey !== PlanKey.PLUS && intent.planKey !== PlanKey.MAX) return;
        autoStarted.current = true;
        setBusy(true);
        checkout.mutate();
        // Intentionally once per open — mutate identity changes every render.
        // eslint-disable-next-line react-hooks/exhaustive-deps -- auto-start Stripe once when overlay opens
    }, [open, intent, householdId]);

    if (!open || !intent || !householdId) return null;
    if (intent.planKey !== PlanKey.PLUS && intent.planKey !== PlanKey.MAX) return null;

    const label = PLAN_LABELS[intent.planKey];
    const period = intent.interval === 'year' ? 'yearly' : 'monthly';
    const opening = busy || checkout.isPending;

    return (
        <>
            <div aria-hidden="true" className="fixed inset-0 z-70 bg-scrim/70" />
            <div
                role="dialog"
                aria-modal="true"
                aria-label={`Upgrade to ${label}`}
                className="fixed top-1/2 left-1/2 z-71 w-full max-w-md -translate-1/2 animate-rise rounded-2xl border border-line-strong bg-surface p-6 shadow-xl">
                <Typography as="p" variant="eyebrow" color="primary">
                    Finish your upgrade
                </Typography>
                <Typography as="h2" className="mt-2">
                    {opening ? `Opening Stripe for ${label}…` : `Add payment for ${label}`}
                </Typography>
                <Typography as="p" size="sm" color="muted" className="mt-2">
                    You chose {label} ({period}) on the website. Account setup is done — next is
                    Stripe Checkout to activate the plan. You can skip and stay on Basic, then
                    upgrade anytime in Settings → Plan.
                </Typography>

                <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <Button
                        variant="ghost"
                        disabled={opening}
                        onClick={() => {
                            planIntent?.clearIntent();
                            onSkip();
                        }}>
                        Stay on Basic
                    </Button>
                    <Button
                        disabled={opening}
                        onClick={() => {
                            setBusy(true);
                            checkout.mutate();
                        }}>
                        {opening ? 'Opening Stripe…' : `Continue to Stripe`}
                    </Button>
                </div>
            </div>
        </>
    );
}
