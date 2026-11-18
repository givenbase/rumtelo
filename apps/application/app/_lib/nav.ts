/**
 * Navigation model: products as pills and tabs (Home · Money · Growth), each with its own
 * subnav, plus You (The Coach, Why, Settings, Help, Practice, staging previews).
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
    roleCanSee,
    type PlanKey,
} from '@rumtelo/contracts';
import type { IconName } from '@rumtelo/ui';

import { stageAtLeast } from './board-stage';
import { isProductEnabled } from './launch-products';
import { normalizeAppPathname, pathMatchesHref } from './path';
import { practicePath, productPath } from './routes';

export { normalizeAppPathname };

/** Same as `pathMatchesHref`; kept under its original name for existing importers. */
export const pathMatchesNavHref = pathMatchesHref;

export type NavTabKey = 'home' | 'money' | 'growth' | 'you';

/** Compact labels for the desktop pill bar and bottom tabs. */
export const TOP_PILL_LABEL_KEYS: Record<string, string> = {
    home: 'pages.nav.pills.home',
    money: 'pages.nav.pills.money',
    growth: 'pages.nav.pills.growth',
    you: 'pages.nav.pills.you',
    energy: 'pages.nav.pills.energy',
    soul: 'pages.nav.pills.soul',
};

export interface NavTab {
    key: NavTabKey;
    /** `null` for You, which opens the avatar menu (desktop) or a sheet (phone) instead of navigating. */
    href: string | null;
    labelKey: string;
    glyph: string;
    /**
     * True for the Growth slot while the board stage is still loading: the bottom tabs keep
     * the cell (no jump) but render nothing in it; the desktop pills skip it.
     */
    pending?: boolean;
}

export type MoneySubnavKey =
    | 'jars'
    | 'transactions'
    | 'fixed_costs'
    | 'income'
    | 'debt'
    | 'net_worth';
export type GrowthSubnavKey = 'course' | 'goals' | 'learn';
export type SubnavKey = MoneySubnavKey | GrowthSubnavKey;

/**
 * How a product page shows in its subnav.
 * - `open`: a normal link.
 * - `later`: the ladder keeps it quiet for now (muted, clock). It still opens.
 * - `locked`: the plan does not include it (lock). The link leads to the LockCard page.
 */
export type SubnavState = 'open' | 'later' | 'locked';

/** What brings a deferred page to the front (search hits and muted items carry the hint). */
export type DeferredUntil = 'week_check' | 'month_close';

export interface SubnavItem<Key extends SubnavKey = SubnavKey> {
    key: Key;
    href: string;
    labelKey: string;
    state: SubnavState;
    /** Set when `state` is `later`. */
    laterUntil?: DeferredUntil;
    /** `transactions` shows the count of items still to sort. */
    badge?: 'to_sort';
}

export type MoneySubnavItem = SubnavItem<MoneySubnavKey>;
export type GrowthSubnavItem = SubnavItem<GrowthSubnavKey>;

export type YouRowKey = 'coach' | 'why' | 'settings' | 'energy' | 'soul';

export type YouRow =
    | {
          kind: 'link';
          key: YouRowKey;
          href: string;
          labelKey: string;
          icon: IconName;
          /** `preview` marks staging-only products; the menu groups them under "Preview". */
          badgeKey?: 'preview';
      }
    | { kind: 'help' }
    | { kind: 'practice'; href: string }
    | { kind: 'exit_preview'; href: string }
    /** One row for what the board ladder has not shown yet. `stage` is the next stage that adds something. */
    | { kind: 'coming_up'; stage: BoardStage; items: StageItem[] };

export interface SearchableNavItem {
    href: string;
    labelKey: string;
    /** Set when the ladder keeps this page quiet for now. It still opens. */
    deferredUntil?: DeferredUntil;
}

