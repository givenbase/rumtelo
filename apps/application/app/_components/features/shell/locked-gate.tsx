'use client';

import { HouseholdRole, PracticeClientAccess } from '@rumtelo/contracts';
import { useTranslations } from '@rumtelo/i18n';
import { Button, Typography } from '@rumtelo/ui';

import { planLabel, type PlanKey } from '@/app/_lib/plan';
import { practiceSettingsHref } from '@/app/_lib/practice-settings-tabs';
import { practicePath } from '@/app/_lib/routes';
import { useBoardWriteAccess } from '@/app/_lib/use-board-write-access';
import { usePracticePreview } from '@/components/features/shell/practice-preview';

import { asLockPlan, LockCard, useNotNow } from './lock-card';

/**
 * Page-level lock: the only content rendered when a capability is locked.
 *
 * - OWNER / MEMBER: `LockCard` (gain, price, example, "Switch to {plan}" or "Ask {owner}", "Not now").
 * - VIEWER: look-along copy, no price, no plan CTA, "Back".
 * - Practice preview: copy addresses the client household; no household price.
 */
export function LockedGate({
    requiredPlan,
    capabilityKey,
}: {
    requiredPlan: PlanKey;
    capabilityKey?: string | null;
}) {
    const t = useTranslations();
    const goBack = useNotNow();
    const { capabilities } = usePracticePreview();
    const { membershipRole } = useBoardWriteAccess();
    const practicePreview = capabilities.active;
    const lookAlongOnly = !practicePreview && membershipRole === HouseholdRole.VIEWER;

    if (!practicePreview && !lookAlongOnly) {
        return (
            <LockCard
                capabilityKey={capabilityKey}
                requiredPlan={asLockPlan(requiredPlan)}
                variant="page"
            />
        );
    }

    const label = planLabel(requiredPlan, t);
    const canManageUpgrade = capabilities.access === PracticeClientAccess.MANAGE;

    const ariaLabel = practicePreview
        ? t('pages.shell.gates.locked_plan_aria_practice')
        : t('pages.shell.gates.locked_plan_aria_viewer');
    const title = practicePreview
        ? t('pages.shell.gates.locked_plan_title_practice', { plan: label })
        : t('pages.shell.gates.locked_plan_title_viewer');
    const body = practicePreview
        ? t('pages.shell.gates.locked_plan_body_practice')
        : t('pages.shell.gates.locked_plan_body_viewer');

    return (
        <div
            role="region"
            data-testid="locked-plan-gate"
            aria-label={ariaLabel}
            className="flex min-h-[min(32rem,70dvh)] animate-rise flex-col items-center justify-center gap-5 px-6 py-16 text-center">
            <span className="text-4xl" aria-hidden>
                🔒
            </span>
            <div className="max-w-sm">
                <Typography as="h2" className="text-xl sm:text-2xl">
                    {title}
                </Typography>
                <Typography as="p" size="sm" color="muted" className="mt-2">
                    {body}
                </Typography>
            </div>
            {practicePreview ? (
                canManageUpgrade ? (
                    <Button as="a" href={practiceSettingsHref('billing')}>
                        {t('pages.shell.gates.upgrade_cta_practice')}
                    </Button>
                ) : (
                    <Button as="a" href={practicePath('clients')} variant="secondary">
                        {t('pages.shell.gates.back_to_practice')}
                    </Button>
                )
            ) : (
                <Button type="button" variant="secondary" onClick={goBack}>
                    {t('pages.shell.gates.lock.back')}
                </Button>
            )}
        </div>
    );
}
