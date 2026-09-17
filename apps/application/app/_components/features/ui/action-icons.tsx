import type { ReactNode } from 'react';

function ActionIcon({ children }: { children: ReactNode }) {
    return (
        <span className="inline-flex size-3.5 shrink-0 items-center justify-center" aria-hidden>
            {children}
        </span>
    );
}

/** Shared action icons for detail/header buttons — keep Edit (and kin) consistent. */

export function EditIcon() {
    return (
        <ActionIcon>
            <svg
                viewBox="0 0 16 16"
                className="size-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round">
                <path d="M11.5 2.5a1.5 1.5 0 0 1 2 2L5.5 12.5 2.5 13.5l1-3L11.5 2.5Z" />
            </svg>
        </ActionIcon>
    );
}

export function PauseIcon() {
    return (
        <ActionIcon>
            <svg viewBox="0 0 16 16" className="size-3.5" fill="currentColor">
                <rect x="3" y="2" width="3.5" height="12" rx="1" />
                <rect x="9.5" y="2" width="3.5" height="12" rx="1" />
            </svg>
        </ActionIcon>
    );
}

export function EndIcon() {
    return (
        <ActionIcon>
            <svg viewBox="0 0 16 16" className="size-3.5" fill="currentColor">
                <rect x="3" y="3" width="10" height="10" rx="1.5" />
            </svg>
        </ActionIcon>
    );
}

export function ResumeIcon() {
    return (
        <ActionIcon>
            <svg viewBox="0 0 16 16" className="size-3.5" fill="currentColor">
                <path d="M4.5 2.8v10.4L13 8 4.5 2.8Z" />
            </svg>
        </ActionIcon>
    );
}

export function ReactivateIcon() {
    return (
        <ActionIcon>
            <svg
                viewBox="0 0 16 16"
                className="size-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round">
                <path d="M3 8a5 5 0 0 1 8.5-3.5L13 6" />
                <path d="M13 3v3h-3" />
                <path d="M13 8a5 5 0 0 1-8.5 3.5L3 10" />
                <path d="M3 13v-3h3" />
            </svg>
        </ActionIcon>
    );
}