/** Everything `buildNav` needs. Pure data, so the model is testable without React. */
export interface NavContext {
    /** Role used for section visibility. Fail-open OWNER while membership loads. */
    role: HouseholdRole;
    /** True once the real membership role is known (gates lock rows, fail closed). */
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
    growthSubnav: GrowthSubnavItem[];
    youRows: YouRow[];
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
const YOU_TAB: NavTab = {
    key: 'you',
    href: null,
    labelKey: TOP_PILL_LABEL_KEYS.you!,
    glyph: '☺',
};

/** Where the Growth tab lands: Course with Plus and Max, the 1-goal list on Basic. */
export function growthTabHref(ctx: Pick<NavContext, 'has' | 'planReady'>): string {
    if (!ctx.planReady) return productPath('growth');
    return ctx.has(CAPABILITIES.growthCourse)
        ? productPath('growth/course')
        : productPath('growth/goals');
}

/** A person who can change the plan: lock rows are an upgrade path, so only for them. */
function isWriter(ctx: NavContext): boolean {
    return ctx.membershipKnown && ctx.role !== HouseholdRole.VIEWER && !ctx.preview.active;
}

function growthAvailable(ctx: NavContext): boolean {
    return isProductEnabled('growth') && roleCanSee(ctx.role, HouseholdPermissionSection.GROWTH);
}

interface SubnavDefinition<Key extends SubnavKey> {
    key: Key;
    href: string;
    labelKey: string;
    section: HouseholdPermissionSection;
    /** Plan capability; without it the page is in every plan. */
    capability?: string;
    /** The ladder stage that brings this page to the front. */
    fromStage?: BoardStage.ROUTINE | BoardStage.MONTH;
    badge?: 'to_sort';
}

const { MONEY, GROWTH } = HouseholdPermissionSection;

const MONEY_DEFINITIONS: SubnavDefinition<MoneySubnavKey>[] = [
    {
        key: 'jars',
        href: productPath('money'),
        labelKey: 'pages.nav.children.jars',
        section: MONEY,
    },
    {
        key: 'transactions',
        href: productPath('money/transactions'),
        labelKey: 'pages.nav.children.transactions',
        section: MONEY,
        badge: 'to_sort',
    },
    {
        key: 'fixed_costs',
        href: productPath('money/fixed-costs'),
        labelKey: 'pages.nav.children.fixed_costs',
        section: MONEY,
    },
    // Income keeps its Growth role section, so a VIEWER (Growth = none) does not see it.
    {
        key: 'income',
        href: productPath('money/income'),
        labelKey: 'pages.nav.children.income',
        section: GROWTH,
    },
    {
        key: 'debt',
        href: productPath('money/debt'),
        labelKey: 'pages.nav.children.debt',
        section: MONEY,
        capability: CAPABILITIES.moneyDebt,
        fromStage: BoardStage.MONTH,
    },
    {
        key: 'net_worth',
        href: productPath('money/net-worth'),
        labelKey: 'pages.nav.children.net_worth',
        section: MONEY,
        capability: CAPABILITIES.growthNetWorth,
        fromStage: BoardStage.MONTH,
    },
];

const GROWTH_DEFINITIONS: SubnavDefinition<GrowthSubnavKey>[] = [
    {
        key: 'course',
        href: productPath('growth/course'),
        labelKey: 'pages.nav.children.course',
        section: GROWTH,
        capability: CAPABILITIES.growthCourse,
        fromStage: BoardStage.ROUTINE,
    },
    {
        key: 'goals',
        href: productPath('growth/goals'),
        labelKey: 'pages.nav.children.goals',
        section: GROWTH,
        capability: CAPABILITIES.growthGoals,
        fromStage: BoardStage.ROUTINE,
    },
    {
        key: 'learn',
        href: productPath('growth/learn'),
        labelKey: 'pages.nav.children.learn',
        section: GROWTH,
        capability: CAPABILITIES.growthLearn,
        fromStage: BoardStage.MONTH,
    },
];

function deferredUntilFor(stage: BoardStage): DeferredUntil {
    return stage === BoardStage.ROUTINE ? 'week_check' : 'month_close';
}

/**
 * One product page in its subnav, or null when this person never sees it. Hidden is not
 * removed: a `later` item still opens. A plan lock only shows to a writer once the first
 * week check is done, so week 1 never turns into an upsell countdown.
 */
function resolveSubnavItem<Key extends SubnavKey>(
    ctx: NavContext,
    definition: SubnavDefinition<Key>
): SubnavItem<Key> | null {
    if (!roleCanSee(ctx.role, definition.section)) return null;
    const base = {
        key: definition.key,
        href: definition.href,
        labelKey: definition.labelKey,
        ...(definition.badge ? { badge: definition.badge } : {}),
    };
    if (definition.capability) {
        // Never flash a plan-dependent item (or a lock) while the plan loads.
        if (!ctx.planReady) return null;
        if (!ctx.has(definition.capability)) {
            return isWriter(ctx) && stageAtLeast(ctx.stage, BoardStage.ROUTINE)
                ? { ...base, state: 'locked' }
                : null;
        }
    }
    if (definition.fromStage && !stageAtLeast(ctx.stage, definition.fromStage)) {
        return { ...base, state: 'later', laterUntil: deferredUntilFor(definition.fromStage) };
    }
    return { ...base, state: 'open' };
}

function buildMoneySubnav(ctx: NavContext): MoneySubnavItem[] {
    return MONEY_DEFINITIONS.flatMap(definition => resolveSubnavItem(ctx, definition) ?? []);
}

function buildGrowthSubnav(ctx: NavContext): GrowthSubnavItem[] {
    if (!growthAvailable(ctx)) return [];
    return GROWTH_DEFINITIONS.flatMap(definition => resolveSubnavItem(ctx, definition) ?? []);
}

/** Cross-product rows (The Coach, Why Rumtelo, Settings, Help, Practice) and staging previews. */
function buildYouRows(ctx: NavContext, comingUp: YouRow | null): YouRow[] {
    const { role, preview } = ctx;
    const rows: YouRow[] = [];
    const sees = (section: HouseholdPermissionSection) => roleCanSee(role, section);
    const atLeast = (minimum: BoardStage) => stageAtLeast(ctx.stage, minimum);

    if (preview.active) rows.push({ kind: 'exit_preview', href: practicePath('clients') });

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
            labelKey: 'pages.nav.you.settings',
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
    // They sit in You under "Preview" so the phone tab bar stays at four cells.
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
    growthSubnav: GrowthSubnavItem[],
    youRows: YouRow[]
): SearchableNavItem[] {
    const items: SearchableNavItem[] = [];
    const seen = new Set<string>();
    const add = (href: string, labelKey: string, deferredUntil?: DeferredUntil) => {
        if (seen.has(href)) return;
        seen.add(href);
        items.push({ href, labelKey, ...(deferredUntil ? { deferredUntil } : {}) });
    };
    // A plan-locked page is never offered in search.
    const offer = (item: SubnavItem) => {
        if (item.state !== 'locked') add(item.href, item.labelKey, item.laterUntil);
    };

    add('/', 'pages.nav.pills.home');
    for (const item of moneySubnav) offer(item);
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
        for (const item of growthSubnav) {
            if (item.key === 'learn') offer(item);
        }
    }
    for (const row of youRows) {
        if (row.kind === 'link') add(row.href, row.labelKey);
    }
    return items;
}

