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
    const payeeModeRaw = params.get('payeeMode')?.trim();
    const payeeMode =
        payeeModeRaw && (GIVE_PAYEE_MODES as readonly string[]).includes(payeeModeRaw)
            ? (payeeModeRaw as GivePayeeModePrefill)
            : undefined;
    if (!jarId && !counterparty && !name && !payeeMode && !orgKey && !merchantKey) {
        return undefined;
    }
    return {
        ...(jarId ? { jarId } : {}),
        ...(counterparty ? { counterparty } : {}),
        ...(name ? { name } : {}),
        ...(payeeMode ? { payeeMode } : {}),
        ...(orgKey ? { orgKey } : {}),
        ...(merchantKey ? { merchantKey } : {}),
    };
}

/** Ledger create — merchant/category keys win over counterparty display name. */
export function txPrefillFromParams(params: ParamSource) {
    const jarId = params.get('jarId')?.trim();
    const merchantKey = params.get('merchantKey')?.trim();
    const categoryKey = params.get('categoryKey')?.trim();
    const counterparty = params.get('counterparty')?.trim();
    if (!jarId && !merchantKey && !categoryKey && !counterparty) {
        return undefined;
    }
    return {
        ...(jarId ? { jarId } : {}),
        ...(merchantKey ? { merchantKey } : {}),
        ...(categoryKey ? { categoryKey } : {}),
        ...(counterparty && !merchantKey ? { counterparty } : {}),
    };
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
