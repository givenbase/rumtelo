'use client';

import { useEffect, useRef } from 'react';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { HouseholdRole } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { useLocale, useTranslations } from '@rumtelo/i18n';
import { Badge, Button, Card, Typography } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { apiQuery } from '@/app/_lib/api-hooks';
import { normalizeAppPathname } from '@/app/_lib/path';
import { capabilityName, lockCopyFor, planAmountLabel, planLabel, PlanKey } from '@/app/_lib/plan';
import { productPath } from '@/app/_lib/routes';
import { useBoardWriteAccess } from '@/app/_lib/use-board-write-access';
import { useAuth } from '@/components/features/shell/auth-provider';

import { LockPreview } from './lock-preview';

export const PLAN_SETTINGS_HREF = '/settings/general/plan';

export type LockPlan = PlanKey.PLUS | PlanKey.MAX;

/** A lock only ever asks for a paid plan; anything else reads as Plus. */
export function asLockPlan(plan: PlanKey | null | undefined): LockPlan {
    return plan === PlanKey.MAX ? PlanKey.MAX : PlanKey.PLUS;
}

export type LockAudience = {
    /** OWNER can switch plans. MEMBER asks the owner. `unknown` = membership still loading. */
    kind: 'owner' | 'member' | 'unknown';
    /** Null when the members query has not answered or failed; copy falls back. */
    ownerName: string | null;
};

/**
 * Who is looking at a lock. Billing is OWNER-only, so a MEMBER never gets a button
 * that leads to a page they cannot use. Fails closed while the role is unknown.
 * (VIEWER and Practice preview are handled by the caller before a LockCard renders.)
 */
export function useLockAudience(): LockAudience {
    const { householdId } = useAuth();
    const { membershipRole } = useBoardWriteAccess();
    const membersQuery = useLiveQuery(
        apiQuery.household.members.queryOptions({ input: { householdId: householdId! } }),
        [],
        Boolean(householdId) && membershipRole === HouseholdRole.MEMBER
    );
    const ownerName =
        membersQuery.data
            ?.find(member => member.role === HouseholdRole.OWNER)
            ?.displayName.trim() || null;

    if (membershipRole === HouseholdRole.OWNER) return { kind: 'owner', ownerName };
    if (membershipRole === HouseholdRole.MEMBER) return { kind: 'member', ownerName };
    return { kind: 'unknown', ownerName };
}

/** Where "Not now" lands when there is no in-app history to go back to. */
export function portalRootForPath(pathname: string): string {
    const path = normalizeAppPathname(pathname);
    if (path.startsWith(productPath('money'))) return productPath('money');
    if (path.startsWith(productPath('growth'))) return productPath('growth');
    return '/';
}

/** `router.back()` when there is somewhere in-app to go back to, else the portal root. */
export function useNotNow(): () => void {
    const router = useRouter();
    const pathname = usePathname() ?? '/';
    return () => {
        if (typeof window !== 'undefined' && window.history.length > 1) {
            router.back();
            return;
        }
        router.push(portalRootForPath(pathname));
    };
}

/**
 * The lock's moves: "Switch to {plan}" (OWNER), "Ask {owner} to switch" text (MEMBER),
 * and always "Not now". No trial exists, so the button never says "Try".
 */
