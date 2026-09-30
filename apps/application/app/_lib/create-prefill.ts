/**
 * Parse cross-route prefill from the create URLs built in `create-routes.ts`.
 * Kept tiny and defensive: anything missing is simply not prefilled.
 *
 * Catalog identity: prefer stable keys (`orgKey` / `merchantKey` / `categoryKey`).
 * `counterparty` is a display-name fallback for manual / legacy links only.
 */
import { GoalKind } from '@rumtelo/contracts';

type ParamSource = { get(name: string): string | null };

const GIVE_PAYEE_MODES = ['known', 'coach', 'manual'] as const;
export type GivePayeeModePrefill = (typeof GIVE_PAYEE_MODES)[number];

export function fixedCostPrefillFromParams(params: ParamSource) {
    const jarId = params.get('jarId')?.trim();
    const counterparty = params.get('counterparty')?.trim();
    const name = params.get('name')?.trim();
    const orgKey = params.get('orgKey')?.trim();
    const merchantKey = params.get('merchantKey')?.trim();
    const amount = params.get('amount')?.trim();
    const categoryId = params.get('categoryId')?.trim();
    const dueDayRaw = params.get('dueDay')?.trim();
    const due = dueDayRaw && Number.isFinite(Number(dueDayRaw)) ? Number(dueDayRaw) : null;
    const dueDay = due !== null && due >= 1 && due <= 31 ? String(due) : undefined;
    const transactionId = params.get('transactionId')?.trim();
    const assetId = assetIdFromParams(params);
    const payeeModeRaw = params.get('payeeMode')?.trim();
    const payeeMode =
        payeeModeRaw && (GIVE_PAYEE_MODES as readonly string[]).includes(payeeModeRaw)
            ? (payeeModeRaw as GivePayeeModePrefill)
            : undefined;
    if (
        !jarId &&
        !counterparty &&
        !name &&
        !payeeMode &&
        !orgKey &&
        !merchantKey &&
        !amount &&
        !categoryId &&
        !dueDay &&
        !transactionId &&
        !assetId
    ) {
        return undefined;
    }
    return {
        ...(jarId ? { jarId } : {}),
        ...(assetId ? { assetId } : {}),
        ...(counterparty ? { counterparty } : {}),
        ...(name ? { name } : {}),
        ...(payeeMode ? { payeeMode } : {}),
        ...(orgKey ? { orgKey } : {}),
        ...(merchantKey ? { merchantKey } : {}),
        ...(amount ? { amount } : {}),
        ...(categoryId ? { categoryId } : {}),
        ...(dueDay ? { dueDay } : {}),
        ...(transactionId ? { transactionId } : {}),
    };
}

/** Ledger create — merchant/category keys win over counterparty display name. */
export function txPrefillFromParams(params: ParamSource) {
    const jarId = params.get('jarId')?.trim();
    const merchantKey = params.get('merchantKey')?.trim();
    const categoryKey = params.get('categoryKey')?.trim();
    const counterparty = params.get('counterparty')?.trim();
    const assetId = assetIdFromParams(params);
    if (!jarId && !merchantKey && !categoryKey && !counterparty && !assetId) {
        return undefined;
    }
    return {
        ...(jarId ? { jarId } : {}),
        ...(merchantKey ? { merchantKey } : {}),
        ...(categoryKey ? { categoryKey } : {}),
        ...(counterparty && !merchantKey ? { counterparty } : {}),
        ...(assetId ? { assetId } : {}),
    };
}

/** Income create — only the holding it comes from (asset in). */
export function incomePrefillFromParams(params: ParamSource) {
    const assetId = assetIdFromParams(params);
    return assetId ? { assetId } : undefined;
}

/** Growth holding id (uuid) from `?assetId=` — locks the holding picker on money forms. */
export function assetIdFromParams(params: ParamSource): string | undefined {
    const raw = params.get('assetId')?.trim();
    if (!raw || raw.length > 64) return undefined;
    return raw;
}

export function goalKindFromParams(params: ParamSource): GoalKind | undefined {
    const raw = params.get('kind');
    return raw && (Object.values(GoalKind) as string[]).includes(raw)
        ? (raw as GoalKind)
        : undefined;
}

export function goalJarIdFromParams(params: ParamSource): string | undefined {
    const jarId = params.get('jarId')?.trim();
    return jarId || undefined;
}

/** Asset class key from New asset. Unknown keys are ignored by the form. */
export function assetKindFromParams(params: ParamSource): string | undefined {
    const kind = params.get('kind')?.trim();
    if (!kind || kind.length > 64) return undefined;
    return kind;
}
