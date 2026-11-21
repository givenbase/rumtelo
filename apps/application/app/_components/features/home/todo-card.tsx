'use client';

import { useId } from 'react';
import Link from 'next/link';

import { useTranslations } from '@rumtelo/i18n';
import { Icon, Typography } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import type { HomeTodo, TodoRow } from '@/app/_lib/home-todo';
import type { Weekday } from '@/app/_lib/next-move';
import {
    CoachLineCtaLink,
    CoachLineUndo,
    type CoachLineState,
} from '@/components/features/helpers/coach-line';

import { NextMoveBody } from './next-move-card';

type TodoCardProps = {
    todo: HomeTodo;
    /** Writer (OWNER / MEMBER) and not a Practice preview. Read-only users get text rows only. */
    canAct: boolean;
    /** The plan has statement import. */
    canImport: boolean;
    /** EUR households read "Every euro"; other currencies read "Every amount". */
    isEuro: boolean;
    /** `YYYY-MM` to a month name. */
    formatMonth: (period: string) => string;
    formatWeekday: (weekday: Weekday) => string;
    onCloseMonth: (period: string) => void;
    /** The Coach line's state, so its tip is a row here with the same Hide / Undo. */
    coach: CoachLineState;
    /** Total tips when more than the one shown exist (Home: "All tips (n)"). */
    allTipsCount: number | null;
    /** Set when Home is showing another period: the card still talks about now. */
    travelNote?: string | null;
};

const TEXT_LINK =
    'inline-flex min-h-11 shrink-0 items-center gap-1 text-sm font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';
const ROW = 'flex min-h-11 min-w-0 items-center justify-between gap-3 py-1';

/**
 * Home's one "To do" card, always top-left. The next move is the big first item; at most a few
 * smaller rows follow (what else is waiting, then the Coach's top tip). Nothing left shows a
 * calm "All done" line. Read-only users (VIEWER, Practice look-along) see the same rows as
 * plain text, with no buttons or links.
 */
export function TodoCard({
    todo,
    canAct,
    canImport,
    isEuro,
    formatMonth,
    formatWeekday,
    onCloseMonth,
    coach,
    allTipsCount,
    travelNote,
}: TodoCardProps) {
    const t = useTranslations('pages.dashboard.todo');
    const tDashboard = useTranslations('pages.dashboard');
    const tCoach = useTranslations('features.coach.line');
    const eyebrowId = useId();
    const titleId = useId();

    function rowText(row: Exclude<TodoRow, { kind: 'coach' }>): string {
        switch (row.kind) {
            case 'inbox':
                return t('rows.inbox', { count: row.count });
            case 'week_check':
                return t('rows.week_check');
            case 'bills':
                return row.names.length > 0
                    ? t('rows.bills_names', { count: row.count, names: row.names.join(', ') })
                    : t('rows.bills', { count: row.count });
            case 'close_month':
                return tDashboard('next_move.viewer.close_month', {
                    month: formatMonth(row.month),
                    days: Math.max(0, row.daysLeft),
                });
        }
    }

    function renderRow(row: TodoRow) {
        if (row.kind === 'coach') {
            if (coach.undoing) {
                return (
                    <li key="coach">
                        <CoachLineUndo
                            onUndo={coach.undoHide}
                            className="rounded-none border-0 bg-transparent px-0 py-1"
                        />
                    </li>
                );
            }
            const tip = coach.candidate;
            if (!tip) return null;
            return (
                <li key="coach" className="grid gap-0.5 py-2" data-coach-guide="line">
                    <div className="flex min-w-0 items-start justify-between gap-3">
                        <div className="grid min-w-0 gap-1">
                            <p className="font-mono text-[10px] font-bold tracking-[0.14em] text-accent uppercase">
                                <span aria-hidden>✦ </span>
                                {tCoach('label')}
                            </p>
                            <p className="min-w-0 text-sm text-pretty wrap-anywhere text-fg">
                                {tip.text}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => coach.hide(tip)}
                            aria-label={tCoach('hide')}
                            className="-my-2 -mr-2 grid size-11 shrink-0 place-items-center rounded-full text-fg-muted transition-colors outline-none hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
                            <Icon name="x" size="sm" aria-hidden />
                        </button>
                    </div>
                    <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-0">
                        <CoachLineCtaLink cta={tip.cta} primary />
                        {tip.secondaryCta ? (
                            <CoachLineCtaLink cta={tip.secondaryCta} primary={false} />
                        ) : null}
                        {allTipsCount !== null ? (
                            <Link
                                href="/product/coach"
                                className="inline-flex min-h-11 items-center text-sm font-semibold text-fg-secondary hover:text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
                                {tDashboard('coach.all_tips', { count: allTipsCount })}
                            </Link>
                        ) : null}
                    </div>
                </li>
            );
        }
        const text = rowText(row);
        const href = 'href' in row ? row.href : null;
        return (
            <li key={row.kind} className={ROW}>
                <p className="min-w-0 text-sm text-pretty wrap-anywhere text-fg-secondary">
                    {text}
                </p>
                {href ? (
                    <Link
                        href={href}
                        aria-label={t('view_aria', { item: text })}
                        className={TEXT_LINK}>
                        {t('view')}
                        <span aria-hidden>›</span>
                    </Link>
                ) : null}
            </li>
        );
    }

    return (
        <section
            aria-labelledby={eyebrowId}
            className="rounded-2xl border border-line bg-surface p-5 shadow-md sm:p-6">
            <Typography as="p" variant="eyebrow" color="primary" id={eyebrowId}>
                {todo.isEmpty ? t('eyebrow_empty') : t('eyebrow', { count: todo.count })}
            </Typography>
            {travelNote ? (
                <Typography as="p" size="xs" color="muted" className="mt-1">
                    {travelNote}
                </Typography>
            ) : null}

            {todo.first ? (
                <div className="mt-2">
                    <NextMoveBody
                        move={todo.first}
                        titleId={titleId}
                        canAct={canAct}
                        canImport={canImport}
                        formatMonth={formatMonth}
                        onCloseMonth={onCloseMonth}
                    />
                </div>
            ) : null}

            {todo.isEmpty && todo.nextCheckDay ? (
                <div className="mt-2">
                    <Typography
                        as="h2"
                        size="sm"
                        weight="semibold"
                        className="text-pretty sm:text-xl">
                        {t('empty_title')}
                    </Typography>
                    <Typography as="p" size="sm" color="muted" className="mt-2 max-w-prose">
                        {tDashboard(
                            isEuro ? 'next_move.calm.title' : 'next_move.calm.title_other_currency',
                            { weekday: formatWeekday(todo.nextCheckDay) }
                        )}
                    </Typography>
                    <Link href="#jars" className={cn(TEXT_LINK, 'mt-1')}>
                        {tDashboard('next_move.calm.link')}
                    </Link>
                </div>
            ) : null}

            {todo.rows.length > 0 ? (
                <ul
                    className={cn(
                        'grid divide-y divide-line',
                        todo.first ? 'mt-4 border-t border-line pt-1' : 'mt-3'
                    )}>
                    {todo.rows.map(renderRow)}
                </ul>
            ) : null}
        </section>
    );
}
