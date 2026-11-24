'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useWatch } from 'react-hook-form';

import {
    JAR_MAIN_KEY_BY_GROUP,
    JAR_ORDER_IN_GROUP,
    OPTIONAL_JAR_SHARE,
    isMainJarKey,
    type JarGroup,
    type OptionalJarKey,
} from '@rumtelo/contracts';
import { useLocale, useTranslations } from '@rumtelo/i18n';
import { Button, Input } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { api } from '@/app/_lib/api';
import { useApiError } from '@/app/_lib/api-error-messages';
import { apiQuery } from '@/app/_lib/api-hooks';
import { formatShare, jarsInGroup, splitGroupAnchor } from '@/app/_lib/jar-group';
import {
    groupSavedShares,
    groupSplitPayload,
    groupSplitStatus,
    parseShareInput,
    sameShares,
} from '@/app/_lib/jar-group-split';
import { isLiveData } from '@/app/_lib/preview';
import { settingsHref } from '@/app/_lib/settings-tabs';
import { useJarName, useJarPurpose } from '@/app/_lib/use-jar-name';
import { useAuth } from '@/components/features/shell/auth-provider';
import { useHouseholdShell } from '@/components/features/shell/household-shell-context';

import { PotSplitCard } from './pot-split-card';
import { usePotRefineControls } from './use-pot-refine-controls';

type GroupSplitValues = { pct: Record<string, number> };

const focusRing =
    'outline-none focus-visible:ring-2 focus-visible:ring-accent/25 focus-visible:ring-offset-2 focus-visible:ring-offset-surface';

/**
 * The pots board, one group selected: change how the group's share is divided between its pots
 * and turn its optional pots on or off, without a trip to Settings. The group total is fixed:
 * edits only move share between this group's pots, and Save is open only when they add up to
 * the saved total. Saving sends every pot of the household once (pots in other groups keep their
 * saved share), the same call as Settings › Pots. Only mounted for roles that may change pots.
 * Shares come from the pot list, not the board's dashboard figures: a month on the board may be
 * priced at another month's split, and the list is what the server stores today.
 */
