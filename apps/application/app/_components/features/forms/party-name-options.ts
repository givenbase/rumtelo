import type { Party } from '@rumtelo/contracts';

import type { NamePresetOption } from './preset-name-field';

/** Prefix when party options share a picker with catalog merchants. */
export const PARTY_OPTION_PREFIX = 'party:';

export function partyToNameOption(
    party: Pick<Party, 'id' | 'name' | 'aliases' | 'icon' | 'logoDomain' | 'website' | 'color'>,
    opts?: { badge?: string | null; group?: string }
): NamePresetOption {
    return {
        key: `${PARTY_OPTION_PREFIX}${party.id}`,
        name: party.name,
        group: opts?.group,
        icon: party.icon ?? null,
        aliases: party.aliases,
        logoDomain: party.logoDomain,
        website: party.website,
        badge: opts?.badge ?? null,
    };
}

/** Map household parties into PresetNameField options. */
export function partiesToNameOptions(
    parties: readonly Pick<
        Party,
        'id' | 'name' | 'aliases' | 'icon' | 'logoDomain' | 'website' | 'color'
    >[],
    opts?: { badge?: string | null; group?: string }
): NamePresetOption[] {
    return parties.map(party => partyToNameOption(party, opts));
}

/**
 * What the counterparty field is locked to — catalog merchant, saved party, or free text.
 * Mutually exclusive merchant / party (same rule as the backend).
 */
export type CounterpartyLock =
    | { kind: 'merchant'; merchantKey: string }
    | { kind: 'party'; partyId: string }
    | { kind: 'free' };

export function counterpartyLockFromOptionKey(
    key: string,
    partyPrefix = PARTY_OPTION_PREFIX
): CounterpartyLock {
    if (key.startsWith(partyPrefix)) {
        return { kind: 'party', partyId: key.slice(partyPrefix.length) };
    }
    return { kind: 'merchant', merchantKey: key };
}

/** Edit hydrate: lock chip key for PresetNameField. */
export function counterpartyLockToOptionKey(
    lock: CounterpartyLock | null,
    partyPrefix = PARTY_OPTION_PREFIX
): string | null {
    if (!lock || lock.kind === 'free') return null;
    if (lock.kind === 'party') return `${partyPrefix}${lock.partyId}`;
    return lock.merchantKey;
}
