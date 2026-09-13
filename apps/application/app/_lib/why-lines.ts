/**
 * One-line "why this screen" caption above page content.
 * English strings from the design (Kluis Finance App.dc.html), keyed by route.
 */
import { normalizeAppPathname } from './nav';

export const WHY_LINES: Record<string, string> = {
    '/': 'One look, one question: do I have the reins this month?',
    '/product/money/jars':
        'This month, divided before it starts. Money with a job never has to be defended.',
    '/product/money/transactions':
        'You do not track spending to judge yourself — you track it to see where your life leaks.',
    '/product/money/debt':
        'Debt is rented time. Every coin of interest is an hour of your life someone else directs.',
    '/product/money/fixed-costs':
        'Fixed costs are decisions you made once and pay for monthly. Review them like decisions.',
    '/product/growth/goals':
        "A goal turns this month's surplus into something that lasts. With a date and a jar it is a plan.",
    '/product/growth/net-worth':
        'Money is this month. Net worth is the years. You are wealthy the day it pays for your life.',
    '/product/energy/week':
        'Your hours are your capacity. Divided on purpose, or by whoever asks loudest.',
    '/product/energy/sleep':
        'Sleep is the floor the jars stand on. Cut it and every other number quietly drops.',
    '/product/soul/stillness':
        'A calm mind directs money. A restless one spends it and calls that a decision.',
    '/product/soul/gratitude': 'Someone who sees what he already has buys less to fill a hole.',
    '/product/soul/giving':
        'A fixed share that leaves before you can hold it keeps money a tool, not a master.',
    '/product/soul/intent': 'An intention is an instruction to yourself. A resolution is a hope.',
    '/product/soul/centres': 'Name where it feels stuck, and the next step usually names itself.',
    '/product/growth/income': 'Cutting costs has a floor. Raising income does not.',
    '/product/growth/learn': 'A book you cannot name a use for was Play spending, not Education.',
    '/product/energy/training':
        'Training is the only spend that raises the value of every other hour.',
    '/product/energy/food':
        'Food is fuel for the week your jars divide. Fuel is bought, not willed.',
    '/product/money/week-check':
        'Ten minutes a week — look, redirect, set intention. Beats worrying every day.',
    // No why-line on /product/coach — the page is already the Coach.
    '/product/why':
        'Stop wondering where it went — what that line means, and how the four portals keep the picture clear.',
};

/** Portal hubs use their own `line`; unknown paths show no caption. */
export function whyLineFor(pathname: string): string | null {
    return WHY_LINES[normalizeAppPathname(pathname)] ?? null;
}
