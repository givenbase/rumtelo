'use client';

import Link from 'next/link';

import { Button, EmptyState } from '@rumtelo/ui';

type EntityNotFoundStateProps = {
    /** Short “not found” line (already translated). */
    title: string;
    /** List / board URL to leave the dead slug. */
    href: string;
    /** CTA label (e.g. “Back to net worth”). */
    backLabel: string;
};

/**
 * Missing entity on a detail / edit slug — EmptyState + link to the list.
 * Prefer this over plain muted text so delete/deep-link 404s feel intentional.
 */
export function EntityNotFoundState({ title, href, backLabel }: EntityNotFoundStateProps) {
    return (
        <EmptyState
            icon="inbox"
            title={title}
            action={
                <Button as={Link} href={href} variant="secondary" size="sm">
                    {backLabel}
                </Button>
            }
        />
    );
}
