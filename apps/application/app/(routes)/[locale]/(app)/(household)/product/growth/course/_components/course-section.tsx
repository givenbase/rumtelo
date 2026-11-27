'use client';

import { Typography } from '@rumtelo/ui';

/** A titled block on a Course tab: "Checks", "Your 3", "Your routines", "Goals 2026". */
export function CourseSection({
    title,
    lead,
    children,
}: {
    title: string;
    lead?: string;
    children: React.ReactNode;
}) {
    return (
        <section className="grid gap-3" aria-label={title}>
            <div className="grid gap-0.5">
                <Typography as="h2" variant="eyebrow">
                    {title}
                </Typography>
                {lead ? <p className="text-sm text-fg-muted">{lead}</p> : null}
            </div>
            {children}
        </section>
    );
}
