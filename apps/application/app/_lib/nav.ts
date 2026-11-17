/**
 * Navigation model: Home · Money · Growth · More.
 *
 * Labels, hrefs, ordering and active-state matching only. Plan and role GATING lives in
 * `route-capabilities.ts` and never reads this file, so moving a page into or out of the
 * nav cannot open or close a paid page.
 *
 * Product routes live under `/product/…`; settings under `/settings/…`.
 * Labels are i18n keys under `pages.nav.*`, resolved with `t(labelKey)` in the shell.
 */
import {
    BOARD_STAGE_ORDER,
    BoardStage,
    CAPABILITIES,
    CourseHorizon,
    coursePeriodOf,
    HouseholdPermissionSection,
    HouseholdRole,
    PlanKey,
    roleCanSee,
} from '@rumtelo/contracts';
import type { IconName } from '@rumtelo/ui';

import { stageAtLeast } from './board-stage';
import { isProductEnabled } from './launch-products';
import { normalizeAppPathname, pathMatchesHref } from './path';
import { practicePath, productPath } from './routes';

export { normalizeAppPathname };

/** Same as `pathMatchesHref`; kept under its original name for existing importers. */
export const pathMatchesNavHref = pathMatchesHref;

export type NavTabKey = 'home' | 'money' | 'growth' | 'more';

/** Compact labels for the desktop pill bar and bottom tabs. */
export const TOP_PILL_LABEL_KEYS: Record<string, string> = {
    home: 'pages.nav.pills.home',
    money: 'pages.nav.pills.money',
    growth: 'pages.nav.pills.growth',
    more: 'pages.nav.pills.more',
    energy: 'pages.nav.pills.energy',
    soul: 'pages.nav.pills.soul',
};

export interface NavTab {
    key: NavTabKey;
    /** `null` for More, which opens a menu or sheet instead of navigating. */
    href: string | null;
    labelKey: string;
    glyph: string;
    /**
     * True for the Growth slot while the board stage is still loading: the bottom tabs keep
     * the cell (no jump) but render nothing in it; the desktop pills skip it.
     */
    pending?: boolean;
}

export type MoneySubnavKey = 'jars' | 'inbox' | 'fixed_costs' | 'income';

export interface MoneySubnavItem {
    key: MoneySubnavKey;
    href: string;
    labelKey: string;
    /** `inbox` shows the count of items still to sort. */
    badge?: 'inbox';
}

export type MoreRowKey =
    | 'debt'
    | 'net_worth'
    | 'learn'
    | 'coach'
    | 'why'
    | 'settings'
    | 'energy'
    | 'soul';

export type MoreRow =
    | {
          kind: 'link';
          key: MoreRowKey;
          href: string;
          labelKey: string;
          icon: IconName;
          /** `preview` marks staging-only portals. */
          badgeKey?: 'preview';
      }
    | { kind: 'plan_gains'; plan: PlanKey.PLUS | PlanKey.MAX }
    | { kind: 'help' }
    | { kind: 'practice'; href: string }
    | { kind: 'exit_preview'; href: string }
    /** One row for what the board ladder has not shown yet. `stage` is the next stage that adds something. */
    | { kind: 'coming_up'; stage: BoardStage; items: StageItem[] };

/** What brings a deferred page into the menu (search hits carry a muted line). */
export type DeferredUntil = 'week_check' | 'month_close';

export interface SearchableNavItem {
    href: string;
    labelKey: string;
    /** Set when the ladder keeps this page out of the menu for now. It still opens. */
    deferredUntil?: DeferredUntil;
}

