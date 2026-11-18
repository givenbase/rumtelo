'use client';

import { useTranslations } from '@rumtelo/i18n';
import { Icon } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import type { CourseBadgeKind } from '../_utils/course-view';

/** Icon per kind — the badge is what tells a choice from a routine from a check. */
const ICON = {
    FOCUS: 'target',
    HABIT: 'sprout',
    DISCIPLINE: 'repeat',
    CHECK: 'calendar-check',
    ADVICE: 'lightbulb',
} as const satisfies Record<CourseBadgeKind, string>;

const TONE: Record<CourseBadgeKind, string> = {
    FOCUS: 'bg-accent-soft text-accent',
    HABIT: 'bg-raised text-fg-secondary',
    DISCIPLINE: 'bg-raised text-fg-secondary',
    CHECK: 'bg-raised text-fg-secondary',
    ADVICE: 'border border-dashed border-line-strong text-fg-muted',
};

/** FOCUS · HABIT · DISCIPLINE · CHECK · ADVICE — on every Course row. */
export function CourseBadge({ kind, className }: { kind: CourseBadgeKind; className?: string }) {
    const t = useTranslations('features.growth.course.lane');
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] tracking-wide uppercase',
                TONE[kind],
                className
            )}>
            <Icon name={ICON[kind]} size="sm" className="size-3" aria-hidden />
            {t(kind)}
        </span>
    );
}
