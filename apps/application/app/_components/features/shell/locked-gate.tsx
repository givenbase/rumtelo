'use client';

import { HouseholdRole, PracticeClientAccess } from '@rumtelo/contracts';
import { useTranslations } from '@rumtelo/i18n';
import { Button, Typography } from '@rumtelo/ui';

import { lockCopyFor, planLabel, type PlanKey } from '@/app/_lib/plan';
import { practiceSettingsHref } from '@/app/_lib/practice-settings-tabs';
import { practicePath } from '@/app/_lib/routes';
import { useBoardWriteAccess } from '@/app/_lib/use-board-write-access';
import { usePracticePreview } from '@/components/features/shell/practice-preview';

/**
 * Full-screen upgrade wall — the only content rendered when a capability is locked.
 * Practice preview: copy addresses the client household, not the coach’s own plan.
 * VIEWER: explain the gap without an upgrade CTA (they cannot change the plan).
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
    const { capabilities } = usePracticePreview();
    const { membershipRole, membershipPending } = useBoardWriteAccess();
    const practicePreview = capabilities.active;
    const lookAlongOnly = !practicePreview && membershipRole === HouseholdRole.VIEWER;
    /** Fail-closed: no plan CTA until membership is known (VIEWER cannot upgrade). */
    const showHouseholdUpgrade =
        !practicePreview && !membershipPending && membershipRole !== null && !lookAlongOnly;
    const canManageUpgrade = capabilities.access === PracticeClientAccess.MANAGE;

    const ariaLabel = practicePreview
        ? t('pages.shell.gates.locked_plan_aria_practice')
        : lookAlongOnly
          ? t('pages.shell.gates.locked_plan_aria_viewer')
          : t('pages.shell.gates.locked_plan_aria');

    const title = practicePreview
        ? t('pages.shell.gates.locked_plan_title_practice', { plan: label })
        : lookAlongOnly
          ? t('pages.shell.gates.locked_plan_title_viewer')
          : t('pages.shell.gates.locked_plan_title', { plan: label });

    const body = practicePreview
        ? t('pages.shell.gates.locked_plan_body_practice')
        : lookAlongOnly
          ? t('pages.shell.gates.locked_plan_body_viewer')
          : copy.line;

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
            ) : showHouseholdUpgrade ? (
                <Button as="a" href="/settings/general/plan">
                    {t('pages.shell.gates.upgrade_cta', { plan: label })}
                </Button>
            ) : null}
        </div>
    );
}
