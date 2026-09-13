/**
 * Parse cross-route prefill from the create URLs built in `create-routes.ts`.
 * Kept tiny and defensive: anything missing is simply not prefilled.
 */
import { GoalKind } from '@rumtelo/contracts';

type ParamSource = { get(name: string): string | null };

export function fixedCostPrefillFromParams(params: ParamSource) {
    const jarId = params.get('jarId')?.trim();
    const counterparty = params.get('counterparty')?.trim();
    const name = params.get('name')?.trim();
    if (!jarId && !counterparty && !name) return undefined;
    return {
        ...(jarId ? { jarId } : {}),
        ...(counterparty ? { counterparty } : {}),
        ...(name ? { name } : {}),
    };
}

export function goalKindFromParams(params: ParamSource): GoalKind | undefined {
    const raw = params.get('kind');
    return raw && (Object.values(GoalKind) as string[]).includes(raw)
        ? (raw as GoalKind)
        : undefined;
}
