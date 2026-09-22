import type { SVGProps } from 'react';

import { cn } from '@rumtelo/utils';

import { LocalesEnum, type Locale } from './next-intl';

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

const FLAG_BY_LOCALE = {
    [LocalesEnum.English]: FlagEn,
    [LocalesEnum.Dutch]: FlagNl,
} as const;

export function LocaleFlag({ locale, className }: { locale: Locale; className?: string }) {
    const Flag = FLAG_BY_LOCALE[locale];
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
