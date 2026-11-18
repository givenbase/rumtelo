'use client';

import { CourseHorizon, CourseItemStatus, type CourseItem } from '@rumtelo/contracts';
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

import { VisibilityBadge } from '@/components/features/household/visibility-badge';

import type { CourseBadgeKind } from '../_utils/course-view';
import type { CourseItemActions } from '../_utils/use-course-actions';
import { CourseBadge } from './course-badge';

/** One routine under a goal or step: "Train · 3× per week". */
export interface CourseRhythmLine {
    key: string;
    kind: Extract<CourseBadgeKind, 'HABIT' | 'DISCIPLINE'>;
    label: string;
}

/** Status chips — never red: "did not happen" is a fact, not an alarm. */
const STATUS_CHIP: Partial<Record<CourseItemStatus, string>> = {
    [CourseItemStatus.PARTIAL]: 'bg-warning/15 text-fg',
    [CourseItemStatus.MISSED]: 'bg-raised text-fg-secondary',
    [CourseItemStatus.DROPPED]: 'bg-raised text-fg-secondary',
    [CourseItemStatus.DEFERRED]: 'bg-raised text-fg-secondary',
};

/** One Course item: tick, one "why" line, status, progress ring and actions. */
export function CourseItemCard({
    item,
    why,
    makerName,
    isPickerShown,
    children,
    layerName,
    actions,
    isBusy,
    rhythmLines = [],
}: {
    item: CourseItem;
    /** Direct parent name; null = loose; `private` = parent hidden from the viewer. */
    why: string | null | { private: true };
    makerName: string | null;
    isPickerShown: boolean;
    children: readonly CourseItem[];
    layerName: (horizon: CourseHorizon) => string;
    actions: CourseItemActions;
    isBusy: boolean;
    /** Routines feeding this item ("Train · 3× per week"), each with its own badge. */
    rhythmLines?: readonly CourseRhythmLine[];
}) {
    const t = useTranslations('features.growth.course');
    const isDone = item.status === CourseItemStatus.DONE;
    const isClosed =
        isDone ||
        item.status === CourseItemStatus.DROPPED ||
        item.status === CourseItemStatus.DEFERRED;
    const nextLayer = layerName(item.horizon);

    return (
        <article
            className={cn(
                'grid gap-3 rounded-2xl border border-line bg-card p-4 sm:p-5',
                isClosed && !isDone && 'opacity-70'
            )}>
            <div className="flex items-start gap-3">
                <button
                    type="button"
                    disabled={!item.canEdit || isBusy}
                    onClick={() =>
                        actions.onStatus(
                            item,
                            isDone ? CourseItemStatus.OPEN : CourseItemStatus.DONE
                        )
                    }
                    aria-pressed={isDone}
                    aria-label={isDone ? t('mark_open') : t('mark_done')}
                    className={cn(
                        'mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border-2 transition-colors disabled:cursor-default',
                        isDone
                            ? 'border-accent bg-accent text-on-accent'
                            : 'border-line-strong text-transparent hover:border-accent'
                    )}>
                    <Icon name="check" size="sm" aria-hidden />
                </button>

                <div className="grid min-w-0 flex-1 gap-1.5">
                    <WhyLine why={why} item={item} onLink={() => actions.onEdit(item)} />
                    <h3
                        className={cn(
                            'text-base leading-snug font-semibold text-fg sm:text-lg',
                            isDone && 'text-fg-muted line-through'
                        )}>
                        {item.name}
                    </h3>
                    {item.doneWhen ? (
                        <p className="text-sm text-fg-muted">{item.doneWhen}</p>
                    ) : null}
                    {rhythmLines.length > 0 ? (
                        <ul className="grid gap-1">
                            {rhythmLines.map(line => (
                                <li
                                    key={line.key}
                                    className="flex flex-wrap items-center gap-1.5 text-sm text-fg-secondary">
                                    <CourseBadge kind={line.kind} />
                                    {line.label}
                                </li>
                            ))}
                        </ul>
                    ) : null}
                    <div className="flex flex-wrap items-center gap-1.5">
                        {STATUS_CHIP[item.status] ? (
                            <span
                                className={cn(
                                    'rounded-full px-2 py-0.5 text-xs font-semibold',
                                    STATUS_CHIP[item.status]
                                )}>
                                {t(`status.${item.status}`)}
                            </span>
                        ) : null}
                        {item.carryCount > 0 ? (
                            <span className="rounded-full bg-raised px-2 py-0.5 font-mono text-[10px] tracking-wide text-fg-secondary uppercase">
                                {t('carried', { count: item.carryCount })}
                            </span>
                        ) : null}
                        {isPickerShown ? (
                            <VisibilityBadge
                                accountId={item.accountId}
                                visibility={item.visibility}
                                makerName={item.isMine ? null : makerName}
                            />
                        ) : null}
                        {item.hiddenChildCount > 0 ? (
                            <span className="rounded-full border border-dashed border-line-strong px-2 py-0.5 font-mono text-[10px] tracking-wide text-fg-muted uppercase">
                                {t('hidden_count', { count: item.hiddenChildCount })}
                            </span>
                        ) : null}
                    </div>
                </div>

                {item.targetCount !== null ? (
                    <span className="self-center font-mono text-xs tracking-wide text-fg-secondary">
                        {t('counter', { done: item.progress.done, total: item.progress.total })}
                    </span>
                ) : null}
                {item.progress.total > 0 ? (
                    <ProgressRing
                        done={item.progress.done}
                        total={item.progress.total}
                        label={t('progress_aria', {
                            done: item.progress.done,
                            total: item.progress.total,
                        })}
                    />
                ) : null}

                {item.canEdit ? (
                    <DropdownMenu>
                        <DropdownMenuTrigger
                            disabled={isBusy}
                            aria-label={t('menu_aria', { name: item.name })}
                            className="grid size-9 shrink-0 place-items-center rounded-full text-fg-muted hover:bg-raised hover:text-fg">
                            <Icon name="ellipsis" aria-hidden />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem
                                onSelect={() => actions.onStatus(item, CourseItemStatus.PARTIAL)}>
                                {t('action_partial')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onSelect={() => actions.onStatus(item, CourseItemStatus.MISSED)}>
                                {t('action_missed')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onSelect={() => actions.onStatus(item, CourseItemStatus.DROPPED)}>
                                {t('action_drop')}
                            </DropdownMenuItem>
                            {!isDone ? (
                                <DropdownMenuItem onSelect={() => actions.onCarry(item)}>
                                    {t('action_carry', { layer: nextLayer })}
                                </DropdownMenuItem>
                            ) : null}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => actions.onEdit(item)}>
                                {t('action_edit')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => actions.onDelete(item)}>
                                {t('action_delete')}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                ) : null}
            </div>

            {children.length > 0 ? (
                <div className="grid gap-1 border-t border-line pt-3">
                    <p className="font-mono text-[10px] tracking-wide text-fg-muted uppercase">
                        {t('children_title')}
                    </p>
                    <ul className="grid gap-1">
                        {children.map(child => (
                            <li key={child.id} className="flex items-center gap-2 text-sm">
                                <span
                                    aria-hidden
                                    className={cn(
                                        'size-2 shrink-0 rounded-full',
                                        child.status === CourseItemStatus.DONE
                                            ? 'bg-accent'
                                            : 'border border-line-strong'
                                    )}
                                />
                                <span className="font-mono text-[10px] tracking-wide text-fg-muted uppercase">
                                    {layerName(child.horizon)}
                                </span>
                                <span
                                    className={cn(
                                        'min-w-0 truncate text-fg',
                                        child.status === CourseItemStatus.DONE &&
                                            'text-fg-muted line-through'
                                    )}>
                                    {child.name}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            ) : null}
        </article>
    );
}

function WhyLine({
    why,
    item,
    onLink,
}: {
    why: string | null | { private: true };
    item: CourseItem;
    onLink: () => void;
}) {
    const t = useTranslations('features.growth.course');
    if (typeof why === 'string' || (why && 'private' in why)) {
        return (
            <p className="flex min-w-0 items-center gap-1.5 font-mono text-[11px] tracking-wide text-fg-muted uppercase">
                <span aria-hidden className="h-px w-4 shrink-0 bg-accent" />
                <span className="truncate">
                    {typeof why === 'string' ? why : t('private_parent')}
                </span>
            </p>
        );
    }
    if (item.horizon === CourseHorizon.YEAR || !item.isMine || !item.canEdit) return null;
    return (
        <button
            type="button"
            onClick={onLink}
            className="w-fit text-left text-xs font-medium text-accent underline-offset-2 hover:underline">
            + {t('link_to_goal')}
        </button>
    );
}

function ProgressRing({ done, total, label }: { done: number; total: number; label: string }) {
    const radius = 22;
    const circumference = 2 * Math.PI * radius;
    const share = total === 0 ? 0 : done / total;
    return (
        <svg
            role="img"
            aria-label={label}
            viewBox="0 0 56 56"
            className="size-12 shrink-0 -rotate-90 sm:size-14">
            <circle
                cx="28"
                cy="28"
                r={radius}
                fill="none"
                strokeWidth="6"
                className="stroke-raised"
            />
            <circle
                cx="28"
                cy="28"
                r={radius}
                fill="none"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${share * circumference} ${circumference}`}
                className="stroke-accent"
            />
        </svg>
    );
}
