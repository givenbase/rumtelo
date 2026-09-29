import type { MerchantPreset } from '@rumtelo/contracts';

import type { NamePresetOption } from './preset-name-field';

/** Prefix when merchant options share a picker with other catalogs (e.g. fixed-cost presets). */
export const MERCHANT_OPTION_PREFIX = 'merchant:';

export function merchantToNameOption(
    merchant: MerchantPreset,
    opts?: {
        keyPrefix?: string;
        /** Display group label (usually category name). */
        group?: string;
        icon?: string | null;
        /** Row tag that tells vendors apart from presets in a mixed picker. */
        badge?: string | null;
    }
): NamePresetOption {
    return {
        key: `${opts?.keyPrefix ?? ''}${merchant.key}`,
        name: merchant.name,
        group: opts?.group ?? merchant.categoryTemplateKey,
        icon: opts?.icon ?? null,
        aliases: merchant.aliases,
        logoDomain: merchant.logoDomain,
        website: merchant.website,
        badge: opts?.badge ?? null,
    };
}

/** Map merchant catalog rows into PresetNameField options (vendor autocomplete). */
export function merchantsToNameOptions(
    merchants: readonly MerchantPreset[],
    opts?: {
        keyPrefix?: string;
        categoryTemplateKey?: string;
        /**
         * Drop merchants that mirror GivingOrganization — Coach owns those names
         * in the fixed-cost / Give pickers.
         */
        excludeGivingLinked?: boolean;
        /** categoryTemplateKey → human group label + optional icon */
        categoryMeta?: ReadonlyMap<string, { name: string; icon?: string | null }>;
        badge?: string | null;
    }
): NamePresetOption[] {
    let rows = opts?.categoryTemplateKey
        ? merchants.filter(merchant => merchant.categoryTemplateKey === opts.categoryTemplateKey)
        : [...merchants];

    if (opts?.excludeGivingLinked) {
        rows = rows.filter(merchant => !merchant.givingOrganizationKey);
    }

    return rows.map(merchant => {
        const meta = opts?.categoryMeta?.get(merchant.categoryTemplateKey);
        return merchantToNameOption(merchant, {
            keyPrefix: opts?.keyPrefix,
            group: meta?.name ?? merchant.categoryTemplateKey,
            icon: meta?.icon ?? null,
            badge: opts?.badge,
        });
    });
}

/** Free-text option key shared by name pickers (label editable, identity "Other"). */
export const OTHER_OPTION_KEY = 'OTHER';

/**
 * What a name field is locked to. Presets (bill types, …) and vendors are
 * different things even when they share one dropdown — keep them apart here
 * instead of encoding the difference in a string prefix.
 */
export type NameLock =
    | { kind: 'preset'; key: string }
    | { kind: 'vendor'; merchantKey: string }
    | { kind: 'other' };

/** Option key in a mixed preset + vendor picker → typed lock. */
export function nameLockFromOptionKey(key: string, prefix = MERCHANT_OPTION_PREFIX): NameLock {
    if (key === OTHER_OPTION_KEY) return { kind: 'other' };
    if (key.startsWith(prefix)) return { kind: 'vendor', merchantKey: key.slice(prefix.length) };
    return { kind: 'preset', key };
}

/** Typed lock → the option key `PresetNameField` should show as locked. */
export function nameLockToOptionKey(
    lock: NameLock | null,
    prefix = MERCHANT_OPTION_PREFIX
): string | null {
    if (!lock) return null;
    switch (lock.kind) {
        case 'preset':
            return lock.key;
        case 'vendor':
            return `${prefix}${lock.merchantKey}`;
        case 'other':
            return OTHER_OPTION_KEY;
    }
}
