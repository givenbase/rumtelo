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
    };
}

/** Map merchant catalog rows into PresetNameField options (vendor autocomplete). */
export function merchantsToNameOptions(
    merchants: readonly MerchantPreset[],
    opts?: {
        keyPrefix?: string;
        categoryTemplateKey?: string;
        /**
         * Drop merchants that mirror GivingOrganisation — Coach owns those names
         * in the fixed-cost / Give pickers.
         */
        excludeGivingLinked?: boolean;
        /** categoryTemplateKey → human group label + optional icon */
        categoryMeta?: ReadonlyMap<string, { name: string; icon?: string | null }>;
    }
): NamePresetOption[] {
    let rows = opts?.categoryTemplateKey
        ? merchants.filter(merchant => merchant.categoryTemplateKey === opts.categoryTemplateKey)
        : [...merchants];

    if (opts?.excludeGivingLinked) {
        rows = rows.filter(merchant => !merchant.givingOrganisationKey);
    }

    return rows.map(merchant => {
        const meta = opts?.categoryMeta?.get(merchant.categoryTemplateKey);
        return merchantToNameOption(merchant, {
            keyPrefix: opts?.keyPrefix,
            group: meta?.name ?? merchant.categoryTemplateKey,
            icon: meta?.icon ?? null,
        });
    });
}

export function isMerchantOptionKey(key: string, prefix = MERCHANT_OPTION_PREFIX): boolean {
    return key.startsWith(prefix);
}

export function merchantKeyFromOptionKey(key: string, prefix = MERCHANT_OPTION_PREFIX): string {
    return key.startsWith(prefix) ? key.slice(prefix.length) : key;
}
