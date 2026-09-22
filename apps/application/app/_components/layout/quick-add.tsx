'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { useLiveQuery } from '@rumtelo/hooks';
import { Typography } from '@rumtelo/ui';
import { useTranslations } from '@rumtelo/i18n';
import { cn } from '@rumtelo/utils';

import { CREATE_HREF, type CreateKind } from '@/app/_lib/create-routes';
import { apiQuery } from '@/app/_lib/api-hooks';
import { NAV_GROUPS } from '@/app/_lib/nav';
import { isLiveData } from '@/app/_lib/preview';
import { productPath } from '@/app/_lib/routes';
import { useAppShell } from '@/components/features/shell/app-shell-context';
import { useAuth } from '@/components/features/shell/auth-provider';
import {
    CREATE_KIND_CAPABILITY,
    usePlanCapabilities,
} from '@/components/features/shell/use-plan-capabilities';

const QUICK_ITEMS: { labelKey: string; kind: CreateKind; search: string }[] = [
    { labelKey: 'pages.shell.quick_add.transaction', kind: 'tx', search: 'transaction expense' },
    {
        labelKey: 'pages.shell.quick_add.fixed_cost',
        kind: 'fixed',
        search: 'fixed cost bill rent huur',
    },
    { labelKey: 'pages.shell.quick_add.debt', kind: 'debt', search: 'debt' },
    { labelKey: 'pages.shell.quick_add.goal', kind: 'goal', search: 'goal' },
    { labelKey: 'pages.shell.quick_add.income', kind: 'income', search: 'income' },
    { labelKey: 'pages.shell.quick_add.training', kind: 'session', search: 'training sport' },
    { labelKey: 'pages.shell.quick_add.asset', kind: 'asset', search: 'asset' },
    { labelKey: 'pages.shell.quick_add.move_money', kind: 'move', search: 'move jar' },
];

type PaletteMode = 'ask' | 'add';

