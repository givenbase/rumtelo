'use client';

import { cn } from '@rumtelo/utils';

import type SectionProps from './types';

import { Typography } from '../../display/Typography';
import { Eyebrow } from '../Eyebrow';

export function Section({ eyebrow, title, action, children, className }: SectionProps) {
    return (
        <section className={cn('animate-rise', className)}>
            {(eyebrow || title || action) && (
                <div className="mb-4 flex items-end justify-between gap-4">
                    <div className="min-w-0">
                        {eyebrow ? <Eyebrow className="mb-1">✦ {eyebrow}</Eyebrow> : null}
                        {title ? <Typography as="h2">{title}</Typography> : null}
                    </div>
                    {action}
                </div>
            )}
            {children}
        </section>
    );
}

export type { SectionProps };
