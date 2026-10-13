'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { HouseholdRelation, HouseholdRole } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { useTranslations } from '@rumtelo/i18n';
import { BrandLoader, Typography } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { apiQuery } from '@/app/_lib/api-hooks';
import { onboardingPath, practicePath } from '@/app/_lib/routes';
import { useBoardWriteAccess } from '@/app/_lib/use-board-write-access';
import { useAuth } from '@/components/features/shell/auth-provider';

/**
 * Soft-upgrade chooser — VIEWER picks household board vs Practice desk.
 * Does not detach the look-along seat; `/onboarding/create` does that.
 */
export function StartOwnChooser() {
    const t = useTranslations('pages.shell.viewer');
    const router = useRouter();
    const { session, isPending, householdReady, householdId, userId } = useAuth();
    const { membershipRole, membershipPending, role } = useBoardWriteAccess();

    const practiceListQuery = useLiveQuery(apiQuery.practice.list.queryOptions(), [], true);
    const hasPractice = (practiceListQuery.data?.length ?? 0) > 0;
    const membersQuery = useLiveQuery(
        apiQuery.household.members.queryOptions({ input: { householdId: householdId! } }),
        [],
        Boolean(householdId)
    );
    const myRelation = membersQuery.data.find(member => member.userId === userId)?.relation ?? null;
    const suggestPractice = myRelation === HouseholdRelation.EXTERNAL;
    const suggestHousehold =
        myRelation === HouseholdRelation.FAMILY || myRelation === HouseholdRelation.CIRCLE;

    const lookAlongSeat =
        membershipRole === HouseholdRole.VIEWER ||
        (!membershipPending && !membershipRole && role === HouseholdRole.VIEWER);

    useEffect(() => {
        if (isPending || !householdReady || membershipPending) return;
        if (!session) return;
        if (membershipRole && membershipRole !== HouseholdRole.VIEWER) {
            router.replace('/');
        }
    }, [householdReady, isPending, membershipPending, membershipRole, router, session]);

    if (isPending || !householdReady || membershipPending) {
        return <BrandLoader fullScreen label={t('chooser_loading')} />;
    }

    if (!session || (membershipRole && membershipRole !== HouseholdRole.VIEWER)) {
        return <BrandLoader fullScreen label={t('chooser_loading')} />;
    }

    if (!lookAlongSeat) {
        return <BrandLoader fullScreen label={t('chooser_loading')} />;
    }

    const practiceHref = hasPractice ? practicePath() : practicePath('create');
    const practiceCta = hasPractice ? t('chooser_practice_open_cta') : t('chooser_practice_cta');

    return (
        <div className="grid animate-rise gap-8">
            <div>
                <Typography as="span" variant="eyebrow" color="primary">
                    ✦ {t('chooser_eyebrow')}
                </Typography>
                <Typography as="h1" className="mt-2">
                    {t('chooser_title')}
                </Typography>
                <Typography as="p" variant="lead" size="default" className="mt-2">
                    {t('chooser_lead')}
                </Typography>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <ChooserCard
                    href={onboardingPath('create')}
                    title={t('chooser_household_title')}
                    body={t('chooser_household_body')}
                    bullets={[
                        t('chooser_household_bullet_1'),
                        t('chooser_household_bullet_2'),
                        t('chooser_household_bullet_3'),
                    ]}
                    cta={t('chooser_household_cta')}
                    suggested={suggestHousehold}
                    suggestedLabel={t('chooser_suggested')}
                />
                <ChooserCard
                    href={practiceHref}
                    title={t('chooser_practice_title')}
                    body={t('chooser_practice_body')}
                    bullets={[
                        t('chooser_practice_bullet_1'),
                        t('chooser_practice_bullet_2'),
                        t('chooser_practice_bullet_3'),
                    ]}
                    cta={practiceCta}
                    suggested={suggestPractice}
                    suggestedLabel={t('chooser_suggested')}
                />
            </div>

            <p className="text-center text-sm text-fg-muted">
                <Link href="/" className="font-semibold text-accent hover:underline">
                    {t('chooser_back')}
                </Link>
            </p>
        </div>
    );
}

function ChooserCard({
    href,
    title,
    body,
    bullets,
    cta,
    suggested,
    suggestedLabel,
}: {
    href: string;
    title: string;
    body: string;
    bullets: readonly string[];
    cta: string;
    suggested?: boolean;
    suggestedLabel?: string;
}) {
    return (
        <Link
            href={href}
            className={cn(
                'group flex flex-col gap-4 rounded-2xl border bg-surface p-5 transition',
                suggested ? 'border-accent/60 ring-1 ring-accent/25' : 'border-line',
                'hover:border-accent/50 hover:bg-raised focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:outline-none'
            )}>
            <div className="grid gap-1.5">
                {suggested && suggestedLabel ? (
                    <span className="font-mono text-[10px] font-semibold tracking-wide text-accent uppercase">
                        {suggestedLabel}
                    </span>
                ) : null}
                <Typography as="h2" size="sm">
                    {title}
                </Typography>
                <Typography as="p" size="sm" color="muted">
                    {body}
                </Typography>
            </div>
            <ul className="grid flex-1 gap-1.5 text-sm text-fg-secondary">
                {bullets.map(bullet => (
                    <li key={bullet} className="flex gap-2">
                        <span className="text-accent" aria-hidden>
                            ·
                        </span>
                        <span>{bullet}</span>
                    </li>
                ))}
            </ul>
            <span className="inline-flex min-h-10 items-center justify-center rounded-full bg-accent px-4 text-sm font-semibold text-on-accent transition group-hover:brightness-110">
                {cta}
            </span>
        </Link>
    );
}
