'use client';

import type { Category, JarBalance } from '@rumtelo/contracts';
import { cn, categoryVariance } from '@rumtelo/utils';

import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';

import { JarProgressBar } from './jar-progress-bar';

/** Jar row for dashboard drilldown — balance DTO + chrome / navigation. */
export type JarDrilldownItem = Pick<
    JarBalance,
    | 'id'
    | 'key'
    | 'name'
    | 'allocated'
    | 'available'
    | 'spent'
    | 'committedOut'
    | 'overspent'
    | 'categories'
> & {
    color: string;
    /** Display strings resolved from jar + catalog at the call site. */
    subtitle: string;
    icon: string;
    href?: string;
    /** Live-month allocated for current→selected delta when period-traveling. */
    baselineAllocated?: number | null;
};

export type JarCategory = Pick<Category, 'id' | 'name' | 'budgeted' | 'actual'>;

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
    const showDelta =
        jar.baselineAllocated !== null &&
        jar.baselineAllocated !== undefined &&
        jar.baselineAllocated !== jar.allocated;
    const delta = showDelta ? jar.allocated - (jar.baselineAllocated ?? 0) : 0;

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
                {showDelta ? (
                    <>
                        <div
                            className={cn(
                                'font-mono text-sm',
                                jar.overspent ? 'text-danger' : 'text-fg'
                            )}>
                            <span className="text-fg-faint">
                                {formatMoney(jar.baselineAllocated ?? 0)}
                            </span>
                            <span className="mx-1 text-fg-faint">→</span>
                            {formatMoney(jar.allocated)}
                        </div>
                        <div className="font-mono text-xs text-success">
                            {delta >= 0 ? '+' : ''}
                            {formatMoney(delta)}
                        </div>
                    </>
                ) : (
                    <>
                        <div
                            className={cn(
                                'font-mono text-sm',
                                jar.overspent ? 'text-danger' : 'text-fg'
                            )}>
                            {formatMoney(jar.available)}
                        </div>
                        <div className="font-mono text-xs text-fg-faint">
                            of {formatMoney(jar.allocated)}
                        </div>
                    </>
                )}
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

    return (
        <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            aria-label={open ? `Hide ${jar.name} categories` : `Show ${jar.name} categories`}
            className="grid w-full gap-2 px-1.5 py-2.5 text-left transition-colors outline-none hover:bg-raised focus-visible:ring-2 focus-visible:ring-accent/25 focus-visible:ring-inset">
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