/** Everything `buildNav` needs. Pure data, so the model is testable without React. */
export interface NavContext {
    /** Role used for section visibility. Fail-open OWNER while membership loads. */
    role: HouseholdRole;
    /** True once the real membership role is known (gates upgrade rows, fail closed). */
    membershipKnown: boolean;
    plan: PlanKey;
    planReady: boolean;
    /** Plan + launch check for a capability (`usePlanCapabilities().hasCapability`). */
    has: (capabilityKey: string) => boolean;
    preview: {
        active: boolean;
        showCoachNav: boolean;
        showSettings: boolean;
        showPageHelp: boolean;
    };
    /** True when the person is staff of at least one practice. */
    isPracticeStaff: boolean;
    /** Resolved Settings entry for this person and page (account tab for a VIEWER). */
    settingsHref: string;
    /**
     * Board stage after the Practice preview and "Show everything now" are applied
     * (`effectiveStage`). Decides what is shown up front, never what may be opened.
     */
    stage: BoardStage;
    /** False while the first stage read is in flight (the Growth slot is reserved). */
    stageReady: boolean;
    /** Any month closed: the level on the month score is already there. */
    hasClosedMonth: boolean;
    now?: Date;
}

export interface ShellNav {
    tabs: NavTab[];
    moneySubnav: MoneySubnavItem[];
    moreRows: MoreRow[];
    searchable: SearchableNavItem[];
}

const HOME_TAB: NavTab = {
    key: 'home',
    href: '/',
    labelKey: TOP_PILL_LABEL_KEYS.home!,
    glyph: '◇',
};
const MONEY_TAB: NavTab = {
    key: 'money',
    href: productPath('money'),
    labelKey: TOP_PILL_LABEL_KEYS.money!,
    glyph: '◈',
};
const MORE_TAB: NavTab = {
    key: 'more',
    href: null,
    labelKey: TOP_PILL_LABEL_KEYS.more!,
    glyph: '≡',
};

/** Where the Growth tab lands: Course with Plus and Max, the 1-goal list on Basic. */
export function growthTabHref(ctx: Pick<NavContext, 'has' | 'planReady'>): string {
    if (!ctx.planReady) return productPath('growth');
    return ctx.has(CAPABILITIES.growthCourse)
        ? productPath('growth/course')
        : productPath('growth/goals');
}

function buildMoneySubnav(ctx: NavContext): MoneySubnavItem[] {
    const items: MoneySubnavItem[] = [
        { key: 'jars', href: productPath('money'), labelKey: 'pages.nav.children.jars' },
        {
            key: 'inbox',
            href: productPath('money/transactions'),
            labelKey: 'pages.nav.children.inbox',
            badge: 'inbox',
        },
        {
            key: 'fixed_costs',
            href: productPath('money/fixed-costs'),
            labelKey: 'pages.nav.children.fixed_costs',
        },
    ];
    // Income keeps its Growth role section, so a VIEWER (Growth = none) does not see it.
    if (roleCanSee(ctx.role, HouseholdPermissionSection.GROWTH)) {
        items.push({
            key: 'income',
            href: productPath('money/income'),
            labelKey: 'pages.nav.children.income',
        });
    }
    return items;
}

