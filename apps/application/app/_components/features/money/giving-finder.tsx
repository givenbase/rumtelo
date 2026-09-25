'use client';

import { apiQuery } from '@/app/_lib/api-hooks';
import { useMemo, useState } from 'react';

import type { GivingCause, GivingOrganisation } from '@rumtelo/contracts';
import { CoachFeatureId, JarKey, GivingSignalTier } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { useTranslations } from '@rumtelo/i18n';
import { VendorMark } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import {
    GIVING_CAUSE_CATALOG,
    GIVING_SIGNAL_TIER_ORDER,
    givingCauseCopy,
    givingEvaluatorMeta,
    givingSignalTiers,
} from '@/app/_lib/giving';
import { catalogMarkChrome } from '@/app/_lib/party-mark-chrome';
import { isLiveData } from '@/app/_lib/preview';
import { useJarCatalog } from '@/app/_lib/use-jar-catalog';
import { partyMark } from '@/app/_lib/vendor-brands';
import { CoachFeatureGate } from '@/components/features/helpers/coach-feature-gate';
import { CoachMark } from '@/components/features/helpers/helper-mark';
import { useAuth } from '@/components/features/shell/auth-provider';

type GivingFinderProps = {
    /** Called with the organisation the household picked. */
    onPick: (organisation: GivingOrganisation) => void;
    /** Currently chosen counterparty name — marks the matching card. */
    selectedName?: string | null;
    /** Stable catalog key — preferred over selectedName for deep-links. */
    selectedKey?: string | null;
    /** Prefill the cause chip (e.g. from a Give goal form). */
    initialCause?: GivingCause | null;
    /** Start expanded (e.g. on the Soul page) instead of behind the toggle. */
    defaultOpen?: boolean;
    className?: string;
};

/**
 * The Coach — features.money.giving_finder.title
 * Cause chips → vetted organisations with their independent signals.
 * Rumtelo shows who checked them and what that check measures — nothing more.
 */