function buildTabs(ctx: NavContext): NavTab[] {
    const tabs: NavTab[] = [HOME_TAB, MONEY_TAB];
    if (growthAvailable(ctx) && stageAtLeast(ctx.stage, BoardStage.ROUTINE)) {
        tabs.push({
            key: 'growth',
            href: growthTabHref(ctx),
            labelKey: TOP_PILL_LABEL_KEYS.growth!,
            glyph: '↗',
            ...(ctx.stageReady ? {} : { pending: true }),
        });
    }
    tabs.push(YOU_TAB);
    return tabs;
}

/** Tabs, product subnavs, You rows and search for one context, without the Coming up row. */
function buildParts(ctx: NavContext, comingUp: YouRow | null) {
    const tabs = buildTabs(ctx);
    const moneySubnav = buildMoneySubnav(ctx);
    const growthSubnav = buildGrowthSubnav(ctx);
    const youRows = buildYouRows(ctx, comingUp);
    return {
        tabs,
        moneySubnav,
        growthSubnav,
        youRows,
        searchable: buildSearchable(ctx, tabs, moneySubnav, growthSubnav, youRows),
    };
}

// ── The ladder: what the next stage adds on this plan and role ────────────────

export type StageItemKey = 'course' | 'goals' | 'coach' | 'debt' | 'net_worth' | 'learn';

export type StageItem = { kind: 'nav'; key: StageItemKey } | { kind: 'levels' };

