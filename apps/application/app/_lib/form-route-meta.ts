import { getTranslations } from '@rumtelo/i18n';

import { productPath } from './routes';

export type FormRouteWidth = 'default' | 'wide';

export type FormRouteMeta = {
    titleKey: string;
    descriptionKey?: string;
    closeHref: string;
    width?: FormRouteWidth;
};

/**
 * Shared titles/copy for create+update — used by RouteModalShell and FormRoutePageShell
 * so hard refresh and soft modal stay consistent.
 */
export const FORM_ROUTE = {
    txCreate: {
        titleKey: 'pages.shell.forms.tx_create.title',
        descriptionKey: 'pages.shell.forms.tx_create.description',
        closeHref: productPath('money/transactions'),
    },
    txUpdate: {
        titleKey: 'pages.shell.forms.tx_update.title',
        descriptionKey: 'pages.shell.forms.tx_update.description',
        closeHref: productPath('money/transactions'),
    },
    fixedCreate: {
        titleKey: 'pages.shell.forms.fixed_create.title',
        descriptionKey: 'pages.shell.forms.fixed_create.description',
        closeHref: productPath('money/fixed-costs'),
    },
    fixedUpdate: {
        titleKey: 'pages.shell.forms.fixed_update.title',
        closeHref: productPath('money/fixed-costs'),
    },
    debtCreate: {
        titleKey: 'pages.shell.forms.debt_create.title',
        descriptionKey: 'pages.shell.forms.debt_create.description',
        closeHref: productPath('money/debt'),
    },
    debtUpdate: {
        titleKey: 'pages.shell.forms.debt_update.title',
        closeHref: productPath('money/debt'),
    },
    incomeCreate: {
        titleKey: 'pages.shell.forms.income_create.title',
        descriptionKey: 'pages.shell.forms.income_create.description',
        closeHref: productPath('growth/income'),
    },
    incomeUpdate: {
        titleKey: 'pages.shell.forms.income_update.title',
        closeHref: productPath('growth/income'),
    },
    goalCreate: {
        titleKey: 'pages.shell.forms.goal_create.title',
        descriptionKey: 'pages.shell.forms.goal_create.description',
        closeHref: productPath('growth/goals'),
    },
    goalUpdate: {
        titleKey: 'pages.shell.forms.goal_update.title',
        closeHref: productPath('growth/goals'),
    },
    assetCreate: {
        titleKey: 'pages.shell.forms.asset_create.title',
        descriptionKey: 'pages.shell.forms.asset_create.description',
        closeHref: productPath('growth/net-worth'),
    },
    assetUpdate: {
        titleKey: 'pages.shell.forms.asset_update.title',
        descriptionKey: 'pages.shell.forms.asset_update.description',
        closeHref: productPath('growth/net-worth'),
    },
    sessionCreate: {
        titleKey: 'pages.shell.forms.session_create.title',
        closeHref: productPath('energy/training'),
    },
    moveCreate: {
        titleKey: 'pages.shell.forms.move_create.title',
        descriptionKey: 'pages.shell.forms.move_create.description',
        closeHref: productPath('money/jars'),
        width: 'wide',
    },
} as const satisfies Record<string, FormRouteMeta>;

export type FormRouteKey = keyof typeof FORM_ROUTE;

/** Widen a route entry so optional description/width are always readable. */
export function formRoute(key: FormRouteKey): FormRouteMeta {
    return FORM_ROUTE[key];
}

/** Document title for full-page create/update routes (client pages use via layout). */
export async function formRouteMetadata(key: FormRouteKey) {
    const t = await getTranslations();
    return { title: t(formRoute(key).titleKey) };
}

export function moveCreateMeta(fromJarId?: string): FormRouteMeta {
    const base = formRoute('moveCreate');
    return {
        ...base,
        descriptionKey: fromJarId
            ? 'pages.shell.forms.move_create.description_from_jar'
            : base.descriptionKey,
    };
}
