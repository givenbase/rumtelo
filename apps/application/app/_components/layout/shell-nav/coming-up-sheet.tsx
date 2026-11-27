'use client';

import Link from 'next/link';

import type { MoneyProgress } from '@rumtelo/contracts';
import { useTranslations } from '@rumtelo/i18n';
import {
    Button,
    Icon,
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    Toggle,
    Typography,
    type IconName,
} from '@rumtelo/ui';

import { stageTrigger, type BoardStage } from '@/app/_lib/board-stage';
import { stageItemLabelKey, type StageItem } from '@/app/_lib/nav';
import { moneyPath } from '@/app/_lib/routes';
import { useShowAllSurfaces } from '@/app/_lib/use-show-all-surfaces';

const ITEM_ICON: Record<string, IconName> = {
    course: 'trending-up',
    goals: 'target',
    coach: 'sparkles',
    debt: 'credit-card',
    net_worth: 'landmark',
    learn: 'book-open',
    levels: 'trending-up',
};

export type ComingUpData = { stage: BoardStage; items: StageItem[] };

/**
 * You › Coming up: the next trigger in plain words, what it adds to the nav, and the
 * "Show everything now" switch. Bottom sheet on phones, side panel from `md`. Only for
 * writers below the full board; Practice preview and a VIEWER never open it.
 */
export function ComingUpSheet({
    open,
    onOpenChange,
    data,
    progress,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** The `coming_up` You row, or null once the board is fully shown. */
    data: ComingUpData | null;
    /** Only read for the SORTING trigger (numbers from the server). */
    progress: MoneyProgress | null;
}) {
    const t = useTranslations('pages.nav');
    const showAll = useShowAllSurfaces();
    const trigger = data ? stageTrigger(data.stage) : null;
    const next = progress?.next ?? null;

    function handleOpenChange(nextOpen: boolean) {
        onOpenChange(nextOpen);
        if (!nextOpen) showAll.reset();
    }

    return (
        <Sheet open={open} onOpenChange={handleOpenChange}>
            <SheetContent
                side="bottom"
                closeLabel={t('coming_up.close')}
                aria-describedby={undefined}
                className="max-h-[85dvh] gap-0 overflow-y-auto rounded-t-2xl pb-[env(safe-area-inset-bottom)] md:inset-x-auto md:inset-y-0 md:right-0 md:h-full md:max-h-none md:w-full md:max-w-md md:rounded-none md:border-t-0 md:border-l">
                <SheetHeader className="border-b border-line px-5 pt-5 pr-14 pb-4 text-left">
                    <SheetTitle className="text-xl leading-snug">{t('coming_up.title')}</SheetTitle>
                    <Typography as="p" size="sm" color="secondary" className="text-pretty">
                        {t('coming_up.lead')}
                    </Typography>
                </SheetHeader>

                {showAll.succeeded ? (
                    <div className="grid gap-4 px-5 py-5">
                        <p role="status" className="text-sm text-pretty text-fg">
                            {t('show_all.done')}
                        </p>
                        <Button
                            type="button"
                            className="h-12 w-full md:h-10 md:w-auto md:justify-self-start"
                            onClick={() => handleOpenChange(false)}>
                            {t('coming_up.close')}
                        </Button>
                    </div>
                ) : (
                    <>
                        {data && trigger ? (
                            <div className="grid gap-4 px-5 py-5">
                                <div className="grid gap-2">
                                    <Typography
                                        as="p"
                                        variant="eyebrow"
                                        color="primary"
                                        className="text-accent">
                                        {t('coming_up.next_eyebrow')}
                                    </Typography>
                                    <Typography
                                        as="h3"
                                        weight="semibold"
                                        className="text-base text-pretty">
                                        {trigger === 'sorting'
                                            ? t('coming_up.trigger.sorting', {
                                                  sorted: next?.sortedRemaining ?? 0,
                                                  days: next?.daysRemaining ?? 0,
                                              })
                                            : t(`coming_up.trigger.${trigger}`)}
                                    </Typography>
                                </div>
                                {trigger === 'week_check' ? (
                                    <WeekCheckAction onDone={() => handleOpenChange(false)} />
                                ) : null}
                                {trigger === 'sorting' ? (
                                    <TransactionsAction onDone={() => handleOpenChange(false)} />
                                ) : null}

                                <div className="grid gap-2">
                                    <Typography
                                        as="p"
                                        variant="eyebrow"
                                        color="muted"
                                        className="text-fg-muted">
                                        {t('coming_up.adds_eyebrow')}
                                    </Typography>
                                    <ul className="grid gap-1.5">
                                        {data.items.map(item => {
                                            const key =
                                                item.kind === 'levels' ? 'levels' : item.key;
                                            return (
                                                <li
                                                    key={key}
                                                    className="flex min-w-0 items-center gap-2.5 text-sm text-fg">
                                                    <Icon
                                                        name={ITEM_ICON[key] ?? 'sparkles'}
                                                        size="sm"
                                                        aria-hidden
                                                        className="shrink-0 text-accent"
                                                    />
                                                    <TranslatedItem item={item} />
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            </div>
                        ) : null}

                        <div className="grid gap-1 border-t border-line px-5 py-3">
                            <Toggle
                                checked={showAll.checked}
                                disabled={showAll.loading || showAll.pending}
                                label={t('show_all.label')}
                                hint={t(showAll.checked ? 'show_all.hint_on' : 'show_all.hint_off')}
                                onCheckedChange={showAll.set}
                            />
                            {showAll.error ? (
                                <div role="alert" className="flex flex-wrap items-center gap-2">
                                    <p className="min-w-0 text-sm text-pretty text-danger">
                                        {showAll.error}
                                    </p>
                                    <TryAgain onClick={() => showAll.set(true)} />
                                </div>
                            ) : null}
                        </div>
                        <p className="border-t border-line px-5 py-4 text-sm text-pretty text-fg-muted">
                            {t('coming_up.search_hint')}
                        </p>
                    </>
                )}
            </SheetContent>
        </Sheet>
    );
}

function TranslatedItem({ item }: { item: StageItem }) {
    const t = useTranslations();
    return <span className="min-w-0 text-pretty">{t(stageItemLabelKey(item))}</span>;
}

function TryAgain({ onClick }: { onClick: () => void }) {
    const t = useTranslations();
    return (
        <Button type="button" variant="secondary" size="sm" className="min-h-11" onClick={onClick}>
            {t('ui.button.actions.try_again')}
        </Button>
    );
}

function WeekCheckAction({ onDone }: { onDone: () => void }) {
    const t = useTranslations('pages.dashboard.next_move');
    return (
        <Button
            as={Link}
            href={moneyPath('week-check')}
            onClick={onDone}
            className="h-12 w-full md:h-10 md:w-auto md:justify-self-start">
            {t('week_check.cta')}
        </Button>
    );
}

function TransactionsAction({ onDone }: { onDone: () => void }) {
    const t = useTranslations('pages.dashboard.next_move');
    return (
        <Button
            as={Link}
            href={moneyPath('transactions')}
            onClick={onDone}
            className="h-12 w-full md:h-10 md:w-auto md:justify-self-start">
            {t('inbox.cta')}
        </Button>
    );
}
