'use client';

import {
    JAR_MAIN_KEY_BY_GROUP,
    JAR_ORDER_IN_GROUP,
    OPTIONAL_JAR_SHARE,
    isMainJarKey,
    type Jar,
    type JarGroup,
    type OptionalJarKey,
} from '@rumtelo/contracts';
import { useLocale, useTranslations } from '@rumtelo/i18n';
import { Button } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { formatShare } from '@/app/_lib/jar-group';
import { useJarName, useJarPurpose } from '@/app/_lib/use-jar-name';

/** What the refine block reads of a pot: enough for a name, a share and the turn-off request. */
export type RefineJar = Pick<Jar, 'id' | 'key' | 'name' | 'percentage'>;

/**
 * "Refine {group}": the optional pots of one group, each on or off. Turning one on takes its
 * share out of the group's main pot, so the group total never changes. The parent owns the
 * mutations and the confirmation for turning off; this block only shows the state and asks.
 */
export function JarsRefineGroup({
    group,
    groupTitle,
    groupShare,
    jars,
    canRefine,
    blockedByEdits,
    pendingKey,
    onTurnOn,
    onTurnOff,
    className,
}: {
    group: JarGroup;
    groupTitle: string;
    /** The group's total share as saved (integer or two decimals). */
    groupShare: number;
    /** Every pot the household has. */
    jars: readonly RefineJar[];
    /** Read-only roles see the state but no buttons. */
    canRefine: boolean;
    /** Unsaved percentage edits: turning pots on or off would clash with them. */
    blockedByEdits: boolean;
    /** The pot a request is running for, so only its button shows "working". */
    pendingKey: string | null;
    onTurnOn: (key: OptionalJarKey) => void;
    onTurnOff: (jar: RefineJar) => void;
    className?: string;
}) {
    const tGroups = useTranslations('features.money.groups');
    const tJars = useTranslations('features.money.jars');
    const tUi = useTranslations('ui.form');
    const locale = useLocale();
    const jarName = useJarName();
    const jarPurpose = useJarPurpose();

    const optionalKeys = JAR_ORDER_IN_GROUP[group].filter(
        key => !isMainJarKey(key)
    ) as OptionalJarKey[];
    const mainJar = jars.find(jar => jar.key === JAR_MAIN_KEY_BY_GROUP[group]);
    const presentOptional = optionalKeys.filter(key => jars.some(jar => jar.key === key));
    const refined = presentOptional.length > 0;
    const mainName = mainJar ? jarName(mainJar) : groupTitle;
    const potNames = new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' }).format(
        presentOptional.map(key => {
            const jar = jars.find(row => row.key === key);
            return jar ? jarName(jar) : tJars(`names.${key}`);
        })
    );
    const hint =
        blockedByEdits && tGroups.has('refine.save_first') ? tGroups('refine.save_first') : null;

    return (
        <div className={cn('grid gap-2 border-t border-line py-2.5', className)}>
            <div className="grid gap-0.5">
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                    <h4 className="min-w-0 text-xs font-semibold text-fg">
                        {tGroups('refine.title', { group: groupTitle })}
                    </h4>
                    {refined ? (
                        <span className="rounded-full border border-line bg-raised px-2 py-0.5 font-mono text-[11px] leading-snug whitespace-nowrap text-fg-muted">
                            {tGroups('refine.refined_badge')}
                        </span>
                    ) : null}
                </div>
                <p className="text-xs leading-snug text-fg-muted">
                    {tGroups('refine.intro', {
                        group: groupTitle,
                        percent: formatShare(groupShare, locale),
                    })}
                </p>
                <p className="text-xs leading-snug text-fg-muted">
                    {refined
                        ? tGroups('refine.main_renamed_hint', {
                              group: groupTitle,
                              main: mainName,
                              pot: potNames,
                          })
                        : tGroups('refine.not_refined_hint', { group: groupTitle })}
                </p>
            </div>

            <ul className="grid gap-2">
                {optionalKeys.map(key => {
                    const jar = jars.find(row => row.key === key) ?? null;
                    const isOn = jar !== null;
                    const name = jar ? jarName(jar) : tJars(`names.${key}`);
                    const nameId = `refine-name-${key}`;
                    const buttonId = `refine-action-${key}`;
                    const effect = isOn
                        ? tGroups('refine.turn_off_effect', {
                              share: formatShare(jar.percentage, locale),
                              main: mainName,
                          })
                        : tGroups('refine.turn_on_effect', {
                              share: formatShare(OPTIONAL_JAR_SHARE[key], locale),
                              main: mainName,
                              pot: name,
                              group: groupTitle,
                              percent: formatShare(groupShare, locale),
                          });
                    const working = pendingKey === key;
                    return (
                        <li
                            key={key}
                            className={cn(
                                'grid gap-2 rounded-lg border px-3 py-2.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center',
                                isOn
                                    ? 'border-accent/40 bg-accent-soft/40'
                                    : 'border-line bg-raised/40'
                            )}>
                            <div className="grid min-w-0 gap-0.5">
                                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                                    <span
                                        id={nameId}
                                        className="min-w-0 text-sm font-medium break-words text-fg">
                                        {name}
                                    </span>
                                    <span className="rounded-full border border-line bg-surface px-2 py-0.5 font-mono text-[11px] leading-snug whitespace-nowrap text-fg-muted">
                                        {isOn
                                            ? tGroups('refine.turned_on')
                                            : tGroups('refine.optional_label')}
                                    </span>
                                </div>
                                <p className="text-xs leading-snug text-fg-muted">
                                    {jarPurpose(key)}
                                </p>
                                <p className="text-xs leading-snug text-fg-secondary">{effect}</p>
                            </div>
                            {canRefine ? (
                                <Button
                                    id={buttonId}
                                    type="button"
                                    variant={isOn ? 'secondary' : 'primary'}
                                    size="sm"
                                    // The button's own text plus the pot name: "Turn off Daily".
                                    aria-labelledby={`${buttonId} ${nameId}`}
                                    disabled={blockedByEdits || pendingKey !== null}
                                    aria-busy={working}
                                    className="min-h-11 w-full sm:w-auto"
                                    onClick={() => (jar ? onTurnOff(jar) : onTurnOn(key))}>
                                    {working
                                        ? tUi('working')
                                        : isOn
                                          ? tGroups('refine.turn_off')
                                          : tGroups('refine.turn_on')}
                                </Button>
                            ) : null}
                        </li>
                    );
                })}
            </ul>
            {canRefine && hint ? <p className="text-xs leading-snug text-warning">{hint}</p> : null}
        </div>
    );
}
