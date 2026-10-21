'use client';

import { CourseItemStatus, type CourseItem } from '@rumtelo/contracts';
import { useTranslations } from '@rumtelo/i18n';
import { Button, Icon } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { leftoverItems } from '@/app/_lib/course-leftovers';

import type { CourseItemActions } from '../_utils/use-course-actions';

export { leftoverItems };

/**
 * Soft wall when last period still has unfinished work — check off, move here, or let go.
 */
export function CourseLeftoverBanner({
    items,
    periodLabel,
    layerName,
    actions,
    isBusy,
}: {
    items: readonly CourseItem[];
    periodLabel: string;
    layerName: string;
    actions: CourseItemActions;
    isBusy: boolean;
}) {
    const t = useTranslations('features.growth.course');
    if (items.length === 0) return null;

    return (
        <section
            aria-label={t('leftover_title', { period: periodLabel })}
            className="grid gap-3 rounded-2xl border border-accent/40 bg-accent-soft/40 p-4 sm:p-5">
            <div className="grid gap-1">
                <p className="font-mono text-[11px] tracking-wide text-accent uppercase">
                    {t('leftover_eyebrow')}
                </p>
                <h2 className="text-base font-semibold text-fg sm:text-lg">
                    {t('leftover_title', { period: periodLabel })}
                </h2>
                <p className="text-sm text-fg-muted">
                    {t('leftover_lead', { layer: layerName, count: items.length })}
                </p>
            </div>
            <ul className="grid gap-2">
                {items.map(item => (
                    <li
                        key={item.id}
                        className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-card px-3 py-2.5">
                        <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => actions.onStatus(item, CourseItemStatus.DONE)}
                            aria-label={t('mark_done')}
                            className={cn(
                                'grid size-7 shrink-0 place-items-center rounded-full border-2 border-line-strong text-transparent transition-colors hover:border-accent disabled:cursor-default'
                            )}>
                            <Icon name="check" size="sm" aria-hidden />
                        </button>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-fg">{item.name}</p>
                            {item.doneWhen ? (
                                <p className="truncate text-xs text-fg-muted">{item.doneWhen}</p>
                            ) : null}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                disabled={isBusy}
                                onClick={() => actions.onCarry(item)}>
                                {t('leftover_carry')}
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                disabled={isBusy}
                                onClick={() => actions.onStatus(item, CourseItemStatus.DROPPED)}>
                                {t('leftover_drop')}
                            </Button>
                        </div>
                    </li>
                ))}
            </ul>
        </section>
    );
}