function buildMoreRows(ctx: NavContext, comingUp: MoreRow | null): MoreRow[] {
    const { role, preview } = ctx;
    const atLeast = (minimum: BoardStage) => stageAtLeast(ctx.stage, minimum);
    // Plan rows appear once the plan is known; never flash Debt or Net worth while loading.
    const has = (capabilityKey: string) => ctx.planReady && ctx.has(capabilityKey);
    const rows: MoreRow[] = [];
    const sees = (section: HouseholdPermissionSection) => roleCanSee(role, section);
    const writer = ctx.membershipKnown && role !== HouseholdRole.VIEWER && !preview.active;

    if (preview.active) rows.push({ kind: 'exit_preview', href: practicePath('clients') });

    if (
        atLeast(BoardStage.MONTH) &&
        has(CAPABILITIES.moneyDebt) &&
        sees(HouseholdPermissionSection.MONEY)
    ) {
        rows.push({
            kind: 'link',
            key: 'debt',
            href: productPath('money/debt'),
            labelKey: 'pages.nav.children.debt',
            icon: 'credit-card',
        });
    }
    if (
        atLeast(BoardStage.MONTH) &&
        has(CAPABILITIES.growthNetWorth) &&
        sees(HouseholdPermissionSection.MONEY)
    ) {
        rows.push({
            kind: 'link',
            key: 'net_worth',
            href: productPath('money/net-worth'),
            labelKey: 'pages.nav.children.net_worth',
            icon: 'landmark',
        });
    }
    if (
        atLeast(BoardStage.MONTH) &&
        has(CAPABILITIES.growthLearn) &&
        sees(HouseholdPermissionSection.GROWTH)
    ) {
        rows.push({
            kind: 'link',
            key: 'learn',
            href: productPath('growth/learn'),
            labelKey: 'pages.nav.children.learn',
            icon: 'book-open',
        });
    }

    // One row for what the plan does not include, never a faded row per locked page.
    // Never in week 1: an upgrade row would turn the first week into an upsell countdown.
    if (ctx.planReady && writer && atLeast(BoardStage.ROUTINE)) {
        if (ctx.plan === PlanKey.BASIC) rows.push({ kind: 'plan_gains', plan: PlanKey.PLUS });
        if (ctx.plan === PlanKey.PLUS) rows.push({ kind: 'plan_gains', plan: PlanKey.MAX });
    }

    if (
        atLeast(BoardStage.ROUTINE) &&
        sees(HouseholdPermissionSection.COACH) &&
        preview.showCoachNav
    ) {
        rows.push({
            kind: 'link',
            key: 'coach',
            href: productPath('coach'),
            labelKey: 'pages.nav.children.coach',
            icon: 'sparkles',
        });
    }
    if (!preview.active || preview.showCoachNav) {
        rows.push({
            kind: 'link',
            key: 'why',
            href: productPath('why'),
            labelKey: 'pages.nav.children.why',
            icon: 'compass',
        });
    }
    if (preview.showSettings) {
        rows.push({
            kind: 'link',
            key: 'settings',
            href: ctx.settingsHref,
            labelKey: 'pages.nav.more.settings',
            icon: 'settings',
        });
    }
    if (preview.showPageHelp && sees(HouseholdPermissionSection.COACH)) {
        rows.push({ kind: 'help' });
    }
    if (ctx.isPracticeStaff && !preview.active) {
        rows.push({ kind: 'practice', href: practicePath() });
    }
    if (comingUp) rows.push(comingUp);

    // Staging only: production never lists Energy or Soul (launch surface is Money + Growth).
    if (
        atLeast(BoardStage.MONTH) &&
        isProductEnabled('energy') &&
        sees(HouseholdPermissionSection.ENERGY)
    ) {
        rows.push({
            kind: 'link',
            key: 'energy',
            href: productPath('energy'),
            labelKey: 'pages.nav.pills.energy',
            icon: 'zap',
            badgeKey: 'preview',
        });
    }
    if (
        atLeast(BoardStage.MONTH) &&
        isProductEnabled('soul') &&
        sees(HouseholdPermissionSection.SOUL)
    ) {
        rows.push({
            kind: 'link',
            key: 'soul',
            href: productPath('soul'),
            labelKey: 'pages.nav.pills.soul',
            icon: 'sparkle',
            badgeKey: 'preview',
        });
    }

    return rows;
}

function buildSearchable(
    ctx: NavContext,
    tabs: NavTab[],
    moneySubnav: MoneySubnavItem[],
    moreRows: MoreRow[]
): SearchableNavItem[] {
    const items: SearchableNavItem[] = [];
    const seen = new Set<string>();
    const add = (href: string, labelKey: string) => {
        if (seen.has(href)) return;
        seen.add(href);
        items.push({ href, labelKey });
    };

    add('/', 'pages.nav.pills.home');
    for (const item of moneySubnav) add(item.href, item.labelKey);
    if (tabs.some(tab => tab.key === 'growth')) {
        if (ctx.planReady && ctx.has(CAPABILITIES.growthCourse)) {
            const now = ctx.now ?? new Date();
            add(productPath('growth/course'), 'pages.nav.search.course_today');
            add(
                productPath('growth/course', coursePeriodOf(CourseHorizon.WEEK, now)),
                'pages.nav.search.course_week'
            );
            add(
                productPath('growth/course', coursePeriodOf(CourseHorizon.MONTH, now)),
                'pages.nav.search.course_goals'
            );
        } else if (ctx.planReady && ctx.has(CAPABILITIES.growthGoals)) {
            add(productPath('growth/goals'), 'pages.nav.children.goals');
        }
    }
    for (const row of moreRows) {
        if (row.kind === 'link') add(row.href, row.labelKey);
    }
    return items;
}

