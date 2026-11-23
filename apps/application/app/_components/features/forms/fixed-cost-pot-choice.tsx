'use client';

import { useId } from 'react';

import { JAR_MAIN_KEY_BY_GROUP, JarGroup, type JarKey } from '@rumtelo/contracts';
import { useTranslations } from '@rumtelo/i18n';
import { cn } from '@rumtelo/utils';

/** The two answers to "must or choose": Basics carries what must be paid, Free what is chosen. */
export type PotChoice = 'must' | 'choose';

/**
 * Which answer a pot stands for. Only the two main pots do: any other pot (Giving, Education)
 * was picked by hand and highlights neither answer.
 */
export function potChoiceFor(jarKey: JarKey | null | undefined): PotChoice | null {
    if (jarKey === JAR_MAIN_KEY_BY_GROUP[JarGroup.BASIS]) return 'must';
    if (jarKey === JAR_MAIN_KEY_BY_GROUP[JarGroup.FREE]) return 'choose';
    return null;
}

/**
 * "Must or choose?" for a bill. Basics is for what MUST be paid; a recurring cost the household
 * chooses (streaming, gym) is paid from Free. The answer only picks the pot: nothing extra is
 * stored. A quiet link reveals the full pot picker for the rare other pot (a donation).
 */
export function FixedCostPotChoice({
    value,
    mustPot,
    choosePot,
    landsIn,
    showOtherPot,
    disabled,
    onChange,
    onOtherPot,
}: {
    /** The answer matching the selected pot; null when the pot was picked by hand. */
    value: PotChoice | null;
    /** Display name of the pot a "must" bill lands in. */
    mustPot: string;
    /** Display name of the pot a "choose" bill lands in. */
    choosePot: string;
    /** Display name of the pot the bill is paid from now; null while none is selected. */
    landsIn: string | null;
    /** Offer the "other pot" link (false once the full picker is already shown). */
    showOtherPot: boolean;
    disabled?: boolean;
    onChange: (next: PotChoice) => void;
    onOtherPot: () => void;
}) {
    const t = useTranslations('features.money.must_or_choose');
    const questionId = useId();
    const groupName = useId();

    const options: ReadonlyArray<{
        id: PotChoice;
        label: string;
        hint: string;
    }> = [
        { id: 'must', label: t('must'), hint: t('must_hint', { pot: mustPot }) },
        { id: 'choose', label: t('choose'), hint: t('choose_hint', { pot: choosePot }) },
    ];

    return (
        <div className="grid gap-2">
            <p
                id={questionId}
                className="font-mono text-[10px] font-semibold tracking-wider text-fg-muted uppercase">
                {t('question')}
            </p>
            {/* Real radios (sr-only input + label card): arrow keys and a group name come for free. */}
            <div
                role="radiogroup"
                aria-labelledby={questionId}
                className="grid gap-2 sm:grid-cols-2">
                {options.map(option => {
                    const selected = value === option.id;
                    return (
                        <label
                            key={option.id}
                            className={cn(
                                'relative flex min-h-11 min-w-0 cursor-pointer flex-col items-start gap-0.5 rounded-2xl border px-3 py-2.5 text-left transition-colors',
                                'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent',
                                selected
                                    ? 'border-accent bg-accent/15 text-accent'
                                    : 'border-line bg-raised text-fg hover:border-accent/60',
                                disabled && 'pointer-events-none opacity-50'
                            )}>
                            <input
                                type="radio"
                                name={groupName}
                                value={option.id}
                                checked={selected}
                                disabled={disabled}
                                onChange={() => onChange(option.id)}
                                className="sr-only"
                            />
                            <span className="text-sm font-medium">{option.label}</span>
                            <span
                                className={cn(
                                    'text-xs leading-snug text-pretty text-fg-muted',
                                    selected && 'text-accent/80'
                                )}>
                                {option.hint}
                            </span>
                        </label>
                    );
                })}
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-x-2">
                {landsIn ? (
                    <p className="min-w-0 text-xs text-pretty text-fg-muted">
                        {t('lands_in', { pot: landsIn })}
                    </p>
                ) : null}
                {showOtherPot ? (
                    <button
                        type="button"
                        disabled={disabled}
                        onClick={onOtherPot}
                        className="min-h-11 rounded-md px-1 text-xs font-semibold text-accent underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
                        {t('other_pot')}
                    </button>
                ) : null}
            </div>
        </div>
    );
}
