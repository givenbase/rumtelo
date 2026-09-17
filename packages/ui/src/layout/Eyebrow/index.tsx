import type { ReactNode } from 'react';

import { Typography } from '../../display/Typography';

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <Typography as="p" variant="eyebrow" className={className}>
            {children}
        </Typography>
    );
}
