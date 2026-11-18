'use client';

import { CourseItemStatus, type CourseItem } from '@rumtelo/contracts';
import { useTranslations } from '@rumtelo/i18n';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    Icon,
} from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import type { CourseItemActions } from '../_utils/use-course-actions';

/**
 * One step or focus item inside a goal: tick, name, counter and a small menu. Closed
 * items stay readable; nothing turns red.
 */
export function CourseMiniRow({
    item,
    actions,
    isBusy,
    extra,
}: {
    item: CourseItem;
    actions: CourseItemActions;
    isBusy: boolean;
    /** Right-hand slot, e.g. "Link to a goal". */
    extra?: React.ReactNode;
}) {
    const t = useTranslations('features.growth.course');
    const isDone = item.status === CourseItemStatus.DONE;
    const isLetGo =
        item.status === CourseItemStatus.DROPPED || item.status === CourseItemStatus.DEFERRED;

    return (
        <li className="flex items-center gap-3 rounded-2xl bg-raised/60 px-3 py-2">
            <button
                type="button"
                disabled={!item.canEdit || isBusy}
                onClick={() =>
                    actions.onStatus(item, isDone ? CourseItemStatus.OPEN : CourseItemStatus.DONE)
                }
                aria-pressed={isDone}
                aria-label={`${isDone ? t('mark_open') : t('mark_done')}: ${item.name}`}
                className={cn(
                    'grid size-6 shrink-0 place-items-center rounded-full border-2 transition-colors disabled:cursor-default',
                    isDone
                        ? 'border-accent bg-accent text-on-accent'
                        : 'border-line-strong text-transparent hover:border-accent'
                )}>
                <Icon name="check" size="sm" className="size-3.5" aria-hidden />
            </button>
            <span
                className={cn(
                    'min-w-0 flex-1 truncate text-sm text-fg',
                    isDone && 'text-fg-muted line-through',
                    isLetGo && 'text-fg-muted'
                )}>
                {item.name}
            </span>
            {item.targetCount !== null ? (
                <span className="font-mono text-xs tracking-wide text-fg-secondary">
                    {t('counter', { done: item.progress.done, total: item.progress.total })}
                </span>
            ) : null}
            {extra}
            {item.canEdit ? (
                <DropdownMenu>
                    <DropdownMenuTrigger
                        disabled={isBusy}
                        aria-label={t('menu_aria', { name: item.name })}
                        className="grid size-8 shrink-0 place-items-center rounded-full text-fg-muted hover:bg-raised hover:text-fg">
                        <Icon name="ellipsis" aria-hidden />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => actions.onEdit(item)}>
                            {t('action_edit')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onSelect={() => actions.onStatus(item, CourseItemStatus.DROPPED)}>
                            {t('action_drop')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => actions.onDelete(item)}>
                            {t('action_delete')}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ) : null}
        </li>
    );
}
