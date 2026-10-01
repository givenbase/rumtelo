'use client';

import { PlanKey } from '@rumtelo/contracts';

import { usePathname } from 'next/navigation';

import { usePageTour } from '@/components/features/tour';
import { useAuth } from '@/components/features/shell/auth-provider';
import { useOptionalPlanIntent } from '@/components/features/shell/plan-intent-provider';
import { UpgradeCheckoutOverlay } from '@/components/features/shell/upgrade-checkout-overlay';

/**
 * Marketing Plus/Max → after household exists and onboarding is done,
 * open Stripe Checkout (auto-starts inside the overlay).
 */
export function PendingPlanCheckout() {
    const { householdId, isPending } = useAuth();
    const pathname = usePathname();
    const { requestTourOffer } = usePageTour();
    const planIntent = useOptionalPlanIntent();
    const intent = planIntent?.intent ?? null;

    const paidIntent =
        intent?.planKey === PlanKey.PLUS || intent?.planKey === PlanKey.MAX ? intent : null;

    const isOnboarding = pathname.includes('/onboarding');

    const open = Boolean(!isPending && householdId && !isOnboarding && paidIntent);

    return (
        <UpgradeCheckoutOverlay
            open={open}
            onSkip={() => {
                planIntent?.clearIntent();
                requestTourOffer();
            }}
        />
    );
}
