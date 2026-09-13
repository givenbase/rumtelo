'use client';

import { apiQuery } from '@/app/_lib/api-hooks';
import { useMemo, useState } from 'react';

import type { GivingCause, GivingOrganisation } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { cn } from '@rumtelo/utils';

import {
    GIVING_CAUSES,
    GIVING_SIGNAL_TIER_ORDER,
    GIVING_SIGNAL_TIERS,
    givingCauseMeta,
    givingEvaluatorMeta,
} from '@/app/_lib/giving';
import { isLiveData } from '@/app/_lib/preview';
import { CoachMark } from '@/components/features/helpers';
import { useAuth } from '@/components/features/shell/auth-provider';

type GivingFinderProps = {
    /** Called with the organisation the household picked. */
    onPick: (organisation: GivingOrganisation) => void;
    /** Currently chosen counterparty, to mark the matching card. */
    selectedName?: string | null;
    /** Start expanded (e.g. on the Soul page) instead of behind the toggle. */
    defaultOpen?: boolean;
    className?: string;
};

/**
 * The Coach: "Where do you want to help?"
 * Cause chips → vetted organisations with their independent signals.
 * Rumtelo shows who checked them and what that check measures — nothing more.
 */
export function GivingFinder({
    onPick,
    selectedName,
    defaultOpen = false,
    className,
}: GivingFinderProps) {
    const { householdId } = useAuth();
    const live = isLiveData(householdId);
    const [open, setOpen] = useState(defaultOpen);
    const [cause, setCause] = useState<GivingCause | null>(null);

    const query = useLiveQuery(
        apiQuery.money.catalogs.givingOrganisations.list.queryOptions({
            input: { householdId: householdId! },
        }),
        [],
        live && open
    );
    const organisations = useMemo(() => query.data ?? [], [query.data]);

    const causesWithRows = useMemo(
        () =>
            GIVING_CAUSES.filter(meta =>
                organisations.some(organisation => organisation.causes.includes(meta.key))
            ),
        [organisations]
    );

    const shown = useMemo(
        () =>
            cause ? organisations.filter(organisation => organisation.causes.includes(cause)) : [],
        [organisations, cause]
    );

    const activeCause = cause ? givingCauseMeta(cause) : null;

    return (
        <div
            data-coach-guide="giving-finder"
            className={cn(
                'grid gap-3 rounded-2xl border border-accent/20 bg-surface p-4 ring-1 ring-accent/10',
                className
            )}>
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                    <CoachMark size="sm" />
                    <p className="font-mono text-[10px] font-bold tracking-[0.14em] text-accent uppercase">
                        Where do you want to help?
                    </p>
                </div>
                {!defaultOpen ? (
                    <button
                        type="button"
                        onClick={() => setOpen(previous => !previous)}
                        aria-expanded={open}
                        className="font-mono text-xs font-medium tracking-wide text-fg-muted uppercase hover:text-accent">
                        {open ? 'Hide' : 'Help me choose'}
                    </button>
                ) : null}
            </div>

            {!open ? (
                <p className="text-sm leading-relaxed text-fg-secondary">
                    Pick a cause, and see organisations that publish what they spend and what
                    changed — checked by people outside the organisation.
                </p>
            ) : (
                <>
                    <p className="text-sm leading-relaxed text-fg-secondary">
                        Pick a cause first. Each organisation shows who checked it and what that
                        check actually measures — you decide what counts.
                    </p>
                    <ul
                        className="flex flex-wrap gap-x-4 gap-y-1"
                        aria-label="How to read the badges">
                        {GIVING_SIGNAL_TIER_ORDER.map(key => (
                            <li
                                key={key}
                                className="flex items-center gap-1.5 font-mono text-[10px] text-fg-faint"
                                title={GIVING_SIGNAL_TIERS[key].line}>
                                <span
                                    className={cn(
                                        'inline-block size-2 rounded-full border',
                                        GIVING_SIGNAL_TIERS[key].className
                                    )}
                                    aria-hidden
                                />
                                {GIVING_SIGNAL_TIERS[key].label}
                            </li>
                        ))}
                    </ul>

                    <div className="flex flex-wrap gap-2" role="group" aria-label="Cause">
                        {causesWithRows.map(meta => {
                            const on = cause === meta.key;
                            return (
                                <button
                                    key={meta.key}
                                    type="button"
                                    aria-pressed={on}
                                    onClick={() =>
                                        setCause(previous =>
                                            previous === meta.key ? null : meta.key
                                        )
                                    }
                                    className={cn(
                                        'flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-xs transition-colors',
                                        on
                                            ? 'border-accent/40 bg-accent-soft text-accent'
                                            : 'border-line bg-raised text-fg-secondary hover:border-accent-hover hover:text-accent'
                                    )}>
                                    <span aria-hidden>{meta.icon}</span>
                                    {meta.label}
                                </button>
                            );
                        })}
                    </div>

                    {activeCause ? (
                        <p className="text-xs leading-relaxed text-fg-muted">{activeCause.line}</p>
                    ) : null}

                    {!live ? (
                        <p className="text-sm text-fg-muted">Sign in to see the list.</p>
                    ) : query.isLoading ? (
                        <p className="text-sm text-fg-muted">Loading the list…</p>
                    ) : causesWithRows.length === 0 ? (
                        <p className="text-sm text-fg-muted">
                            The list is empty right now. Type the organisation you know above — the
                            four checks still apply.
                        </p>
                    ) : cause && shown.length === 0 ? (
                        <p className="text-sm text-fg-muted">
                            Nothing on the list for this cause yet. Type the organisation you know
                            above — the four checks still apply.
                        </p>
                    ) : (
                        <ul className="grid gap-2">
                            {shown.map(organisation => (
                                <li key={organisation.key}>
                                    <GivingOrganisationCard
                                        organisation={organisation}
                                        selected={
                                            selectedName?.trim().toLowerCase() ===
                                            organisation.name.toLowerCase()
                                        }
                                        onPick={() => onPick(organisation)}
                                    />
                                </li>
                            ))}
                        </ul>
                    )}
                </>
            )}
        </div>
    );
}

