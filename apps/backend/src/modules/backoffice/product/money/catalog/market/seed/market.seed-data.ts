/**
 * Market catalog — ISO 3166-1 alpha-2 keys. Order = sortOrder.
 * Add a row here to open a market; merchant seeds reference these keys.
 */
export type MarketSeed = {
    key: string;
    name: string;
    isActive?: boolean;
};

export const MARKET_SEED: readonly MarketSeed[] = [
    { key: 'NL', name: 'Netherlands' },
    { key: 'BE', name: 'Belgium', isActive: false },
    { key: 'DE', name: 'Germany', isActive: false },
];
