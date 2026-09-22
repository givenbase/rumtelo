import { moneyPath, growthPath, productPath } from '@/app/_lib/routes';
import type { TranslateFn } from '@rumtelo/i18n';

import type { FullTourChapter, PageHelpContent, PageTourStep } from '../types';

function step(target: string, title: string, content: string): PageTourStep {
    return { target, title, content };
}

function sectionsFrom(
    t: TranslateFn,
    base: string,
    keys: readonly string[]
): PageHelpContent['sections'] {
    return keys.map(key => ({
        heading: t(`${base}.${key}.heading`),
        body: t(`${base}.${key}.body`),
    }));
}

export function buildShellTourSteps(t: TranslateFn): PageTourStep[] {
    return [
        step(
            '[data-tour="shell-brand"]',
            t('pages.shell.steps.brand.title'),
            t('pages.shell.steps.brand.content')
        ),
        step(
            '[data-tour="shell-period"]',
            t('pages.shell.steps.period.title'),
            t('pages.shell.steps.period.content')
        ),
        step(
            '[data-tour="shell-help"]',
            t('pages.shell.steps.help.title'),
            t('pages.shell.steps.help.content')
        ),
    ];
}

export function buildIncomeTourSteps(t: TranslateFn): PageTourStep[] {
    return [
        step(
            '[data-tour="income-summary"]',
            t('pages.income.steps.summary.title'),
            t('pages.income.steps.summary.content')
        ),
        step(
            '[data-tour="income-simulator"]',
            t('pages.income.steps.simulator.title'),
            t('pages.income.steps.simulator.content')
        ),
        step(
            '[data-tour="income-sources"]',
            t('pages.income.steps.sources.title'),
            t('pages.income.steps.sources.content')
        ),
    ];
}

export function buildFixedTourSteps(t: TranslateFn): PageTourStep[] {
    return [
        step(
            '[data-tour="fixed-tabs"]',
            t('pages.fixed.steps.tabs.title'),
            t('pages.fixed.steps.tabs.content')
        ),
        step(
            '[data-tour="fixed-list"]',
            t('pages.fixed.steps.list.title'),
            t('pages.fixed.steps.list.content')
        ),
    ];
}

export function buildJarsTourSteps(t: TranslateFn): PageTourStep[] {
    return [
        step(
            '[data-tour="jars-toolbar"]',
            t('pages.jars.steps.toolbar.title'),
            t('pages.jars.steps.toolbar.content')
        ),
        step(
            '[data-tour="jars-list"]',
            t('pages.jars.steps.list.title'),
            t('pages.jars.steps.list.content')
        ),
    ];
}

export function buildFullTourChapters(t: TranslateFn): FullTourChapter[] {
    return [
        { id: 'shell', href: moneyPath('jars'), steps: buildShellTourSteps(t) },
        { id: 'jars', href: moneyPath('jars'), steps: buildJarsTourSteps(t) },
        { id: 'fixed', href: moneyPath('fixed-costs'), steps: buildFixedTourSteps(t) },
        { id: 'income', href: growthPath('income'), steps: buildIncomeTourSteps(t) },
    ];
}

type HelpRoute = {
    prefix: string;
    exact?: boolean;
    content: PageHelpContent;
};

function helpContent(
    t: TranslateFn,
    titleKey: string,
    sectionBase: string,
    sectionKeys: readonly string[],
    tour?: { id: PageHelpContent['tourId']; steps: PageTourStep[] }
): PageHelpContent {
    return {
        title: t(titleKey),
        sections: sectionsFrom(t, sectionBase, sectionKeys),
        ...(tour ? { tourId: tour.id, tourSteps: tour.steps } : {}),
    };
}

export function buildPageHelpForPathname(pathname: string, t: TranslateFn): PageHelpContent {
    const incomeSteps = buildIncomeTourSteps(t);
    const fixedSteps = buildFixedTourSteps(t);
    const jarsSteps = buildJarsTourSteps(t);

    const routes: HelpRoute[] = [
        {
            prefix: growthPath('income'),
            content: helpContent(
                t,
                'pages.income.title',
                'pages.income.sections',
                ['what_for', 'now_target_gap', 'simulator', 'sources', 'earning_methods'],
                { id: 'income', steps: incomeSteps }
            ),
        },
        {
            prefix: moneyPath('fixed-costs'),
            content: helpContent(
                t,
                'pages.fixed.title',
                'pages.fixed.sections',
                ['what_for', 'out_vs_in', 'jars_use'],
                { id: 'fixed', steps: fixedSteps }
            ),
        },
        {
            prefix: moneyPath('jars'),
            content: helpContent(
                t,
                'pages.jars.title',
                'pages.jars.sections',
                ['what_for', 'how'],
                { id: 'jars', steps: jarsSteps }
            ),
        },
        {
            prefix: moneyPath('transactions'),
            content: helpContent(t, 'pages.transactions.title', 'pages.transactions.sections', [
                'what_for',
                'how',
            ]),
        },
        {
            prefix: moneyPath('debt'),
            content: helpContent(t, 'pages.debt.title', 'pages.debt.sections', ['what_for', 'how']),
        },
        {
            prefix: moneyPath(),
            exact: true,
            content: helpContent(t, 'pages.overview.title', 'pages.overview.sections', [
                'what_for',
                'how',
            ]),
        },
        {
            prefix: growthPath('goals'),
            content: helpContent(t, 'pages.goals.title', 'pages.goals.sections', [
                'save_vs_earn',
                'pace',
            ]),
        },
        {
            prefix: productPath('growth'),
            content: helpContent(t, 'pages.growth.title', 'pages.growth.sections', ['what_for']),
        },
    ];

    const path = pathWithoutLocale(pathname);
    let best: PageHelpContent | null = null;
    let bestLen = -1;
    for (const entry of routes) {
        const matches = entry.exact
            ? path === entry.prefix
            : path === entry.prefix || path.startsWith(`${entry.prefix}/`);
        if (!matches) continue;
        if (entry.prefix.length > bestLen) {
            best = entry.content;
            bestLen = entry.prefix.length;
        }
    }

    return (
        best ?? {
            title: t('pages.fallback.title'),
            sections: sectionsFrom(t, 'pages.fallback.sections', ['looking_at']),
        }
    );
}

/** Strip locale prefix for comparing chapter hrefs. */
export function pathWithoutLocale(pathname: string): string {
    return pathname.replace(/^\/[a-z]{2}(?=\/)/, '') || pathname;
}
