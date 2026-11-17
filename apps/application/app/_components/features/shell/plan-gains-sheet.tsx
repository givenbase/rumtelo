'use client';

import { useLocale, useTranslations } from '@rumtelo/i18n';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    Typography,
} from '@rumtelo/ui';

import {
    capabilityName,
    lockCopyFor,
    MAX_GAIN_CAPABILITIES,
    PLAN_LIMITS,
    planAmountLabel,
    planLabel,
    PlanKey,
    PLUS_GAIN_CAPABILITIES,
    type PlanLimitKey,
} from '@/app/_lib/plan';

import { LockActions, type LockPlan } from './lock-card';

type LimitRow = { key: string; text: string };

/** Higher limits on Max, read from `PLAN_LIMITS` (never hard-coded). */
function maxLimitRows(
    t: ReturnType<typeof useTranslations>,
    from: PlanKey,
    to: PlanKey
): LimitRow[] {
    const rows: LimitRow[] = [];
    const before = PLAN_LIMITS[from];
    const after = PLAN_LIMITS[to];
    const rank = (value: number | null) => (value === null ? Number.POSITIVE_INFINITY : value);
    const higher = (key: PlanLimitKey) => rank(after[key]) > rank(before[key]);

    if (higher('maxMembers') && after.maxMembers !== null) {
        rows.push({
            key: 'members',
            text: t('pages.shell.plan_gains.members', { count: after.maxMembers }),
        });
    }
    if (higher('maxGoals')) {
        rows.push({
            key: 'goals',
            text:
                after.maxGoals === null
                    ? t('pages.shell.plan_gains.goals_unlimited')
                    : t('pages.shell.plan_gains.goals', { count: after.maxGoals }),
        });
    }
    if (higher('maxBankLinks') && after.maxBankLinks !== null) {
        rows.push({
            key: 'bank_links',
            text: t('pages.shell.plan_gains.bank_links', { count: after.maxBankLinks }),
        });
    }
    return rows;
}

/**
 * "More with Plus" / "More with Max": what the next plan adds, with its price and one
 * move. Bottom sheet on phones, side panel from `md`. Only rendered for a household
 * writer (OWNER / MEMBER), never in Practice preview, and never lists Energy or Soul.
 */
export function PlanGainsSheet({
    plan,
    open,
    onOpenChange,
}: {
    plan: LockPlan;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const t = useTranslations();
    const locale = useLocale();
    const label = planLabel(plan, t);
    const amount = planAmountLabel(plan, locale) ?? '';
    const capabilityKeys = plan === PlanKey.MAX ? MAX_GAIN_CAPABILITIES : PLUS_GAIN_CAPABILITIES;
    const limitRows = plan === PlanKey.MAX ? maxLimitRows(t, PlanKey.PLUS, PlanKey.MAX) : [];

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="bottom"
                closeLabel={t('pages.shell.plan_gains.close')}
                className="max-h-[85dvh] gap-0 overflow-y-auto rounded-t-2xl pb-[env(safe-area-inset-bottom)] md:inset-x-auto md:inset-y-0 md:right-0 md:h-full md:max-h-none md:w-full md:max-w-md md:rounded-none md:border-t-0 md:border-l">
                <SheetHeader className="border-b border-line px-5 pt-5 pr-14 pb-4 text-left">
                    <SheetTitle className="text-xl leading-snug">
                        {t('pages.shell.plan_gains.title', { plan: label })}
                    </SheetTitle>
                    <SheetDescription>
                        {t('pages.shell.plan_gains.price', { plan: label, price: amount })}
                    </SheetDescription>
                </SheetHeader>

                <ul className="grid gap-4 px-5 py-5">
                    {capabilityKeys.map(key => (
                        <li key={key} className="grid min-w-0 gap-0.5">
                            <Typography as="h3" size="sm" className="text-base">
                                {capabilityName(key, t)}
                            </Typography>
                            <Typography as="p" size="sm" color="secondary" className="text-pretty">
                                {lockCopyFor(key, plan, t).gain}
                            </Typography>
                        </li>
                    ))}
                    {limitRows.map(row => (
                        <li key={row.key} className="min-w-0 text-sm text-fg-secondary">
                            {row.text}
                        </li>
                    ))}
                </ul>

                <div className="grid gap-4 border-t border-line px-5 py-5">
                    <Typography as="p" size="sm" color="muted" className="text-pretty">
                        {t('pages.shell.gates.lock.body_tail')}
                    </Typography>
                    <LockActions
                        plan={plan}
                        onNotNow={() => onOpenChange(false)}
                        onSwitch={() => onOpenChange(false)}
                    />
                </div>
            </SheetContent>
        </Sheet>
    );
}
