'use client';

import type { ReactNode } from 'react';

import Link from 'next/link';

import { useLocale, useTranslations } from '@rumtelo/i18n';
import { DropdownMenuItem, Icon, type IconName } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { activeMoreRowKey, type MoreRow } from '@/app/_lib/nav';
import { PlanKey, planAmountLabel, planLabel } from '@/app/_lib/plan';
import type { LockPlan } from '@/components/features/shell/lock-card';

export type MoreRowsVariant = 'menu' | 'sheet';

export type MoreRowActions = {
    /** Called after any row is chosen so the menu or sheet can close. */
    onNavigate: () => void;
    onHelp: () => void;
    onPlanGains: (plan: LockPlan) => void;
    onExitPreview: () => void;
};

const ROW_BASE =
    'flex w-full min-w-0 items-center gap-3 rounded-xl px-3 text-left text-sm text-fg outline-none transition-colors hover:bg-raised focus-visible:bg-raised focus-visible:ring-2 focus-visible:ring-accent/40';

/** In the desktop menu a row is a Radix menu item (arrow keys, typeahead); in the sheet it is plain. */
function RowShell({ variant, children }: { variant: MoreRowsVariant; children: ReactNode }) {
    if (variant === 'menu') return <DropdownMenuItem asChild>{children}</DropdownMenuItem>;
    return children;
}

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
 * The More rows, already filtered and ordered by `buildNav`. Shared by the desktop
 * menu and the phone sheet, so both always agree. Every row has a text label, icons
 * are decorative, and the active page row carries `aria-current="page"`.
 */
export function MoreRows({
    rows,
    pathname,
    variant,
    actions,
}: {
    rows: readonly MoreRow[];
    pathname: string;
    variant: MoreRowsVariant;
    actions: MoreRowActions;
}) {
    const t = useTranslations();
    const locale = useLocale();
    const activeKey = activeMoreRowKey(pathname);
    const height = variant === 'sheet' ? 'min-h-12' : 'min-h-11';

    return (
        <>
            {rows.map(row => {
                switch (row.kind) {
                    case 'exit_preview':
                        return (
                            <RowShell key="exit_preview" variant={variant}>
                                <Link
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
                                        {t('pages.nav.more.back_to_practice')}
                                    </span>
                                </Link>
                            </RowShell>
                        );
                    case 'link': {
                        const active = activeKey === row.key;
                        return (
                            <RowShell key={row.key} variant={variant}>
                                <Link
                                    href={row.href}
                                    aria-current={active ? 'page' : undefined}
                                    onClick={actions.onNavigate}
                                    className={cn(ROW_BASE, height, active && 'bg-accent-soft')}>
                                    <RowIcon name={row.icon} />
                                    <span className="min-w-0 flex-1 truncate">
                                        {t(row.labelKey)}
                                    </span>
                                    {row.badgeKey === 'preview' ? (
                                        <span className="shrink-0 rounded-full border border-line px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wide text-fg-muted uppercase">
                                            {t('pages.nav.more.preview_badge')}
                                        </span>
                                    ) : null}
                                    <Chevron />
                                </Link>
                            </RowShell>
                        );
                    }
                    case 'plan_gains': {
                        const label = planLabel(row.plan, t);
                        return (
                            <RowShell key={`gains_${row.plan}`} variant={variant}>
                                <button
                                    type="button"
                                    aria-haspopup="dialog"
                                    onClick={() => actions.onPlanGains(row.plan)}
                                    className={cn(
                                        ROW_BASE,
                                        'my-1 min-h-14 border border-accent/30 bg-accent-soft py-2'
                                    )}>
                                    <span className="grid min-w-0 flex-1 gap-0.5">
                                        <span className="font-medium text-accent">
                                            {t('pages.nav.more.with_plan', { plan: label })}
                                            <span className="ml-1.5 font-normal text-fg-muted">
                                                {t('pages.nav.more.with_plan_price', {
                                                    plan: label,
                                                    price: planAmountLabel(row.plan, locale) ?? '',
                                                })}
                                            </span>
                                        </span>
                                        <span className="text-xs text-fg-secondary">
                                            {row.plan === PlanKey.PLUS
                                                ? t('pages.nav.more.with_plus_line')
                                                : t('pages.nav.more.with_max_line')}
                                        </span>
                                    </span>
                                    <Chevron />
                                </button>
                            </RowShell>
                        );
                    }
                    case 'help':
                        return (
                            <RowShell key="help" variant={variant}>
                                <button
                                    type="button"
                                    aria-haspopup="dialog"
                                    onClick={() => {
                                        actions.onNavigate();
                                        actions.onHelp();
                                    }}
                                    className={cn(ROW_BASE, height)}>
                                    <RowIcon name="circle-help" />
                                    <span className="min-w-0 flex-1 truncate">
                                        {t('pages.nav.more.help')}
                                    </span>
                                </button>
                            </RowShell>
                        );
                    case 'practice':
                        return (
                            <RowShell key="practice" variant={variant}>
                                <Link
                                    href={row.href}
                                    onClick={() => {
                                        actions.onExitPreview();
                                        actions.onNavigate();
                                    }}
                                    className={cn(ROW_BASE, height)}>
                                    <RowIcon name="briefcase" />
                                    <span className="min-w-0 flex-1 truncate">
                                        {t('pages.nav.more.go_to_practice')}
                                    </span>
                                    <Chevron />
                                </Link>
                            </RowShell>
                        );
                }
            })}
        </>
    );
}