function buildTabs(ctx: NavContext): NavTab[] {
    const tabs: NavTab[] = [HOME_TAB, MONEY_TAB];
    if (
        isProductEnabled('growth') &&
        roleCanSee(ctx.role, HouseholdPermissionSection.GROWTH) &&
        stageAtLeast(ctx.stage, BoardStage.ROUTINE)
    ) {
        tabs.push({
            key: 'growth',
            href: growthTabHref(ctx),
            labelKey: TOP_PILL_LABEL_KEYS.growth!,
            glyph: '↗',
            ...(ctx.stageReady ? {} : { pending: true }),
        });
    }
    tabs.push(MORE_TAB);
    return tabs;
}

/** Tabs, Money sections, More rows and search for one context, without the Coming up row. */
function buildParts(ctx: NavContext, comingUp: MoreRow | null) {
    const tabs = buildTabs(ctx);
    const moneySubnav = buildMoneySubnav(ctx);
    const moreRows = buildMoreRows(ctx, comingUp);
    return {
        tabs,
        moneySubnav,
        moreRows,
        searchable: buildSearchable(ctx, tabs, moneySubnav, moreRows),
    };
}

// ── The ladder: what the next stage adds on this plan and role ────────────────

export type StageItemKey = 'course' | 'goals' | 'coach' | 'debt' | 'net_worth' | 'learn';

export type StageItem = { kind: 'nav'; key: StageItemKey } | { kind: 'levels' };

const STAGE_ITEM_KEYS: ReadonlySet<string> = new Set(['coach', 'debt', 'net_worth', 'learn']);

/** Menu items of one stage, in menu order (Growth first, then the More rows). */
function stageItemKeys(ctx: NavContext): StageItemKey[] {
    const parts = buildParts(ctx, null);
    const keys: StageItemKey[] = [];
    if (parts.tabs.some(tab => tab.key === 'growth')) {
        keys.push(ctx.planReady && ctx.has(CAPABILITIES.growthCourse) ? 'course' : 'goals');
    }
    for (const row of parts.moreRows) {
        if (row.kind === 'link' && STAGE_ITEM_KEYS.has(row.key)) {
            keys.push(row.key as StageItemKey);
        }
    }
    return keys;
}

const STAGE_ITEM_LABEL_KEYS: Record<StageItemKey, string> = {
    course: 'pages.nav.stage_items.course',
    goals: 'pages.nav.stage_items.goals',
    coach: 'pages.nav.children.coach',
    debt: 'pages.nav.children.debt',
    net_worth: 'pages.nav.children.net_worth',
    learn: 'pages.nav.children.learn',
};

/** Translation key for a stage item, shared by Coming up and the "New in your menu" note. */
export function stageItemLabelKey(item: StageItem): string {
    return item.kind === 'levels'
        ? 'pages.nav.coming_up.adds.levels'
        : STAGE_ITEM_LABEL_KEYS[item.key];
}

/**
 * What `to` shows in the menu that `from` does not, for this plan and role. Built by
 * diffing two `buildNav` passes, so Coming up and the "New" note can never disagree with
 * the menu. Upgrade rows are never listed; `levels` is what a first closed month adds.
 */
export function stageAdditions(ctx: NavContext, from: BoardStage, to: BoardStage): StageItem[] {
    const before = new Set(stageItemKeys({ ...ctx, stage: from, stageReady: true }));
    const items: StageItem[] = stageItemKeys({ ...ctx, stage: to, stageReady: true })
        .filter(key => !before.has(key))
        .map(key => ({ kind: 'nav', key }));
    if (to === BoardStage.MONTH && from !== BoardStage.MONTH && !ctx.hasClosedMonth) {
        items.push({ kind: 'levels' });
    }
    return items;
}