function GivingOrganisationCard({
    organisation,
    selected,
    onPick,
}: {
    organisation: GivingOrganisation;
    selected: boolean;
    onPick: () => void;
}) {
    const where = [organisation.scope, organisation.country].filter(Boolean).join(' · ');
    return (
        <div
            className={cn(
                'grid gap-2.5 rounded-xl border bg-raised p-3.5 transition-colors',
                selected ? 'border-accent' : 'border-line'
            )}>
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="text-sm font-medium text-fg">{organisation.name}</p>
                    {where ? (
                        <p className="mt-0.5 font-mono text-[10px] tracking-wide text-fg-faint uppercase">
                            {where}
                        </p>
                    ) : null}
                </div>
                <button
                    type="button"
                    onClick={onPick}
                    className={cn(
                        'rounded-full border px-3 py-1.5 font-mono text-xs font-medium tracking-wide uppercase transition-colors',
                        selected
                            ? 'border-accent bg-accent text-on-accent'
                            : 'border-line-strong text-fg-muted hover:border-accent-hover hover:text-accent'
                    )}>
                    {selected ? '✓ Chosen' : 'Give here'}
                </button>
            </div>

            <p className="text-sm leading-relaxed text-fg-secondary">{organisation.summary}</p>

            <ul className="flex flex-wrap gap-1.5" aria-label="Independent signals">
                {organisation.signals.map(signal => {
                    const evaluator = givingEvaluatorMeta(signal.evaluator);
                    const tier = GIVING_SIGNAL_TIERS[evaluator?.tier ?? 'governance'];
                    const text = `${evaluator?.name ?? signal.evaluator} · ${signal.label}${
                        signal.year ? ` (${signal.year})` : ''
                    }`;
                    const chip = (
                        <span
                            className={cn(
                                'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px]',
                                tier.className
                            )}>
                            {evaluator?.tier === 'impact' ? '✓' : '·'} {text}
                        </span>
                    );
                    return (
                        <li
                            key={`${signal.evaluator}-${signal.label}`}
                            title={evaluator ? `${tier.label} — ${evaluator.measures}` : undefined}>
                            {signal.url ? (
                                <a
                                    href={signal.url}
                                    target="_blank"
                                    rel="noreferrer noopener"
                                    className="hover:opacity-80">
                                    {chip}
                                </a>
                            ) : (
                                chip
                            )}
                        </li>
                    );
                })}
            </ul>

            <div className="flex flex-wrap items-center justify-between gap-2">
                {organisation.reporting ? (
                    <p className="font-mono text-xs text-fg-faint">↺ {organisation.reporting}</p>
                ) : (
                    <span />
                )}
                <a
                    href={organisation.website}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="font-mono text-xs font-medium tracking-wide text-fg-muted uppercase hover:text-accent">
                    Website ↗
                </a>
            </div>
        </div>
    );
}
