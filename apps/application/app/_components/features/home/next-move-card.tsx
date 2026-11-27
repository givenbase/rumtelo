'use client';

import Link from 'next/link';

import { useTranslations } from '@rumtelo/i18n';
import { Button, Typography } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { CREATE_HREF } from '@/app/_lib/create-routes';
import type { TodoFirst } from '@/app/_lib/home-todo';
import { moneyPath } from '@/app/_lib/routes';

type NextMoveBodyProps = {
    move: TodoFirst;
    /** Id for the heading, so the To do card can label itself with it. */
    titleId: string;
    /** Writer (OWNER / MEMBER) and not a Practice preview. Read-only users get the text only. */
    canAct: boolean;
    /** The plan has statement import. */
    canImport: boolean;
    /** `YYYY-MM` to a month name. */
    formatMonth: (period: string) => string;
    onCloseMonth: (period: string) => void;
};

const PRIMARY_BUTTON = 'h-12 w-full sm:h-10 sm:w-auto';
const TEXT_LINK =
    'inline-flex min-h-11 items-center text-sm font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

/**
 * Home's next move: the first item of the To do card. Product state, not a Coach tip: it stays
 * with the Coach off. One primary button for writers; text only for a VIEWER or a Practice
 * preview. The calm state has no next move and is the To do card's empty state instead.
 */
export function NextMoveBody({
    move,
    titleId,
    canAct,
    canImport,
    formatMonth,
    onCloseMonth,
}: NextMoveBodyProps) {
    const t = useTranslations('pages.dashboard.next_move');

    let title: string;
    let body: string | null = null;
    let action: React.ReactNode = null;
    let secondary: React.ReactNode = null;

    switch (move.kind) {
        case 'CLOSE_PRIOR':
        case 'CLOSE_MONTH': {
            const month = formatMonth(move.month);
            title = canAct
                ? t('close_month.title', { month })
                : move.kind === 'CLOSE_PRIOR'
                  ? t('viewer.close_prior', { month })
                  : t('viewer.close_month', { month, days: Math.max(0, move.daysLeft) });
            action = canAct ? (
                <Button
                    type="button"
                    className={PRIMARY_BUTTON}
                    onClick={() => onCloseMonth(move.month)}>
                    {t('close_month.cta')}
                </Button>
            ) : null;
            break;
        }
        case 'NO_TRANSACTIONS': {
            if (!canAct) {
                title = t('viewer.no_transactions');
                break;
            }
            if (move.zeroIncome) {
                title = t('zero_income.title');
                action = (
                    <Button as={Link} href={CREATE_HREF.income} className={PRIMARY_BUTTON}>
                        {t('zero_income.cta')}
                    </Button>
                );
                break;
            }
            title = t('no_transactions.title');
            body = canImport ? t('no_transactions.body') : t('no_transactions.body_basic');
            action = (
                <Button as={Link} href={CREATE_HREF.tx} className={PRIMARY_BUTTON}>
                    {t('no_transactions.cta')}
                </Button>
            );
            secondary = canImport ? (
                <Link href={CREATE_HREF.importStatement} className={TEXT_LINK}>
                    {t('no_transactions.import')}
                </Link>
            ) : null;
            break;
        }
        case 'INBOX':
            title = canAct
                ? t('inbox.title', { count: move.count, minutes: move.minutes })
                : t('viewer.inbox', { count: move.count });
            action = canAct ? (
                <Button as={Link} href={moneyPath('transactions')} className={PRIMARY_BUTTON}>
                    {t('inbox.cta')}
                </Button>
            ) : null;
            break;
        case 'WEEK_CHECK':
            title = canAct ? t('week_check.title') : t('viewer.week_check');
            action = canAct ? (
                <Button as={Link} href={moneyPath('week-check')} className={PRIMARY_BUTTON}>
                    {t('week_check.cta')}
                </Button>
            ) : null;
            break;
    }

    return (
        <>
            <Typography
                as="h2"
                id={titleId}
                size="sm"
                weight="semibold"
                className="min-w-0 text-pretty wrap-anywhere sm:text-xl">
                {title}
            </Typography>
            {body ? (
                <Typography as="p" size="sm" color="muted" className="mt-2 max-w-prose">
                    {body}
                </Typography>
            ) : null}
            {action || secondary ? (
                <div
                    className={cn(
                        'mt-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4',
                        !secondary && 'items-stretch'
                    )}>
                    {action}
                    {secondary}
                </div>
            ) : null}
        </>
    );
}

/** Same footprint as the card, so Home doesn't jump when the dashboard arrives. */
export function NextMoveCardSkeleton() {
    return (
        <div
            aria-busy="true"
            className="grid gap-3 rounded-2xl border border-line bg-surface p-5 shadow-md sm:p-6">
            <div className="h-3 w-20 rounded bg-sunken" />
            <div className="h-5 w-3/4 rounded bg-sunken" />
            <div className="h-4 w-1/2 rounded bg-sunken" />
            <div className="h-12 w-full rounded-full bg-sunken sm:h-10 sm:w-40" />
        </div>
    );
}

export function NextMoveCardError({ onRetry }: { onRetry: () => void }) {
    const t = useTranslations('pages.dashboard.next_move');
    const tTodo = useTranslations('pages.dashboard.todo');
    const tUi = useTranslations();
    return (
        <section
            role="alert"
            className="grid justify-items-start gap-3 rounded-2xl border border-line bg-surface p-5 shadow-md sm:p-6">
            <Typography as="p" variant="eyebrow" color="primary">
                {tTodo('eyebrow_empty')}
            </Typography>
            <Typography as="p" size="sm" color="muted">
                {t('error')}
            </Typography>
            <Button type="button" variant="secondary" className="h-12 sm:h-10" onClick={onRetry}>
                {tUi('ui.button.actions.try_again')}
            </Button>
        </section>
    );
}
