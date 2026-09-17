'use client';

import { type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from 'react';

import { cn } from '../../lib/utils';
import { typographyVariants } from '../../display/Typography';
import { STATUS_COPY } from './copy';
import type { StatusPageProps } from './types';

/** Brand fallbacks mirror packages/config/tailwind/theme.css (brand teal #06656C). */
const FALLBACK = {
    bg: '#EEF1F5',
    fg: '#1A202D',
    muted: '#5A6474',
    line: '#D5DAE3',
    surface: '#FFFFFF',
    raised: '#E8ECF2',
    accent: '#06656c',
    accentHover: '#00777f',
    accentSoft: 'rgb(6 101 108 / 0.12)',
    danger: '#c81e1e',
    onAccent: '#FFFFFF',
} as const;

const actionBaseClass =
    'inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-full px-5 text-sm font-semibold no-underline transition-[filter,background-color,border-color,color] duration-200 ease-out hover:brightness-110 active:scale-[0.98] sm:w-auto';

type ActionTone = 'primary' | 'secondary' | 'ghost';

function actionStyle(tone: ActionTone): CSSProperties {
    if (tone === 'primary') {
        return {
            backgroundColor: `var(--color-accent, ${FALLBACK.accent})`,
            color: `var(--color-on-accent, ${FALLBACK.onAccent})`,
            border: '1px solid transparent',
        };
    }
    if (tone === 'secondary') {
        return {
            backgroundColor: `var(--color-accent-soft, ${FALLBACK.accentSoft})`,
            color: `var(--color-accent, ${FALLBACK.accent})`,
            border: `1px solid color-mix(in oklab, var(--color-accent, ${FALLBACK.accent}) 35%, transparent)`,
        };
    }
    return {
        backgroundColor: 'transparent',
        color: `var(--color-fg-muted, ${FALLBACK.muted})`,
        border: `1px solid var(--color-line, ${FALLBACK.line})`,
    };
}

function StatusAction({
    tone,
    href,
    children,
    onClick,
}: {
    tone: ActionTone;
    children: ReactNode;
    href?: string;
    onClick?: ButtonHTMLAttributes<HTMLButtonElement>['onClick'];
}) {
    const className = cn(actionBaseClass);
    const style = actionStyle(tone);

    if (href) {
        return (
            <a href={href} className={className} style={style}>
                {children}
            </a>
        );
    }

    return (
        <button type="button" className={className} style={style} onClick={onClick}>
            {children}
        </button>
    );
}

/**
 * Full-viewport status / error surface for Next.js `error`, `global-error`,
 * and `not-found` routes. Self-contained enough to render when the app shell
 * or theme provider failed — uses design tokens with Rumtelo teal fallbacks.
 */
export function StatusPage({
    type,
    statusCode,
    errorDetails,
    reset,
    homeHref = '/',
    homeLabel,
    title,
    description,
}: StatusPageProps) {
    const copy = STATUS_COPY[type];
    const code = statusCode === undefined ? copy.code : statusCode;
    const showDetails =
        type === 'error' && Boolean(errorDetails) && process.env.NODE_ENV === 'development';
    const resolvedHomeLabel = homeLabel ?? (homeHref === '/' ? 'Back home' : 'Continue');

    return (
        <div
            className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-12 sm:px-6"
            style={{
                backgroundColor: `var(--color-bg, ${FALLBACK.bg})`,
                backgroundImage: 'var(--gradient-page, none)',
                color: `var(--color-fg, ${FALLBACK.fg})`,
            }}>
            <div
                className={cn(
                    'relative w-full max-w-md overflow-hidden rounded-3xl',
                    'px-6 py-8 text-center sm:px-8 sm:py-10'
                )}
                style={{
                    background: `var(--color-surface, ${FALLBACK.surface})`,
                    border: `1px solid var(--color-line, ${FALLBACK.line})`,
                    boxShadow:
                        'var(--shadow-lg, 0 2px 4px rgb(14 17 22 / 0.06), 0 14px 34px rgb(14 17 22 / 0.1)), inset 0 0 0 1px rgb(14 17 22 / 0.08)',
                }}>
                <span
                    className="absolute inset-x-0 top-0 block h-1"
                    style={{
                        background: `var(--gradient-accent, linear-gradient(135deg, ${FALLBACK.accentHover}, ${FALLBACK.accent}))`,
                    }}
                    aria-hidden
                />

                <p
                    className={cn(
                        typographyVariants({
                            as: 'p',
                            variant: 'eyebrow',
                            weight: 'medium',
                            color: 'inherit',
                        }),
                        'mb-4'
                    )}
                    style={{ color: `var(--color-accent, ${FALLBACK.accent})` }}>
                    ✦ {code ? String(code) : 'Rumtelo'}
                </p>

                <p
                    className={cn(
                        typographyVariants({ as: 'h1', size: 'sm', weight: 'semibold', color: 'inherit' }),
                        'mb-3'
                    )}
                    style={{ color: `var(--color-fg, ${FALLBACK.fg})` }}>
                    Rumtelo
                </p>

                <h1
                    className={cn(
                        typographyVariants({ as: 'h1', size: 'sm', weight: 'semibold', color: 'default' }),
                        'text-[clamp(1.5rem,4vw,1.875rem)] leading-tight lg:text-[clamp(1.5rem,4vw,1.875rem)]'
                    )}>
                    {title ?? copy.title}
                </h1>

                <p
                    className="mx-auto mt-3 max-w-sm text-sm leading-relaxed"
                    style={{ color: `var(--color-fg-muted, ${FALLBACK.muted})` }}>
                    {description ?? copy.description}
                </p>

                {showDetails ? (
                    <pre
                        className="mt-5 max-h-40 overflow-auto rounded-xl px-3.5 py-3 text-left font-mono text-xs leading-relaxed wrap-break-word whitespace-pre-wrap"
                        style={{
                            border: `1px solid color-mix(in oklab, var(--color-danger, ${FALLBACK.danger}) 30%, transparent)`,
                            background: `color-mix(in oklab, var(--color-danger, ${FALLBACK.danger}) 8%, transparent)`,
                            color: `var(--color-danger, ${FALLBACK.danger})`,
                        }}>
                        {errorDetails}
                    </pre>
                ) : null}

                <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:justify-center">
                    {reset ? (
                        <StatusAction tone="primary" onClick={reset}>
                            Try again
                        </StatusAction>
                    ) : null}
                    <StatusAction tone={reset ? 'secondary' : 'primary'} href={homeHref}>
                        {resolvedHomeLabel}
                    </StatusAction>
                    <StatusAction
                        tone="ghost"
                        onClick={() => {
                            if (typeof window !== 'undefined' && window.history.length > 1) {
                                window.history.back();
                            } else if (typeof window !== 'undefined') {
                                window.location.href = homeHref;
                            }
                        }}>
                        Go back
                    </StatusAction>
                </div>
            </div>
        </div>
    );
}

export type { StatusPageProps, StatusType } from './types';
