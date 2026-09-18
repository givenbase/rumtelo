import { productPath } from './routes';

/** Canonical create/update paths for money + growth entities (Meltizo shape). */
export const CREATE_HREF = {
    tx: productPath('money/transactions/create'),
    fixed: productPath('money/fixed-costs/create'),
    debt: productPath('money/debt/create'),
    income: productPath('growth/income/create'),
    goal: productPath('growth/goals/create'),
    session: productPath('energy/training/create'),
    asset: productPath('growth/net-worth/create'),
    move: productPath('money/jars/move/create'),
} as const;

export type CreateKind = keyof typeof CREATE_HREF;

export type TxDirection = 'out' | 'in';

export function spendFromJarHref(jarId: string) {
    const params = new URLSearchParams({ jarId, direction: 'out' });
    return `${CREATE_HREF.tx}?${params.toString()}`;
}

/** Transaction In into a jar (gift, top-up, tax return). */
export function addToJarHref(jarId: string) {
    const params = new URLSearchParams({ jarId, direction: 'in' });
    return `${CREATE_HREF.tx}?${params.toString()}`;
}

/** Open the ledger form (Out / In). Prefer merchantKey / categoryKey over display names. */
export function createTxHref(opts?: {
    jarId?: string;
    direction?: TxDirection;
    /** MerchantPreset catalog key. */
    merchantKey?: string;
    /** CategoryTemplate catalog key. */
    categoryKey?: string;
    /** Display-name fallback only when no catalog key. */
    counterparty?: string;
}) {
    const params = new URLSearchParams();
    if (opts?.jarId) params.set('jarId', opts.jarId);
    if (opts?.direction) params.set('direction', opts.direction);
    if (opts?.merchantKey) params.set('merchantKey', opts.merchantKey);
    if (opts?.categoryKey) params.set('categoryKey', opts.categoryKey);
    if (opts?.counterparty && !opts?.merchantKey) {
        params.set('counterparty', opts.counterparty);
    }
    const qs = params.toString();
    return qs ? `${CREATE_HREF.tx}?${qs}` : CREATE_HREF.tx;
}

/** Open the fixed-cost form pre-filled — used by the Give helper on Soul → Giving. */
export function createFixedHref(opts?: {
    jarId?: string;
    /** Display name fallback only — prefer orgKey / merchantKey. */
    counterparty?: string;
    name?: string;
    /** Give “To whom” path — known | coach | manual */
    payeeMode?: 'known' | 'coach' | 'manual';
    /** GivingOrganisation catalog key (Coach path). */
    orgKey?: string;
    /** MerchantPreset key (typed or Coach chip). */
    merchantKey?: string;
}) {
    const params = new URLSearchParams();
    if (opts?.jarId) params.set('jarId', opts.jarId);
    if (opts?.orgKey) params.set('orgKey', opts.orgKey);
    if (opts?.merchantKey) params.set('merchantKey', opts.merchantKey);
    // Name only when we have no stable key (manual / legacy links).
    if (opts?.counterparty && !opts?.orgKey && !opts?.merchantKey) {
        params.set('counterparty', opts.counterparty);
    }
    if (opts?.name) params.set('name', opts.name);
    if (opts?.payeeMode) params.set('payeeMode', opts.payeeMode);
    const qs = params.toString();
    return qs ? `${CREATE_HREF.fixed}?${qs}` : CREATE_HREF.fixed;
}

/** Open the goal form on a specific kind (SAVE | EARN | GIVE). */
export function createGoalHref(opts?: { kind?: string; jarId?: string }) {
    const params = new URLSearchParams();
    if (opts?.kind) params.set('kind', opts.kind);
    if (opts?.jarId) params.set('jarId', opts.jarId);
    const qs = params.toString();
    return qs ? `${CREATE_HREF.goal}?${qs}` : CREATE_HREF.goal;
}

/** Open move form; pass fromJarId when already inside a jar. */
export function createMoveHref(opts?: { fromJarId?: string; returnTo?: string }) {
    const params = new URLSearchParams();
    if (opts?.fromJarId) params.set('fromJarId', opts.fromJarId);
    if (opts?.returnTo) params.set('returnTo', opts.returnTo);
    const qs = params.toString();
    return qs ? `${CREATE_HREF.move}?${qs}` : CREATE_HREF.move;
}

export function updateHref(kind: Exclude<CreateKind, 'session' | 'asset' | 'move'>, id: string) {
    switch (kind) {
        case 'tx':
            return productPath(`money/transactions/update/${id}`);
        case 'fixed':
            return productPath(`money/fixed-costs/update/${id}`);
        case 'debt':
            return productPath(`money/debt/update/${id}`);
        case 'income':
            return productPath(`growth/income/update/${id}`);
        case 'goal':
            return productPath(`growth/goals/update/${id}`);
        default: {
            const exhaustive: never = kind;
            throw new Error(`Unhandled update kind: ${String(exhaustive)}`);
        }
    }
}

/** Open debt detail (progress, schedule, payment log). */
export function debtDetailHref(id: string) {
    return productPath(`money/debt/${id}`);
}

/** Open fixed-cost detail (plan + period status). Edit stays on update. */
export function fixedDetailHref(id: string) {
    return productPath(`money/fixed-costs/${id}`);
}

/** Open transaction detail. Edit stays on update. */
export function txDetailHref(id: string) {
    return productPath(`money/transactions/${id}`);
}

/** Open goal detail (pace, jar context, advice). Edit stays on update. */
export function goalDetailHref(id: string) {
    return productPath(`growth/goals/${id}`);
}