export function LockActions({
    plan,
    compact = false,
    onNotNow,
    onSwitch,
    className,
}: {
    plan: LockPlan;
    compact?: boolean;
    onNotNow?: () => void;
    /** Runs when the OWNER taps "Switch to {plan}" (the sheet closes itself). */
    onSwitch?: () => void;
    className?: string;
}) {
    const t = useTranslations();
    const audience = useLockAudience();
    const goBack = useNotNow();
    const label = planLabel(plan, t);

    return (
        <div className={cn('grid min-w-0 gap-3', className)}>
            {audience.kind === 'member' ? (
                <Typography as="p" size="sm" color="secondary" className="text-pretty">
                    {audience.ownerName
                        ? t('pages.shell.gates.lock.ask_owner', {
                              owner: audience.ownerName,
                              plan: label,
                          })
                        : t('pages.shell.gates.lock.ask_owner_unknown', { plan: label })}
                </Typography>
            ) : null}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                {audience.kind === 'owner' ? (
                    <Button
                        as={Link}
                        href={PLAN_SETTINGS_HREF}
                        onClick={onSwitch}
                        size={compact ? 'md' : 'lg'}
                        className="w-full sm:w-auto">
                        {t('pages.shell.gates.lock.switch_cta', { plan: label })}
                    </Button>
                ) : null}
                <Button
                    type="button"
                    variant={compact ? 'ghost' : 'secondary'}
                    size={compact ? 'md' : 'lg'}
                    onClick={onNotNow ?? goBack}
                    className="w-full sm:w-auto">
                    {t('pages.shell.gates.lock.not_now')}
                </Button>
            </div>
        </div>
    );
}

/**
 * A lock that explains the gain: what you would get, what it costs, an example, and a
 * way back. `page` replaces a locked route; `compact` sits above a page (Basic Growth).
 * Audience: OWNER, MEMBER (and an unknown role, fail closed). VIEWER / Practice preview
 * keep their own copy in `LockedGate`.
 */
export function LockCard({
    capabilityKey,
    requiredPlan,
    variant,
    onNotNow,
}: {
    capabilityKey: string | null | undefined;
    requiredPlan: LockPlan;
    variant: 'page' | 'compact';
    onNotNow?: () => void;
}) {
    const t = useTranslations();
    const locale = useLocale();
    const titleRef = useRef<HTMLHeadingElement>(null);
    const copy = lockCopyFor(capabilityKey, requiredPlan, t);
    const feature =
        capabilityName(capabilityKey, t) ?? t('pages.shell.gates.lock.feature_fallback');
    const title = t('pages.shell.gates.lock.title', {
        feature,
        plan: copy.planName,
        price: planAmountLabel(requiredPlan, locale) ?? '',
    });
    const isPage = variant === 'page';

    // Page lock: land on the explanation, not on the button.
    useEffect(() => {
        if (isPage) titleRef.current?.focus({ preventScroll: true });
    }, [isPage]);

    const heading = (
        <Typography
            as={isPage ? 'h1' : 'h2'}
            size="sm"
            className="text-xl leading-snug text-balance outline-none sm:text-2xl"
            ref={titleRef}
            tabIndex={-1}>
            {title}
        </Typography>
    );
    const badge = (
        <div className="flex">
            <Badge>
                <span aria-hidden className="mr-1">
                    🔒
                </span>
                {t('pages.shell.gates.lock.badge', { plan: copy.planName })}
            </Badge>
        </div>
    );
    const body = (
        <Typography as="p" size="sm" color="secondary" className="text-pretty">
            {copy.gain} {t('pages.shell.gates.lock.body_tail')}
        </Typography>
    );
    const regionLabel = t('pages.shell.gates.lock.region_aria', {
        feature,
        plan: copy.planName,
    });

    if (!isPage) {
        return (
            <Card className="grid min-w-0 gap-3 border-accent/30 bg-accent-soft shadow-none">
                <section
                    aria-label={regionLabel}
                    data-testid="locked-plan-card"
                    className="grid min-w-0 gap-3">
                    {badge}
                    {heading}
                    {body}
                    <LockActions plan={requiredPlan} compact onNotNow={onNotNow} />
                </section>
            </Card>
        );
    }

    return (
        <section
            aria-label={regionLabel}
            data-testid="locked-plan-gate"
            className="mx-auto grid max-w-3xl min-w-0 animate-rise gap-6 py-6 sm:py-10 md:grid-cols-2 md:items-start md:gap-10">
            <div className="grid min-w-0 content-start gap-4">
                {badge}
                {heading}
                {body}
                <LockActions plan={requiredPlan} onNotNow={onNotNow} className="mt-2" />
            </div>
            <LockPreview capabilityKey={capabilityKey} />
        </section>
    );
}
