'use client';

import Link from 'next/link';

import { Typography } from '@rumtelo/ui';
import { useTranslations } from '@rumtelo/i18n';
import { cn } from '@rumtelo/utils';

import { CREATE_HREF, type CreateKind } from '@/app/_lib/create-routes';
import { useAppShell } from '@/components/features/shell/app-shell-context';
import {
    CREATE_KIND_CAPABILITY,
    usePlanCapabilities,
} from '@/components/features/shell/use-plan-capabilities';

const QUICK_ITEMS: { labelKey: string; kind: CreateKind }[] = [
    { labelKey: 'pages.shell.quick_add.transaction', kind: 'tx' },
    { labelKey: 'pages.shell.quick_add.fixed_cost', kind: 'fixed' },
    { labelKey: 'pages.shell.quick_add.debt', kind: 'debt' },
    { labelKey: 'pages.shell.quick_add.goal', kind: 'goal' },
    { labelKey: 'pages.shell.quick_add.income', kind: 'income' },
    { labelKey: 'pages.shell.quick_add.training', kind: 'session' },
    { labelKey: 'pages.shell.quick_add.asset', kind: 'asset' },
    { labelKey: 'pages.shell.quick_add.move_money', kind: 'move' },
];

export function QuickAddFab() {
    const t = useTranslations();
    const tQuick = useTranslations('pages.shell.quick_add');
    const { quickOpen, toggleQuick, setQuickOpen } = useAppShell();
    const { isCapabilityLocked } = usePlanCapabilities();

    return (
        <>
            {quickOpen && (
                <div
                    data-quick
                    className="fixed right-4 bottom-36 left-4 z-45 grid max-w-sm animate-rise gap-1 rounded-2xl border border-line-strong bg-surface p-3.5 shadow-xl md:right-6 md:bottom-28 md:left-auto md:w-full">
                    <Typography
                        as="p"
                        variant="eyebrow"
                        weight="semibold"
                        color="muted"
                        className="mb-1 text-fg-faint">
                        {t('pages.shell.quick_add.title')}
                    </Typography>
                    {QUICK_ITEMS.map(item => {
                        const capabilityKey = CREATE_KIND_CAPABILITY[item.kind];
                        const locked = capabilityKey ? isCapabilityLocked(capabilityKey) : false;
                        return (
                            <Link
                                key={item.kind}
                                href={CREATE_HREF[item.kind]}
                                onClick={() => setQuickOpen(false)}
                                className={
                                    locked
                                        ? 'rounded-lg px-3 py-2.5 text-left text-sm text-fg-muted opacity-55 transition-colors hover:bg-raised'
                                        : 'rounded-lg px-3 py-2.5 text-left text-sm text-fg transition-colors hover:bg-raised'
                                }>
                                {locked && (
                                    <span aria-hidden className="mr-1 text-xs">
                                        🔒
                                    </span>
                                )}
                                {t(item.labelKey)}
                            </Link>
                        );
                    })}
                </div>
            )}

            <div
                data-fab
                className="fixed right-4 bottom-23 z-45 flex flex-col items-end gap-3 md:right-6 md:bottom-6">
                <button
                    type="button"
                    data-fabbtn
                    onClick={toggleQuick}
                    className={cn(
                        'group flex items-center rounded-full border-0 bg-linear-to-br from-accent to-accent-hover text-on-accent shadow-glow transition-[padding,gap,transform,filter] duration-200 hover:-translate-y-0.5 hover:brightness-105 active:scale-95',
                        quickOpen
                            ? 'gap-2.5 px-3.5 py-3 sm:px-4'
                            : 'gap-2 p-2.5 pr-3 hover:gap-2.5 hover:px-3.5 hover:py-3 focus-visible:gap-2.5 focus-visible:px-3.5 focus-visible:py-3 sm:hover:px-4'
                    )}
                    aria-label={quickOpen ? tQuick('close_aria') : tQuick('open_aria')}
                    aria-expanded={quickOpen}
                    aria-keyshortcuts="Meta+K Control+K">
                    <span className="grid size-6.5 shrink-0 place-items-center rounded-lg bg-on-accent/20 text-lg leading-none">
                        {quickOpen ? '×' : '+'}
                    </span>
                    <span
                        className={cn(
                            'overflow-hidden text-sm font-semibold tracking-tight whitespace-nowrap transition-[max-width,opacity] duration-200',
                            quickOpen
                                ? 'max-w-28 opacity-100'
                                : 'max-w-0 opacity-0 group-hover:max-w-28 group-hover:opacity-100 group-focus-visible:max-w-28 group-focus-visible:opacity-100'
                        )}>
                        {quickOpen ? tQuick('close') : tQuick('fab_label')}
                    </span>
                    <span className="shrink-0 rounded-md bg-on-accent/15 px-1.75 py-1 font-mono text-xs font-medium tracking-wide">
                        ⌘K
                    </span>
                </button>
            </div>
        </>
    );
}