/** The first stage above the current one that adds something to this menu, or null. */
export function nextVisibleStage(
    ctx: NavContext
): { stage: BoardStage; items: StageItem[] } | null {
    const higher = BOARD_STAGE_ORDER.slice(BOARD_STAGE_ORDER.indexOf(ctx.stage) + 1);
    for (const stage of higher) {
        const items = stageAdditions(ctx, ctx.stage, stage);
        if (items.length > 0) return { stage, items };
    }
    return null;
}

/** Pages the ladder keeps out of the menu, still findable in Quick add. */
function deferredSearchable(
    ctx: NavContext,
    current: readonly SearchableNavItem[]
): SearchableNavItem[] {
    if (stageAtLeast(ctx.stage, BoardStage.MONTH)) return [];
    const at = (stage: BoardStage) => {
        return buildParts({ ...ctx, stage, stageReady: true }, null).searchable;
    };
    const have = new Set(current.map(item => item.href));
    const routine = new Set(at(BoardStage.ROUTINE).map(item => item.href));
    return at(BoardStage.MONTH)
        .filter(item => !have.has(item.href))
        .map(item => ({
            ...item,
            deferredUntil: routine.has(item.href) ? 'week_check' : 'month_close',
        }));
}

/** The whole shell nav for one render, already filtered by stage, role, plan, preview and launch. */
export function buildNav(ctx: NavContext): ShellNav {
    const writer = ctx.membershipKnown && ctx.role !== HouseholdRole.VIEWER && !ctx.preview.active;
    const next =
        writer && ctx.stageReady && !stageAtLeast(ctx.stage, BoardStage.MONTH)
            ? nextVisibleStage(ctx)
            : null;
    const parts = buildParts(
        ctx,
        next ? { kind: 'coming_up', stage: next.stage, items: next.items } : null
    );
    return {
        tabs: parts.tabs,
        moneySubnav: parts.moneySubnav,
        moreRows: parts.moreRows,
        searchable: ctx.stageReady
            ? [...parts.searchable, ...deferredSearchable(ctx, parts.searchable)]
            : parts.searchable,
    };
}

const MORE_PATHS: ReadonlyArray<{ prefix: string; key: MoreRowKey }> = [
    { prefix: productPath('money/debt'), key: 'debt' },
    { prefix: productPath('money/net-worth'), key: 'net_worth' },
    { prefix: productPath('growth/net-worth'), key: 'net_worth' },
    { prefix: productPath('growth/learn'), key: 'learn' },
    { prefix: productPath('coach'), key: 'coach' },
    { prefix: productPath('why'), key: 'why' },
    { prefix: '/settings', key: 'settings' },
    { prefix: productPath('energy'), key: 'energy' },
    { prefix: productPath('soul'), key: 'soul' },
];

/** The More row that owns this path, if any. */
export function activeMoreRowKey(pathname: string): MoreRowKey | null {
    const path = normalizeAppPathname(pathname);
    return MORE_PATHS.find(entry => pathMatchesHref(path, entry.prefix))?.key ?? null;
}

/**
 * Which top tab is active. A page that lives in More (Debt, Net worth, Learn, Coach, Why,
 * Settings) highlights More: the place the user came from.
 */
export function activeTabForPath(pathname: string): NavTabKey | null {
    const path = normalizeAppPathname(pathname);
    if (path === '/') return 'home';
    if (activeMoreRowKey(path)) return 'more';
    if (pathMatchesHref(path, productPath('money'))) return 'money';
    if (pathMatchesHref(path, productPath('growth'))) return 'growth';
    return null;
}

/** Which Money sub-item is active (Jars is the default for the Money root and week check). */
export function activeMoneySubnavKey(pathname: string): MoneySubnavKey {
    const path = normalizeAppPathname(pathname);
    if (pathMatchesHref(path, productPath('money/transactions'))) return 'inbox';
    if (pathMatchesHref(path, productPath('money/fixed-costs'))) return 'fixed_costs';
    if (pathMatchesHref(path, productPath('money/income'))) return 'income';
    return 'jars';
}
