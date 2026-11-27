'use client';

import Link from 'next/link';

import { useLocale, useTranslations } from '@rumtelo/i18n';
import { Icon, type IconName } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { stageTrigger } from '@/app/_lib/board-stage';
import { activeYouRowKey, type YouRow } from '@/app/_lib/nav';

export type YouRowActions = {
    /** Called after any row is chosen so the menu or sheet can close. */
    onNavigate: () => void;
    onHelp: () => void;
    onExitPreview: () => void;
    /** Opens the Coming up sheet (the menu or You sheet closes first). */
    onComingUp: () => void;
};

const ROW_BASE =
    'flex w-full min-w-0 items-center gap-3 rounded-xl px-3 text-left text-sm text-fg outline-none transition-colors hover:bg-raised focus-visible:bg-raised focus-visible:ring-2 focus-visible:ring-accent/40';

function RowIcon({ name }: { name: IconName }) {
    return (
        <span
            aria-hidden
            className="grid size-8 shrink-0 place-items-center rounded-lg bg-sunken text-accent">
            <Icon name={name} size="sm" />
        </span>
    );
}

function Chevron() {
    return <Icon name="chevron-right" size="sm" aria-hidden className="shrink-0 text-fg-faint" />;
}

/**
 * The You rows (The Coach, Why Rumtelo, Settings, Help, Practice, Coming up), already
 * filtered and ordered by `buildNav`. Shared by the desktop avatar menu and the phone sheet,
 * so both always agree. Staging-only products sit under a small "Preview" heading. Every
 * row has a text label, icons are decorative, and the active page row carries
 * `aria-current="page"`.
 */
export function YouRows({
    rows,
    pathname,
    actions,
    tall,
}: {
    rows: readonly YouRow[];
    pathname: string;
    actions: YouRowActions;
    /** 48 px rows in the phone sheet, 44 px in the desktop menu. */
    tall?: boolean;
}) {
    const t = useTranslations();
    const locale = useLocale();
    const activeKey = activeYouRowKey(pathname);
    const height = tall ? 'min-h-12' : 'min-h-11';
    const firstPreviewIndex = rows.findIndex(row => row.kind === 'link' && row.badgeKey);

    return (
        <>
            {rows.map((row, index) => {
                switch (row.kind) {
                    case 'exit_preview':
                        return (
                            <Link
                                key="exit_preview"
                                href={row.href}
                                onClick={() => {
                                    actions.onExitPreview();
                                    actions.onNavigate();
                                }}
                                className={cn(
                                    ROW_BASE,
                                    height,
                                    'bg-accent-soft font-medium text-accent'
                                )}>
                                <Icon name="arrow-left" size="sm" aria-hidden />
                                <span className="min-w-0 flex-1">
                                    {t('pages.nav.you.back_to_practice')}
                                </span>
                            </Link>
                        );
                    case 'link': {
                        const active = activeKey === row.key;
                        return (
                            <div key={row.key} className="contents">
                                {index === firstPreviewIndex ? (
                                    <p className="px-3 pt-3 pb-1 font-mono text-[10px] font-semibold tracking-wide text-fg-muted uppercase">
                                        {t('pages.nav.you.preview_group')}
                                    </p>
                                ) : null}
                                <Link
                                    href={row.href}
                                    aria-current={active ? 'page' : undefined}
                                    onClick={actions.onNavigate}
                                    className={cn(ROW_BASE, height, active && 'bg-accent-soft')}>
                                    <RowIcon name={row.icon} />
                                    <span className="min-w-0 flex-1 truncate">
                                        {t(row.labelKey)}
                                    </span>
                                    <Chevron />
                                </Link>
                            </div>
                        );
                    }
                    case 'help':
                        return (
                            <button
                                key="help"
                                type="button"
                                aria-haspopup="dialog"
                                onClick={() => {
                                    actions.onNavigate();
                                    actions.onHelp();
                                }}
                                className={cn(ROW_BASE, height)}>
                                <RowIcon name="circle-help" />
                                <span className="min-w-0 flex-1 truncate">
                                    {t('pages.nav.you.help')}
                                </span>
                            </button>
                        );
                    case 'coming_up': {
                        const trigger = stageTrigger(row.stage) ?? 'week_check';
                        const next = t(`pages.nav.coming_up.row_next.${trigger}`);
                        const nextLower = next.charAt(0).toLocaleLowerCase(locale) + next.slice(1);
                        return (
                            <button
                                key="coming_up"
                                type="button"
                                aria-haspopup="dialog"
                                aria-label={t('pages.nav.coming_up.row_aria', { next: nextLower })}
                                onClick={() => {
                                    actions.onNavigate();
                                    actions.onComingUp();
                                }}
                                className={cn(ROW_BASE, tall ? 'min-h-14' : 'min-h-11', 'py-2')}>
                                <RowIcon name="calendar-clock" />
                                <span className="grid min-w-0 flex-1 gap-0.5">
                                    <span className="font-semibold">
                                        {t('pages.nav.coming_up.row')}
                                    </span>
                                    <span className="text-xs text-pretty text-fg-muted">
                                        {next}
                                    </span>
                                </span>
                                <Chevron />
                            </button>
                        );
                    }
                    case 'practice':
                        return (
                            <Link
                                key="practice"
                                href={row.href}
                                onClick={() => {
                                    actions.onExitPreview();
                                    actions.onNavigate();
                                }}
                                className={cn(ROW_BASE, height)}>
                                <RowIcon name="briefcase" />
                                <span className="min-w-0 flex-1 truncate">
                                    {t('pages.nav.you.go_to_practice')}
                                </span>
                                <Chevron />
                            </Link>
                        );
                }
            })}
        </>
    );
}
