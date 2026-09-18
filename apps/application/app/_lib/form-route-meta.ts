import { productPath } from './routes';

export type FormRouteWidth = 'default' | 'wide';

export type FormRouteMeta = {
    title: string;
    description?: string;
    closeHref: string;
    width?: FormRouteWidth;
};

/**
 * Shared titles/copy for create+update — used by RouteModalShell and FormRoutePageShell
 * so hard refresh and soft modal stay consistent.
 */
export const FORM_ROUTE = {
    txCreate: {
        title: 'New transaction',
        description: 'Out for spend, In for gifts, refunds, and jar top-ups.',
        closeHref: productPath('money/transactions'),
    },
    txUpdate: {
        title: 'Edit transaction',
        description: 'Update direction, amount, jar, or note.',
        closeHref: productPath('money/transactions'),
    },
    fixedCreate: {
        title: 'New fixed cost',
        description: 'What leaves a jar every month?',
        closeHref: productPath('money/fixed-costs'),
    },
    fixedUpdate: {
        title: 'Edit fixed cost',
        closeHref: productPath('money/fixed-costs'),
    },
    debtCreate: {
        title: 'New debt',
        description: 'Pick the type, then who you owe.',
        closeHref: productPath('money/debt'),
    },
    debtUpdate: {
        title: 'Edit debt',
        closeHref: productPath('money/debt'),
    },
    incomeCreate: {
        title: 'New income',
        description: 'Add an income source that feeds your jars.',
        closeHref: productPath('growth/income'),
    },
    incomeUpdate: {
        title: 'Edit income',
        closeHref: productPath('growth/income'),
    },
    goalCreate: {
        title: 'New goal',
        description: 'Give savings a destination.',
        closeHref: productPath('growth/goals'),
    },
    goalUpdate: {
        title: 'Edit goal',
        closeHref: productPath('growth/goals'),
    },
    assetCreate: {
        title: 'New asset',
        description: 'What you own, and whether it pays you.',
        closeHref: productPath('growth/net-worth'),
    },
    sessionCreate: {
        title: 'New training',
        closeHref: productPath('energy/training'),
    },
    moveCreate: {
        title: 'Move money',
        description: 'Pick from and to. Available this month shifts; your split stays the same.',
        closeHref: productPath('money/jars'),
        width: 'wide',
    },
} as const;

export type FormRouteKey = keyof typeof FORM_ROUTE;

/** Widen a route entry so optional description/width are always readable. */
export function formRoute(key: FormRouteKey): FormRouteMeta {
    return FORM_ROUTE[key];
}

export function moveCreateMeta(fromJarId?: string): FormRouteMeta {
    const base = formRoute('moveCreate');
    return {
        ...base,
        description: fromJarId
            ? 'Pick where it goes — this jar is already the source.'
            : base.description,
    };
}
