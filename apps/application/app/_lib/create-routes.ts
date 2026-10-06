import { productPath } from './routes';

/** Canonical create/update paths for money + growth entities. */
export const CREATE_HREF = {
    tx: productPath('money/transactions/create'),
    importStatement: productPath('money/transactions/import'),
    fixed: productPath('money/fixed-costs/create'),
    debt: productPath('money/debt/create'),
    income: productPath('growth/income/create'),
    goal: productPath('growth/goals/create'),
    session: productPath('energy/training/create'),
    asset: productPath('money/net-worth/create'),
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
    /** Growth holding this one-off belongs to — locks the holding picker. */
    assetId?: string;
}) {
    const params = new URLSearchParams();
    if (opts?.jarId) params.set('jarId', opts.jarId);
    if (opts?.direction) params.set('direction', opts.direction);
    if (opts?.merchantKey) params.set('merchantKey', opts.merchantKey);
    if (opts?.categoryKey) params.set('categoryKey', opts.categoryKey);
    if (opts?.counterparty && !opts?.merchantKey) {
        params.set('counterparty', opts.counterparty);
    }
    if (opts?.assetId) params.set('assetId', opts.assetId);
    const qs = params.toString();
    return qs ? `${CREATE_HREF.tx}?${qs}` : CREATE_HREF.tx;
}

/** Open the income form; a holding locks the “Part of a holding” picker (asset in). */
export function createIncomeHref(opts?: { assetId?: string }) {
    const params = new URLSearchParams();
    if (opts?.assetId) params.set('assetId', opts.assetId);
    const qs = params.toString();
    return qs ? `${CREATE_HREF.income}?${qs}` : CREATE_HREF.income;
}

/** Open the fixed-cost form pre-filled — used by the Give helper on Soul → Giving. */
export function createFixedHref(opts?: {
    jarId?: string;
    /** Display name fallback only — prefer orgKey / merchantKey. */
    counterparty?: string;
    name?: string;
    /** Give “To whom” path — known | coach | manual */
    payeeMode?: 'known' | 'coach' | 'manual';
    /** GivingOrganization catalog key (Coach path). */
    orgKey?: string;
    /** MerchantPreset key (typed or Coach chip). */
    merchantKey?: string;
    /** Form amount string (major units, e.g. "49,95"). */
    amount?: string;
    /** Household category id to copy from a ledger row. */
    categoryId?: string;
    /** Day of month 1–31 (e.g. from bookedOn). */
    dueDay?: number | string;
    /** After create, link this transaction as settlement for the new bill. */
    transactionId?: string;
    /** Growth holding this bill is paid for — locks the holding picker (asset out). */
    assetId?: string;
}) {
    const params = new URLSearchParams();
    if (opts?.jarId) params.set('jarId', opts.jarId);
    if (opts?.assetId) params.set('assetId', opts.assetId);
    if (opts?.orgKey) params.set('orgKey', opts.orgKey);
    if (opts?.merchantKey) params.set('merchantKey', opts.merchantKey);
    // Name only when we have no stable key (manual / legacy links).
    if (opts?.counterparty && !opts?.orgKey && !opts?.merchantKey) {
        params.set('counterparty', opts.counterparty);
    }
    if (opts?.name) params.set('name', opts.name);
    if (opts?.payeeMode) params.set('payeeMode', opts.payeeMode);
    if (opts?.amount?.trim()) params.set('amount', opts.amount.trim());
    if (opts?.categoryId) params.set('categoryId', opts.categoryId);
    if (opts?.dueDay !== undefined && opts.dueDay !== null && String(opts.dueDay).trim()) {
        params.set('dueDay', String(opts.dueDay).trim());
    }
    if (opts?.transactionId) params.set('transactionId', opts.transactionId);
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

/** Open New asset. A class key locks that class and hides the others. */
export function createAssetHref(kindKey?: string) {
    if (!kindKey) return CREATE_HREF.asset;
    const params = new URLSearchParams({ kind: kindKey });
    return `${CREATE_HREF.asset}?${params.toString()}`;
}

/** Open move form; pass fromJarId when already inside a jar. */
export function createMoveHref(opts?: { fromJarId?: string; returnTo?: string }) {
    const params = new URLSearchParams();
    if (opts?.fromJarId) params.set('fromJarId', opts.fromJarId);
    if (opts?.returnTo) params.set('returnTo', opts.returnTo);
    const qs = params.toString();
    return qs ? `${CREATE_HREF.move}?${qs}` : CREATE_HREF.move;
}

export function updateHref(
    kind: Exclude<CreateKind, 'session' | 'move' | 'importStatement'>,
    id: string
) {
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
        case 'asset':
            return productPath(`money/net-worth/update/${id}`);
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

/** Open asset detail (value, monthly pay, class). Edit stays on update. */
export function assetDetailHref(id: string, opts?: { setup?: 'in' | 'out' }) {
    const base = productPath(`money/net-worth/${id}`);
    return opts?.setup ? `${base}?setup=${opts.setup}` : base;
}

/** Geld → Fixed costs filtered to one holding (bills + income). */
export function fixedCostsForAssetHref(assetId: string, tab?: 'out' | 'in') {
    const params = new URLSearchParams({ assetId });
    if (tab) params.set('tab', tab);
    return `${productPath('money/fixed-costs')}?${params.toString()}`;
}

/** Geld → Transactions filtered to one holding. */
export function transactionsForAssetHref(assetId: string) {
    const params = new URLSearchParams({ assetId });
    return `${productPath('money/transactions')}?${params.toString()}`;
}