export function GivingFinder({
    onPick,
    selectedName,
    selectedKey,
    initialCause = null,
    defaultOpen = false,
    className,
}: GivingFinderProps) {
    const t = useTranslations('features.money.giving_finder');
    const tForm = useTranslations('ui.form');
    const tRoot = useTranslations();
    const signalTiers = givingSignalTiers(tRoot);
    const { householdId } = useAuth();
    const live = isLiveData(householdId);
    const [open, setOpen] = useState(defaultOpen);
    const [cause, setCause] = useState<GivingCause | null>(initialCause);
    const [causeHydratedForKey, setCauseHydratedForKey] = useState<string | null>(null);
    const [seenInitialCause, setSeenInitialCause] = useState(initialCause);

    if (initialCause !== seenInitialCause) {
        setSeenInitialCause(initialCause);
        if (initialCause && cause !== initialCause) setCause(initialCause);
    }

    const query = useLiveQuery(
        apiQuery.money.catalogs.givingOrganisations.list.queryOptions({
            input: { householdId: householdId! },
        }),
        [],
        live && open
    );
    const organisations = useMemo(() => query.data ?? [], [query.data]);

    const selectedOrg = useMemo(() => {
        if (selectedKey) {
            const byKey = organisations.find(org => org.key === selectedKey);
            if (byKey) return byKey;
        }
        if (selectedName?.trim()) {
            const needle = selectedName.trim().toLowerCase();
            return organisations.find(org => org.name.toLowerCase() === needle) ?? null;
        }
        return null;
    }, [organisations, selectedKey, selectedName]);

    // Deep-link: open the cause that contains the pre-selected org (adjust during render).
    if (
        selectedOrg &&
        causeHydratedForKey !== selectedOrg.key &&
        selectedOrg.causes[0] &&
        cause !== selectedOrg.causes[0]
    ) {
        setCauseHydratedForKey(selectedOrg.key);
        setCause(selectedOrg.causes[0]);
    }

    const causesWithRows = useMemo(
        () =>
            GIVING_CAUSE_CATALOG.filter(meta =>
                organisations.some(organisation => organisation.causes.includes(meta.key))
            ),
        [organisations]
    );

    const shown = useMemo(
        () =>
            cause ? organisations.filter(organisation => organisation.causes.includes(cause)) : [],
        [organisations, cause]
    );

    const activeCause = cause ? givingCauseCopy(tRoot, cause) : null;

    return (
        <CoachFeatureGate feature={CoachFeatureId.GIVING_FINDER}>
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
                            {t('title')}
                        </p>
                    </div>
                    {!defaultOpen ? (
                        <button
                            type="button"
                            onClick={() => setOpen(previous => !previous)}
                            aria-expanded={open}
                            className="font-mono text-xs font-medium tracking-wide text-fg-muted uppercase hover:text-accent">
                            {open ? t('hide') : t('help_choose')}
                        </button>
                    ) : null}
                </div>

                {!open ? (
                    <p className="text-sm leading-relaxed text-fg-secondary">
                        {t('collapsed_lead')}
                    </p>
                ) : (
                    <>
                        <p className="text-sm leading-relaxed text-fg-secondary">
                            {t('expanded_lead')}
                        </p>
                        <ul
                            className="flex flex-wrap gap-x-4 gap-y-1"
                            aria-label={tForm('aria.read_badges')}>
                            {GIVING_SIGNAL_TIER_ORDER.map(key => (
                                <li
                                    key={key}
                                    className="flex items-center gap-1.5 font-mono text-[10px] text-fg-faint"
                                    title={signalTiers[key].line}>
                                    <span
                                        className={cn(
                                            'inline-block size-2 rounded-full border',
                                            signalTiers[key].className
                                        )}
                                        aria-hidden
                                    />
                                    {signalTiers[key].label}
                                </li>
                            ))}
                        </ul>

                        <div
                            className="flex flex-wrap gap-2"
                            role="group"
                            aria-label={tForm('aria.cause')}>
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
                                        {givingCauseCopy(tRoot, meta.key).name}
                                    </button>
                                );
                            })}
                        </div>

                        {activeCause ? (
                            <p className="text-xs leading-relaxed text-fg-muted">
                                {activeCause.line}
                            </p>
                        ) : null}

                        {!live ? (
                            <p className="text-sm text-fg-muted">{t('sign_in')}</p>
                        ) : query.isLoading ? (
                            <p className="text-sm text-fg-muted">{t('loading')}</p>
                        ) : causesWithRows.length === 0 ? (
                            <p className="text-sm text-fg-muted">{t('empty_list')}</p>
                        ) : cause && shown.length === 0 ? (
                            <p className="text-sm text-fg-muted">{t('empty_cause')}</p>
                        ) : (
                            <ul className="grid gap-2">
                                {shown.map(organisation => (
                                    <li key={organisation.key}>
                                        <GivingOrganisationCard
                                            organisation={organisation}
                                            selected={
                                                selectedOrg?.key === organisation.key ||
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
        </CoachFeatureGate>
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
    const t = useTranslations('features.money.giving_finder');
    const tForm = useTranslations('ui.form');
    const tRoot = useTranslations();
    const signalTiers = givingSignalTiers(tRoot);
    const { byKey: jarByKey } = useJarCatalog();
    const where = [organisation.scope, organisation.country].filter(Boolean).join(' · ');
    const mark = partyMark(
        {
            name: organisation.name,
            website: organisation.website,
        },
        catalogMarkChrome({
            jarKey: JarKey.GIVE,
            jarByKey,
        })
    );
    return (
        <div
            className={cn(
                'grid gap-2.5 rounded-xl border bg-raised p-3.5 transition-colors',
                selected ? 'border-accent' : 'border-line'
            )}>
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex min-w-0 items-start gap-2.5">
                    <VendorMark
                        name={mark.name}
                        src={mark.src}
                        fallbackIcon={mark.fallbackIcon}
                        tone={mark.tone}
                        size={28}
                        className="mt-0.5"
                    />
                    <div className="min-w-0">
                        <p className="text-sm font-medium text-fg">{organisation.name}</p>
                        {where ? (
                            <p className="mt-0.5 font-mono text-[10px] tracking-wide text-fg-faint uppercase">
                                {where}
                            </p>
                        ) : null}
                    </div>
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
                    {selected ? t('chosen') : t('give_here')}
                </button>
            </div>

            <p className="text-sm leading-relaxed text-fg-secondary">{organisation.description}</p>

            <ul className="flex flex-wrap gap-1.5" aria-label={tForm('aria.independent_signals')}>
                {organisation.signals.map(signal => {
                    const evaluator = givingEvaluatorMeta(signal.evaluator);
                    const tier = signalTiers[evaluator?.tier ?? GivingSignalTier.GOVERNANCE];
                    const text = `${evaluator?.name ?? signal.evaluator} · ${signal.label}${
                        signal.year ? ` (${signal.year})` : ''
                    }`;
                    const chip = (
                        <span
                            className={cn(
                                'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px]',
                                tier.className
                            )}>
                            {evaluator?.tier === GivingSignalTier.IMPACT ? '✓' : '·'} {text}
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
                    {t('website')}
                </a>
            </div>
        </div>
    );
}
