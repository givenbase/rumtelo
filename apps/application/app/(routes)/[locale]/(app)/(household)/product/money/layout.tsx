import type { ReactNode } from 'react';

import { WeekCheckEntry } from './_components/week-check-entry';

/** MONEY: a compact Week check button on every Money page, with the Coach on or off. */
export default function MoneyLayout({ children }: { children: ReactNode }) {
    return (
        <>
            <WeekCheckEntry />
            {children}
        </>
    );
}
