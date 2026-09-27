'use client';

import { PracticeClientAccess } from '@rumtelo/contracts';
import { useTranslations } from '@rumtelo/i18n';
import { Button, Typography } from '@rumtelo/ui';

import { lockCopyFor, planLabel, type PlanKey } from '@/app/_lib/plan';
import { practiceSettingsHref } from '@/app/_lib/practice-settings-tabs';
import { practicePath } from '@/app/_lib/routes';
import { usePracticePreview } from '@/components/features/shell/practice-preview';

/**
 * Full-screen upgrade wall — the only content rendered when a capability is locked.
 * Practice preview: copy addresses the client household, not the coach’s own plan.
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
    const practicePreview = capabilities.active;
    const canManageUpgrade = capabilities.access === PracticeClientAccess.MANAGE;

    return (
        <div
            role="region"
            data-testid="locked-plan-gate"
            aria-label={
                practicePreview
                    ? t('pages.shell.gates.locked_plan_aria_practice')
                    : t('pages.shell.gates.locked_plan_aria')
            }
            className="flex min-h-[min(32rem,70dvh)] animate-rise flex-col items-center justify-center gap-5 px-6 py-16 text-center">
            <span className="text-4xl" aria-hidden>
                🔒
            </span>
            <div className="max-w-sm">
                <Typography as="h2" className="text-xl sm:text-2xl">
                    {practicePreview
                        ? t('pages.shell.gates.locked_plan_title_practice', { plan: label })
                        : t('pages.shell.gates.locked_plan_title', { plan: label })}
                </Typography>
                <Typography as="p" size="sm" color="muted" className="mt-2">
                    {practicePreview ? t('pages.shell.gates.locked_plan_body_practice') : copy.line}
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
                <Button as="a" href="/settings/general/plan">
                    {t('pages.shell.gates.upgrade_cta', { plan: label })}
                </Button>
            )}
        </div>
    );
}
