import type { ComponentType, SVGProps } from 'react';

import { fromIntlLocale, Locale, type IntlLocale } from '@rumtelo/contracts';
import { cn } from '@rumtelo/utils';

type FlagProps = SVGProps<SVGSVGElement>;

function FlagEn({ className, ...props }: FlagProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className} {...props}>
            <path fill="#B22234" d="M0 0h24v24H0z" />
            <path
                fill="#fff"
                d="M0 1.85h24V3.7H0zm0 3.7h24v1.85H0zm0 3.7h24v1.85H0zm0 3.7h24v1.85H0zm0 3.7h24v1.85H0zm0 3.7h24V24H0z"
            />
            <path fill="#3C3B6E" d="M0 0h10.5v10.5H0z" />
            <path
                fill="#fff"
                d="M1.1 1.5h.9v.9h-.9zm2.2 0h.9v.9h-.9zm2.2 0h.9v.9h-.9zm2.2 0h.9v.9h-.9zm-4.4 1.8h.9v.9h-.9zm2.2 0h.9v.9h-.9zm2.2 0h.9v.9h-.9zm2.2 0h.9v.9h-.9zm-6.6 1.8h.9v.9h-.9zm2.2 0h.9v.9h-.9zm2.2 0h.9v.9h-.9zm2.2 0h.9v.9h-.9zm2.2 0h.9v.9h-.9z"
            />
        </svg>
    );
}

function FlagNl({ className, ...props }: FlagProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className} {...props}>
            <path fill="#AE1C28" d="M0 0h24v8H0z" />
            <path fill="#FFF" d="M0 8h24v8H0z" />
            <path fill="#21468B" d="M0 16h24v8H0z" />
        </svg>
    );
}

function FlagEs({ className, ...props }: FlagProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className} {...props}>
            <path fill="#AA151B" d="M0 0h24v6H0z" />
            <path fill="#F1BF00" d="M0 6h24v12H0z" />
            <path fill="#AA151B" d="M0 18h24v6H0z" />
        </svg>
    );
}

function FlagFr({ className, ...props }: FlagProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className} {...props}>
            <path fill="#002395" d="M0 0h8v24H0z" />
            <path fill="#FFF" d="M8 0h8v24H8z" />
            <path fill="#ED2939" d="M16 0h8v24h-8z" />
        </svg>
    );
}

/** Flag art keyed by contracts Locale — `satisfies` when {@link Locale} grows. */
const FLAG_BY_LOCALE = {
    [Locale.EN]: FlagEn,
    [Locale.NL]: FlagNl,
    [Locale.ES]: FlagEs,
    [Locale.FR]: FlagFr,
} as const satisfies Record<Locale, ComponentType<FlagProps>>;

export function LocaleFlag({ locale, className }: { locale: IntlLocale; className?: string }) {
    const Flag = FLAG_BY_LOCALE[fromIntlLocale(locale)];
    return (
        <span
            className={cn(
                'inline-grid size-4 shrink-0 place-items-center overflow-hidden rounded-full ring-1 ring-line/60',
                className
            )}>
            <Flag className="size-full" />
        </span>
    );
}
