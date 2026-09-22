'use client';

import Link from 'next/link';

import type { CoachMessage } from '@rumtelo/contracts';
import { useTranslations } from '@rumtelo/i18n';
import { TIME_COACH_KEY_PREFIX } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { cn, toPeriodKey } from '@rumtelo/utils';

import { apiQuery } from '@/app/_lib/api-hooks';
import { normalizeAppPathname } from '@/app/_lib/nav';
import { isLiveData } from '@/app/_lib/preview';
import { productPath } from '@/app/_lib/routes';
import { resolveCoachMessage } from '@/app/_lib/coach-message-copy';
import { whyLineFor } from '@/app/_lib/why-lines';
import { PAGE_CONTENT_WIDTH, type PageContentWidth } from '@/components/layout/page-content';
import { usePageContentWidth } from '@/components/layout/page-content-width';
import { useAppShell } from '@/components/features/shell/app-shell-context';
import { useAuth } from '@/components/features/shell/auth-provider';

import { useHelpersEnabled } from './provider';

type WhyCaptionProps = {
    pathname: string;
    locked?: boolean;
};

const EMPTY_FEED: CoachMessage[] = [];
const ENERGY_WEEK = '/product/energy/week';

/** Full-bleed pages: soft centered whisper. Constrained pages: match PageContent. */
function captionWidthClass(width: PageContentWidth) {
    if (width === 'full') return PAGE_CONTENT_WIDTH.narrow;
    return PAGE_CONTENT_WIDTH[width];
}

/**
 * Soft Coach whisper under the shell — one line, card tint, no link clutter.
 * Width tracks `PageContent` so narrow/prose pages don’t misalign the helper.
 * On My week the static line yields to the top undismissed time tip.
 */
export function WhyCaption({ pathname, locked = false }: WhyCaptionProps) {
    const th = useTranslations('features.coach.helpers');
    const tCoach = useTranslations('features.coach');
    const tRoot = useTranslations();
    const tWhyRoutes = useTranslations('pages.why.routes');
    const coachGuidesEnabled = useHelpersEnabled();
    const contentWidth = usePageContentWidth();
    const { householdId } = useAuth();
    const { period } = useAppShell();
    const path = normalizeAppPathname(pathname);
    const liveWeek = isLiveData(householdId) && path === ENERGY_WEEK;

    const feedQuery = useLiveQuery(
        apiQuery.coach.feed.queryOptions({
            input: {
                householdId: householdId!,
                period: toPeriodKey(period.year, period.month),
            },
        }),
        EMPTY_FEED,
        liveWeek
    );

    if (locked || !coachGuidesEnabled) return null;

    const tip = feedQuery.data.find(message => message.key?.startsWith(TIME_COACH_KEY_PREFIX));
    const why = tip
        ? resolveCoachMessage(tip, tCoach, tRoot).text
        : whyLineFor(pathname, tWhyRoutes);
    if (!why) return null;

    return (
        <aside
            className={cn(
                'mx-auto mb-5 w-full rounded-xl border border-line bg-raised/70 px-3 py-2 shadow-sm',
                captionWidthClass(contentWidth)
            )}
            data-feature-helper="why-line"
            data-coach-guide="why"
            aria-label={th('why_aria')}>
            <p className="flex items-start gap-2 text-xs leading-snug text-fg-muted">
                <span
                    className="mt-px shrink-0 font-mono text-[10px] font-bold tracking-wider text-accent uppercase"
                    aria-hidden>
                    ✦
                </span>
                <span className="min-w-0 flex-1 text-pretty">{why}</span>
                <Link
                    href={productPath('coach')}
                    className="shrink-0 font-mono text-[10px] font-semibold tracking-wide text-accent/70 uppercase transition-colors hover:text-accent"
                    title={th('open_coach')}>
                    {th('mark_label')}
                </Link>
            </p>
        </aside>
    );
}
