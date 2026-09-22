'use client';

import { useEffect, useId, useRef, useState } from 'react';

import { cn } from '@rumtelo/utils';

import { LocaleFlag } from './locale-flags';
import { LOCALE_DISPLAY_NAMES, LOCALE_SHORT_LABELS } from './locale-metadata';
import {
    activeLocales,
    isLocaleSwitcherVisible,
    type IntlLocale,
    useLocale,
    usePathname,
    useRouter,
    useTranslations,
} from './next-intl';

/** `inverse` = light chrome on dark / black surfaces. */
export type LocaleChromeTone = 'default' | 'inverse';

type LocaleSwitcherProps = {
    className?: string;
    /** Classes for the trigger only (not the dropdown items). */
    triggerClassName?: string;
    /**
     * Visual tone for the trigger. Use `inverse` on black / photo / aside
     * backgrounds where default muted tokens disappear.
     */
    tone?: LocaleChromeTone;
    /** Accessible name override. */
    'aria-label'?: string;
};

const triggerToneClass: Record<LocaleChromeTone, string> = {
    default: 'border-line text-fg-secondary hover:bg-raised hover:text-fg',
    inverse: 'border-white/30 text-white hover:border-white/55 hover:bg-white/10 hover:text-white',
};

/**
 * Shared EN/NL dropdown for website + application.
 * Trigger: flag + short code. Menu: flag + full name.
 */
export function LocaleSwitcher({
    className,
    triggerClassName,
    tone = 'default',
    'aria-label': ariaLabel,
}: LocaleSwitcherProps) {
    const router = useRouter();
    const pathname = usePathname();
    const t = useTranslations();
    const activeLocale = useLocale() as IntlLocale;
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const listId = useId();

    useEffect(() => {
        if (!open) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false);
        };
        const onPointer = (event: MouseEvent | TouchEvent) => {
            const target = event.target as Node | null;
            if (target && rootRef.current && !rootRef.current.contains(target)) {
                setOpen(false);
            }
        };
        document.addEventListener('keydown', onKey);
        document.addEventListener('mousedown', onPointer);
        document.addEventListener('touchstart', onPointer);
        return () => {
            document.removeEventListener('keydown', onKey);
            document.removeEventListener('mousedown', onPointer);
            document.removeEventListener('touchstart', onPointer);
        };
    }, [open]);

    if (!isLocaleSwitcherVisible || activeLocales.length <= 1) {
        return null;
    }

    const current = activeLocales.find(code => code === activeLocale) ?? activeLocales[0];
    if (!current) {
        return null;
    }

    const triggerLabel =
        ariaLabel ?? t('ui.theme.language_named', { name: LOCALE_DISPLAY_NAMES[current] });

    function handleChange(code: IntlLocale) {
        if (code === activeLocale) {
            setOpen(false);
            return;
        }
        router.replace(pathname, { locale: code });
        setOpen(false);
    }

    return (
        <div className={cn('relative', className)} ref={rootRef}>
            <button
                type="button"
                data-slot="locale-switcher-trigger"
                aria-expanded={open}
                aria-haspopup="listbox"
                aria-controls={listId}
                aria-label={triggerLabel}
                title={triggerLabel}
                onClick={() => setOpen(previous => !previous)}
                className={cn(
                    'inline-flex h-9 w-auto min-w-9 items-center justify-center gap-1.5 rounded-lg border px-2.5 font-mono text-xs font-semibold tracking-wide uppercase transition-colors',
                    triggerToneClass[tone],
                    triggerClassName
                )}>
                <LocaleFlag locale={current} className="size-4 shrink-0" />
                <span>{LOCALE_SHORT_LABELS[current]}</span>
            </button>

            {open ? (
                <ul
                    id={listId}
                    role="listbox"
                    aria-label={t('ui.theme.language')}
                    className="absolute top-[calc(100%+6px)] right-0 z-50 w-max min-w-[10rem] overflow-hidden rounded-xl border border-line bg-surface p-1.5 text-fg shadow-xl">
                    {activeLocales.map(code => {
                        const selected = code === activeLocale;
                        return (
                            <li key={code} role="option" aria-selected={selected}>
                                <button
                                    type="button"
                                    data-slot="locale-switcher-option"
                                    onClick={() => handleChange(code)}
                                    className={cn(
                                        'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium whitespace-nowrap transition-colors',
                                        selected ? 'bg-raised text-fg' : 'text-fg hover:bg-raised'
                                    )}>
                                    <LocaleFlag locale={code} className="size-4 shrink-0" />
                                    <span className="normal-case">
                                        {LOCALE_DISPLAY_NAMES[code]}
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            ) : null}
        </div>
    );
}