/** Items the ladder brings to the front, in menu order, with the stage that does it. */
function ladderItems(ctx: NavContext): { key: StageItemKey; from: BoardStage }[] {
    // Resolve at the full board so a plan-locked page (never part of the ladder) drops out.
    const full: NavContext = { ...ctx, stage: BoardStage.MONTH, stageReady: true };
    const growth = buildGrowthSubnav(full);
    const money = buildMoneySubnav(full);
    const open = (items: readonly SubnavItem[], key: SubnavKey) =>
        items.find(item => item.key === key && item.state === 'open');
    const items: { key: StageItemKey; from: BoardStage }[] = [];
    if (growthAvailable(ctx)) {
        // Plus and Max land on Course, Basic on the 1-goal list: announce one of them.
        if (open(growth, 'course')) items.push({ key: 'course', from: BoardStage.ROUTINE });
        else if (open(growth, 'goals')) items.push({ key: 'goals', from: BoardStage.ROUTINE });
    }
    if (open(money, 'debt')) items.push({ key: 'debt', from: BoardStage.MONTH });
    if (open(money, 'net_worth')) items.push({ key: 'net_worth', from: BoardStage.MONTH });
    if (open(growth, 'learn')) items.push({ key: 'learn', from: BoardStage.MONTH });
    if (buildYouRows(full, null).some(row => row.kind === 'link' && row.key === 'coach')) {
        items.push({ key: 'coach', from: BoardStage.ROUTINE });
    }
    return items;
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
 * What `to` brings to the front that `from` did not, for this plan and role. Built from the
 * same definitions as the subnavs, so Coming up and the "New" note can never disagree with
 * them. Plan locks are never listed; `levels` is what a first closed month adds.
 */
export function stageAdditions(ctx: NavContext, from: BoardStage, to: BoardStage): StageItem[] {
    const items: StageItem[] = ladderItems(ctx)
        .filter(item => !stageAtLeast(from, item.from) && stageAtLeast(to, item.from))
        .map(item => ({ kind: 'nav', key: item.key }));
    if (to === BoardStage.MONTH && from !== BoardStage.MONTH && !ctx.hasClosedMonth) {
        items.push({ kind: 'levels' });
    }
    return items;
}

/** The first stage above the current one that adds something, or null. */
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

/** Pages the ladder keeps out of the nav entirely (The Coach, the Growth tab), still findable in Quick add. */
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
    const next =
        isWriter(ctx) && ctx.stageReady && !stageAtLeast(ctx.stage, BoardStage.MONTH)
            ? nextVisibleStage(ctx)
            : null;
    const parts = buildParts(
        ctx,
        next ? { kind: 'coming_up', stage: next.stage, items: next.items } : null
    );
    return {
        tabs: parts.tabs,
        moneySubnav: parts.moneySubnav,
        growthSubnav: parts.growthSubnav,
        youRows: parts.youRows,
        searchable: ctx.stageReady
            ? [...parts.searchable, ...deferredSearchable(ctx, parts.searchable)]
            : parts.searchable,
    };
}

const YOU_PATHS: ReadonlyArray<{ prefix: string; key: YouRowKey }> = [
    { prefix: productPath('coach'), key: 'coach' },
    { prefix: productPath('why'), key: 'why' },
    { prefix: '/settings', key: 'settings' },
    { prefix: productPath('energy'), key: 'energy' },
    { prefix: productPath('soul'), key: 'soul' },
];

/** The You row that owns this path, if any. */
export function activeYouRowKey(pathname: string): YouRowKey | null {
    const path = normalizeAppPathname(pathname);
    return YOU_PATHS.find(entry => pathMatchesHref(path, entry.prefix))?.key ?? null;
}

/** The legacy Net worth route under Growth still belongs to Money. */
const GROWTH_NET_WORTH = productPath('growth/net-worth');

/**
 * Which top tab is active. A page that belongs to a product highlights that product
 * (Debt and Net worth are Money, Learn is Growth); The Coach, Why, Settings and the
 * staging previews highlight You.
 */
export function activeTabForPath(pathname: string): NavTabKey | null {
    const path = normalizeAppPathname(pathname);
    if (path === '/') return 'home';
    if (activeYouRowKey(path)) return 'you';
    if (pathMatchesHref(path, productPath('money')) || pathMatchesHref(path, GROWTH_NET_WORTH)) {
        return 'money';
    }
    if (pathMatchesHref(path, productPath('growth'))) return 'growth';
    return null;
}

/** Which Money sub-item is active (Jars is the default for the Money root and week check). */
export function activeMoneySubnavKey(pathname: string): MoneySubnavKey {
    const path = normalizeAppPathname(pathname);
    if (pathMatchesHref(path, productPath('money/transactions'))) return 'transactions';
    if (pathMatchesHref(path, productPath('money/fixed-costs'))) return 'fixed_costs';
    if (pathMatchesHref(path, productPath('money/income'))) return 'income';
    if (pathMatchesHref(path, productPath('money/debt'))) return 'debt';
    if (
        pathMatchesHref(path, productPath('money/net-worth')) ||
        pathMatchesHref(path, GROWTH_NET_WORTH)
    ) {
        return 'net_worth';
    }
    return 'jars';
}

/** Which Growth sub-item is active; the Growth root opens Course. Null for other Growth pages. */
export function activeGrowthSubnavKey(pathname: string): GrowthSubnavKey | null {
    const path = normalizeAppPathname(pathname);
    if (pathMatchesHref(path, productPath('growth/goals'))) return 'goals';
    if (pathMatchesHref(path, productPath('growth/learn'))) return 'learn';
    if (path === productPath('growth') || pathMatchesHref(path, productPath('growth/course'))) {
        return 'course';
    }
    return null;
}