export function QuickAddFab() {
    const t = useTranslations();
    const tQuick = useTranslations('pages.shell.quick_add');
    const router = useRouter();
    const { quickOpen, toggleQuick, setQuickOpen } = useAppShell();
    const { isCapabilityLocked } = usePlanCapabilities();
    const { householdId } = useAuth();
    const live = isLiveData(householdId);
    const [mode, setMode] = useState<PaletteMode>('ask');
    const [query, setQuery] = useState('');

    const sessionQuery = useLiveQuery(
        apiQuery.coach.session.queryOptions({
            input: { householdId: householdId! },
        }),
        {
            householdId: householdId ?? '',
            period: '',
            week: '',
            steps: [],
            totalAvailable: 0,
            quiet: true,
        },
        live && quickOpen
    );

    const session = sessionQuery.data;
    const hasDueSteps = (session?.totalAvailable ?? 0) > 0;
    const nextStep = session?.steps[0] ?? null;
    const queryText = query.trim().toLowerCase();

    const navHits = useMemo(() => {
        if (mode !== 'ask' || !queryText) return [];
        const hits: { href: string; label: string }[] = [];
        for (const group of NAV_GROUPS) {
            for (const child of group.children) {
                const label = t(child.labelKey);
                const hay = `${label} ${child.href}`.toLowerCase();
                if (hay.includes(queryText)) hits.push({ href: child.href, label });
            }
        }
        return hits.slice(0, 8);
    }, [mode, queryText, t]);

    const coachHits = useMemo(() => {
        if (mode !== 'ask' || !queryText) return [];
        const steps = session?.steps ?? [];
        return steps
            .filter(step => {
                const hay = `${step.prompt} ${step.id} ${step.portal}`.toLowerCase();
                if (queryText.includes('gratis') || queryText.includes('gratitude')) {
                    return step.payload.type === 'gratitude';
                }
                if (
                    queryText.includes('huur') ||
                    queryText.includes('rent') ||
                    queryText.includes('bill')
                ) {
                    return step.payload.type === 'due_bill';
                }
                return hay.includes(queryText);
            })
            .slice(0, 5);
    }, [mode, queryText, session?.steps]);

    const addHits = useMemo(() => {
        if (mode !== 'add') return [];
        if (!queryText) return QUICK_ITEMS;
        return QUICK_ITEMS.filter(item => {
            const label = t(item.labelKey).toLowerCase();
            return label.includes(queryText) || item.search.includes(queryText);
        });
    }, [mode, queryText, t]);
    const openCoachStep = (stepId?: string) => {
        setQuickOpen(false);
        setQuery('');
        const href = stepId
            ? `${productPath('coach')}?step=${encodeURIComponent(stepId)}`
            : productPath('coach');
        router.push(href);
    };

    return (
        <>
            {quickOpen && (
                <div
                    data-quick
                    className="fixed right-4 bottom-36 left-4 z-45 grid max-w-sm animate-rise gap-2 rounded-2xl border border-line-strong bg-surface p-3.5 shadow-xl md:right-6 md:bottom-28 md:left-auto md:w-full">
                    <div className="mb-1 flex gap-1 rounded-xl bg-raised p-1">
                        <button
                            type="button"
                            onClick={() => setMode('ask')}
                            className={cn(
                                'flex-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold tracking-wide uppercase transition-colors',
                                mode === 'ask'
                                    ? 'bg-surface text-fg shadow-sm'
                                    : 'text-fg-muted hover:text-fg'
                            )}>
                            {tQuick('mode_ask')}
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('add')}
                            className={cn(
                                'flex-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold tracking-wide uppercase transition-colors',
                                mode === 'add'
                                    ? 'bg-surface text-fg shadow-sm'
                                    : 'text-fg-muted hover:text-fg'
                            )}>
                            {tQuick('mode_add')}
                        </button>
                    </div>

                    <input
                        value={query}
                        onChange={event => setQuery(event.target.value)}
                        placeholder={
                            mode === 'ask' ? tQuick('ask_placeholder') : tQuick('add_placeholder')
                        }
                        className="w-full rounded-xl border border-line bg-raised px-3 py-2 text-sm outline-none focus:border-accent"
                    />

                    {mode === 'ask' ? (
                        <div className="grid gap-1">
                            {!queryText && nextStep ? (
                                <button
                                    type="button"
                                    onClick={() => openCoachStep(nextStep.id)}
                                    className="rounded-lg px-3 py-2.5 text-left text-sm text-fg transition-colors hover:bg-raised">
                                    <span className="block text-[0.65rem] font-semibold tracking-wide text-fg-faint uppercase">
                                        {tQuick('next_step')}
                                    </span>
                                    {nextStep.prompt}
                                </button>
                            ) : null}
                            {!queryText ? (
                                <button
                                    type="button"
                                    onClick={() => openCoachStep()}
                                    className="rounded-lg px-3 py-2.5 text-left text-sm font-medium text-accent transition-colors hover:bg-raised">
                                    {tQuick('open_coach')}
                                </button>
                            ) : null}
                            {coachHits.map(step => (
                                <button
                                    key={step.id}
                                    type="button"
                                    onClick={() => openCoachStep(step.id)}
                                    className="rounded-lg px-3 py-2.5 text-left text-sm text-fg transition-colors hover:bg-raised">
                                    {step.prompt}
                                </button>
                            ))}
                            {navHits.map(hit => (
                                <Link
                                    key={hit.href}
                                    href={hit.href}
                                    onClick={() => setQuickOpen(false)}
                                    className="rounded-lg px-3 py-2.5 text-left text-sm text-fg transition-colors hover:bg-raised">
                                    {hit.label}
                                </Link>
                            ))}
                            {queryText && coachHits.length === 0 && navHits.length === 0 ? (
                                <Typography as="p" size="sm" color="muted" className="px-3 py-2">
                                    {tQuick('no_matches')}
                                </Typography>
                            ) : null}
                        </div>
                    ) : (
                        <div className="grid gap-1">
                            <Typography
                                as="p"
                                variant="eyebrow"
                                weight="semibold"
                                color="muted"
                                className="mb-1 text-fg-faint">
                                {tQuick('title')}
                            </Typography>
                            {addHits.map(item => {
                                const capabilityKey = CREATE_KIND_CAPABILITY[item.kind];
                                const locked = capabilityKey
                                    ? isCapabilityLocked(capabilityKey)
                                    : false;
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
                            {addHits.length === 0 ? (
                                <Typography as="p" size="sm" color="muted" className="px-3 py-2">
                                    {tQuick('no_matches')}
                                </Typography>
                            ) : null}
                        </div>
                    )}
                </div>
            )}

            <div
                data-fab
                className="fixed right-4 bottom-23 z-45 flex flex-col items-end gap-3 md:right-6 md:bottom-6">
                <button
                    type="button"
                    data-fabbtn
                    onClick={() => {
                        if (!quickOpen) {
                            setMode(hasDueSteps ? 'ask' : 'add');
                            setQuery('');
                        }
                        toggleQuick();
                    }}
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
