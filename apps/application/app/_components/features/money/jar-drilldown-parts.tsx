'use client';

import Link from 'next/link';

import { cn, categoryVariance } from '@rumtelo/utils';

import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';

import { JarProgressBar } from './jar-progress-bar';

export interface JarCategory {
    id: string;
    name: string;
    budgeted: number;
    actual: number;
}

export interface JarDrilldownItem {
    id?: string;
    /** JarKey — used to build the jar detail href when `href` is omitted. */
    key?: string;
    name: string;
    subtitle: string;
    icon: string;
    color: string;
    allocated: number;
    /** Primary leftover after spend + fixed commitments. */
    available: number;
    spent?: number;
    committedOut?: number;
    overspent: boolean;
    categories: JarCategory[];
    /** Jar detail page; when set, the row navigates and the chevron expands categories. */
    href?: string;
}

function JarDrilldownBody({
    jar,
    spent,
    committedOut,
}: {
    jar: JarDrilldownItem;
    spent: number;
    committedOut: number;
}) {
    const { formatMoney } = useHouseholdCurrency();
    return (
        <>
            <span className="flex min-w-0 flex-1 items-center gap-2.5">
                <span className="grid size-7.5 shrink-0 place-items-center rounded-lg border border-line bg-raised text-sm">
                    {jar.icon}
                </span>
                <span className="grid min-w-0 gap-0.5">
                    <span className="truncate text-sm text-fg">{jar.name}</span>
                    <span className="truncate font-mono text-xs tracking-wide text-fg-faint">
                        {jar.subtitle}
                    </span>
                </span>
            </span>

            <JarProgressBar
                allocated={jar.allocated}
                spent={spent}
                committedOut={committedOut}
                colorClass={jar.color}
                className="hidden sm:block"
                trackClassName="h-2"
            />

            <span className="shrink-0 text-right tabular-nums">
                <div className={cn('font-mono text-sm', jar.overspent ? 'text-danger' : 'text-fg')}>
                    {formatMoney(jar.available)}
                </div>
                <div className="font-mono text-xs text-fg-faint">
                    of {formatMoney(jar.allocated)}
                </div>
            </span>
        </>
    );
}

export function JarDrilldownTrigger({
    jar,
    open,
    onToggle,
}: {
    jar: JarDrilldownItem;
    open: boolean;
    onToggle: () => void;
}) {
    const spent = jar.spent ?? 0;
    const committedOut = jar.committedOut ?? Math.max(0, jar.allocated - spent - jar.available);
    const href = jar.href;

    const rowClass =
        'flex items-center gap-3 sm:grid sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] sm:gap-3';
    const shellClass =
        'grid w-full gap-2 rounded-lg px-1.5 py-2.5 text-left transition-colors outline-none hover:bg-raised focus-visible:ring-2 focus-visible:ring-accent/25';

    if (href) {
        return (
            <div className="flex items-stretch gap-0.5">
                <Link
                    href={href}
                    aria-label={`Open ${jar.name}`}
                    className={cn(shellClass, 'min-w-0 flex-1')}>
                    <span className={rowClass}>
                        <JarDrilldownBody jar={jar} spent={spent} committedOut={committedOut} />
                    </span>
                    <JarProgressBar
                        allocated={jar.allocated}
                        spent={spent}
                        committedOut={committedOut}
                        colorClass={jar.color}
                        className="sm:hidden"
                        trackClassName="h-2"
                    />
                </Link>
                <button
                    type="button"
                    onClick={onToggle}
                    aria-expanded={open}
                    aria-label={
                        open ? `Hide ${jar.name} categories` : `Show ${jar.name} categories`
                    }
                    className="grid shrink-0 place-items-center rounded-lg px-2.5 transition-colors outline-none hover:bg-raised focus-visible:ring-2 focus-visible:ring-accent/25">
                    <span
                        className={cn(
                            'text-xs text-fg-faint transition-transform duration-200',
                            open && 'rotate-180'
                        )}>
                        ▾
                    </span>
                </button>
            </div>
        );
    }

    return (
        <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            aria-label={jar.name}
            className={shellClass}>
            <span className="flex items-center gap-3 sm:grid sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto_auto] sm:gap-3">
                <JarDrilldownBody jar={jar} spent={spent} committedOut={committedOut} />
                <span
                    className={cn(
                        'shrink-0 text-xs text-fg-faint transition-transform duration-200',
                        open && 'rotate-180'
                    )}>
                    ▾
                </span>
            </span>

            <JarProgressBar
                allocated={jar.allocated}
                spent={spent}
                committedOut={committedOut}
                colorClass={jar.color}
                className="sm:hidden"
                trackClassName="h-2"
            />
        </button>
    );
}

export function JarCategoryTable({ categories }: { categories: JarCategory[] }) {
    const { formatMoney } = useHouseholdCurrency();
    if (categories.length === 0) {
        return (
            <p className="border-t border-line py-1.5 text-sm text-fg-faint">No categories yet.</p>
        );
    }

    return (
        <>
            <ul className="grid gap-2 border-t border-line pt-2 sm:hidden">
                {categories.map(category => {
                    const { diff, over } = categoryVariance(category.budgeted, category.actual);
                    return (
                        <li
                            key={category.id}
                            className="grid gap-1.5 rounded-lg border border-line bg-raised px-3 py-2.5">
                            <span className="text-sm text-fg-secondary">{category.name}</span>
                            <span className="flex flex-wrap justify-between gap-x-3 gap-y-1 font-mono text-xs tabular-nums">
                                <span className="text-fg-muted">
                                    Planned {formatMoney(category.budgeted)}
                                </span>
                                <span className="text-fg">
                                    Spent {formatMoney(category.actual)}
                                </span>
                                <span className={over ? 'text-danger' : 'text-success'}>
                                    {formatMoney(diff, { signed: true })}
                                </span>
                            </span>
                        </li>
                    );
                })}
            </ul>

            <div className="hidden overflow-x-auto sm:block">
                <table className="w-full min-w-0 border-collapse">
                    <thead>
                        <tr className="font-mono text-xs font-medium tracking-wide text-fg-faint uppercase">
                            <th className="pb-2 text-left font-medium">Category</th>
                            <th className="w-20 pb-2 text-right font-medium">Planned</th>
                            <th className="w-20 pb-2 text-right font-medium">Spent</th>
                            <th className="w-24 pb-2 text-right font-medium">Over / under</th>
                        </tr>
                    </thead>
                    <tbody>
                        {categories.map(category => {
                            const { diff, over } = categoryVariance(
                                category.budgeted,
                                category.actual
                            );
                            return (
                                <tr key={category.id} className="border-t border-line">
                                    <td className="py-1.5 text-sm text-fg-secondary">
                                        {category.name}
                                    </td>
                                    <td className="py-1.5 text-right font-mono text-sm text-fg-muted tabular-nums">
                                        {formatMoney(category.budgeted)}
                                    </td>
                                    <td className="py-1.5 text-right font-mono text-sm text-fg tabular-nums">
                                        {formatMoney(category.actual)}
                                    </td>
                                    <td
                                        className={cn(
                                            'py-1.5 text-right font-mono text-sm tabular-nums',
                                            over ? 'text-danger' : 'text-success'
                                        )}>
                                        {formatMoney(diff, { signed: true })}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </>
    );
}
