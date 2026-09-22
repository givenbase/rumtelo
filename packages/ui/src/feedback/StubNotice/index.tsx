'use client';

import { Typography } from '../../display/Typography';

import type StubNoticeProps from './types';

export function StubNotice({ what, prefix }: StubNoticeProps) {
    return (
        <div className="rounded-lg border border-dashed border-line-strong bg-raised/50 p-4">
            <Typography as="p" size="sm" color="muted">
                <span className="font-semibold text-fg-secondary">{prefix}</span> {what}
            </Typography>
        </div>
    );
}

export type { StubNoticeProps };