export function PotsGroupSplit({ group }: { group: JarGroup }) {
    const t = useTranslations('features.money.groups');
    const tPage = useTranslations('pages.settings');
    const tAction = useTranslations('ui.button.actions');
    const locale = useLocale();
    const tJars = useTranslations('features.money.jars');
    const jarName = useJarName();
    const jarPurpose = useJarPurpose();
    const queryClient = useQueryClient();
    const { householdId } = useAuth();
    const { showToast } = useHouseholdShell();
    const apiError = useApiError();
    const live = isLiveData(householdId);
    const { jars, jarsLoaded, pendingKey, onTurnOn, onTurnOff, dialog } = usePotRefineControls();

    const savedShares = useMemo(() => groupSavedShares(jars, group), [jars, group]);
    const form = useForm<GroupSplitValues>({ defaultValues: { pct: {} } });
    const editsWatch = useWatch({ control: form.control, name: 'pct' });
    const edits = editsWatch ?? {};

    // Follow the server while there are no unsaved edits (first load, a pot turned on or off, a
    // refetch from elsewhere); unsaved edits are kept.
    const previousSavedRef = useRef<Record<string, number> | null>(null);
    useEffect(() => {
        const previous = previousSavedRef.current;
        previousSavedRef.current = savedShares;
        if (Object.keys(savedShares).length === 0) return;
        if (previous === null || sameShares(previous, form.getValues('pct'))) {
            form.reset({ pct: savedShares });
        }
    }, [form, savedShares]);

    // A link to this block (`?group=basis#split-basis`) may arrive before the pot list has
    // loaded, so the browser's own hash scroll finds nothing: scroll once the block exists.
    const anchor = splitGroupAnchor(group);
    const scrolledToHash = useRef(false);
    useEffect(() => {
        if (scrolledToHash.current || !jarsLoaded) return;
        scrolledToHash.current = true;
        if (window.location.hash.slice(1) === anchor) {
            document.getElementById(anchor)?.scrollIntoView({ block: 'start' });
        }
    }, [jarsLoaded, anchor]);

    const saveSplit = useMutation({
        mutationFn: async () => {
            if (!householdId) throw new Error('No household');
            return api.money.jars.updateSplit({
                householdId,
                // Every pot the household has, once: the server rejects a missing or extra pot.
                split: groupSplitPayload(jars, group, edits),
            });
        },
        // Awaiting the refetch keeps Save busy until the board shows the new shares.
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: apiQuery.money.jars.list.key() }),
                queryClient.invalidateQueries({ queryKey: apiQuery.money.jars.balances.key() }),
                queryClient.invalidateQueries({ queryKey: apiQuery.money.dashboard.key() }),
            ]);
            showToast(tPage('toasts.split_saved'), 'success');
        },
        onError: (error: unknown) => showToast(apiError(error), 'error'),
    });

    if (!jarsLoaded) return null;
    const groupJars = jarsInGroup(jars, group);
    if (groupJars.length === 0) return null;

    const title = t(`${group}.title`);
    const headingId = `${anchor}-title`;
    const introId = `${anchor}-intro`;
    const status = groupSplitStatus(jars, group, edits);
    const staysPercent = formatShare(status.savedBasisPoints / 100, locale);
    const differencePercent = formatShare(Math.abs(status.differenceBasisPoints) / 100, locale);
    const canEdit = groupJars.length >= 2;
    const mainJar = jars.find(jar => jar.key === JAR_MAIN_KEY_BY_GROUP[group]);
    const mainName = mainJar ? jarName(mainJar) : title;
    const blockedByEdits = status.changed;

    return (
        <section
            id={anchor}
            aria-labelledby={headingId}
            className="grid min-w-0 scroll-mt-24 gap-3 rounded-2xl border border-line bg-surface p-3.5 @xl:p-4">
            <header className="grid min-w-0 gap-0.5">
                <h3 id={headingId} className="min-w-0 text-base font-semibold text-fg">
                    {t('split.title', { group: title })}
                </h3>
                <p id={introId} className="text-xs leading-snug text-fg-muted">
                    {canEdit
                        ? t('split.intro', { group: title, percent: staysPercent })
                        : t('refine.not_refined_hint', { group: title })}
                </p>
            </header>

            {/* One list: every pot this group can have. A pot that is on shows its share, the
                main pot is always on, an optional pot has its on/off button next to it. */}
            <ul className="grid gap-2">
                {JAR_ORDER_IN_GROUP[group].map(key => {
                    const jar = jars.find(row => row.key === key) ?? null;
                    const isMain = isMainJarKey(key);
                    const optionalKey = isMain ? null : (key as OptionalJarKey);
                    const name = jar ? jarName(jar) : tJars(`names.${key}`);
                    const inputId = `pots-split-${key}`;
                    const working = pendingKey === key;
                    const effect = !optionalKey
                        ? null
                        : jar
                          ? t('refine.turn_off_effect', {
                                share: formatShare(jar.percentage, locale),
                                main: mainName,
                            })
                          : t('refine.turn_on_effect', {
                                share: formatShare(OPTIONAL_JAR_SHARE[optionalKey], locale),
                                main: mainName,
                                pot: name,
                                group: title,
                                percent: staysPercent,
                            });
                    return (
                        <PotSplitCard
                            key={key}
                            nameId={`pots-split-name-${key}`}
                            inputId={jar && canEdit ? inputId : undefined}
                            name={name}
                            badge={
                                isMain
                                    ? t('refine.always_on')
                                    : jar
                                      ? t('refine.turned_on')
                                      : t('refine.optional_label')
                            }
                            purpose={jarPurpose(key)}
                            effect={effect}
                            isOn={jar !== null}
                            share={
                                jar ? (
                                    <span className="flex shrink-0 items-center gap-1.5">
                                        {canEdit ? (
                                            <Input
                                                id={inputId}
                                                type="number"
                                                min={0}
                                                max={100}
                                                step={0.5}
                                                value={edits[jar.id] ?? jar.percentage}
                                                disabled={saveSplit.isPending}
                                                aria-describedby={introId}
                                                onChange={event =>
                                                    form.setValue('pct', {
                                                        ...edits,
                                                        [jar.id]: parseShareInput(
                                                            event.target.value
                                                        ),
                                                    })
                                                }
                                                className="w-20 text-right tabular-nums"
                                            />
                                        ) : (
                                            // One pot holds the whole group: nothing to move yet.
                                            <span className="text-sm font-semibold text-fg tabular-nums">
                                                {formatShare(jar.percentage, locale)}
                                            </span>
                                        )}
                                        <span aria-hidden className="w-4 text-sm text-fg-muted">
                                            %
                                        </span>
                                    </span>
                                ) : null
                            }
                            action={
                                optionalKey
                                    ? {
                                          id: `pots-split-action-${key}`,
                                          label: working
                                              ? tPage('working')
                                              : jar
                                                ? t('refine.turn_off')
                                                : t('refine.turn_on'),
                                          busy: working,
                                          disabled: blockedByEdits || pendingKey !== null,
                                          onClick: () =>
                                              jar ? onTurnOff(jar) : onTurnOn(optionalKey),
                                      }
                                    : null
                            }
                        />
                    );
                })}
            </ul>

            {canEdit ? (
                <>
                    <div
                        role="status"
                        aria-live="polite"
                        className="grid min-w-0 gap-0.5 font-mono text-xs">
                        <span className="font-medium text-fg">
                            {t('split.stays', { group: title, percent: staysPercent })}
                        </span>
                        {status.balanced ? null : (
                            <span className="text-warning">
                                {t(
                                    status.differenceBasisPoints > 0 ? 'split.over' : 'split.short',
                                    { percent: differencePercent }
                                )}
                            </span>
                        )}
                        {blockedByEdits ? (
                            <span className="text-fg-muted">{t('refine.save_first')}</span>
                        ) : null}
                    </div>

                    <div className="flex flex-wrap justify-end gap-2">
                        {status.changed ? (
                            <Button
                                type="button"
                                variant="ghost"
                                className="min-h-11"
                                disabled={saveSplit.isPending}
                                onClick={() => form.reset({ pct: savedShares })}>
                                {tAction('cancel')}
                            </Button>
                        ) : null}
                        <Button
                            type="button"
                            className="min-h-11"
                            disabled={
                                !live || !status.changed || !status.balanced || saveSplit.isPending
                            }
                            aria-busy={saveSplit.isPending}
                            onClick={() => saveSplit.mutate()}>
                            {saveSplit.isPending ? tPage('working') : tPage('save')}
                        </Button>
                    </div>
                </>
            ) : null}

            <Link
                href={`${settingsHref('jars')}#${anchor}`}
                className={cn(
                    'inline-flex min-h-11 min-w-0 items-center justify-self-start rounded-md px-1 text-xs font-semibold text-accent underline-offset-2 hover:underline',
                    focusRing
                )}>
                <span className="min-w-0 break-words">{t('split.settings_link')}</span>
            </Link>

            {dialog}
        </section>
    );
}
