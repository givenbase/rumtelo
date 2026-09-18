/** Seed rows for backoffice.reference_growth_asset_kind. Classes, not every object. */
export const ASSET_KIND_SEED = [
    {
        key: 'PORTFOLIO',
        name: 'Portfolio',
        description: 'Funds, shares and crypto — your most liquid asset.',
        icon: '📈',
        canPay: true,
    },
    {
        key: 'PROPERTY',
        name: 'Real estate',
        description: 'A house or rental property. Part of the long game.',
        icon: '🏠',
        canPay: true,
    },
    {
        key: 'BUSINESS',
        name: 'Business',
        description: 'A company or stake in one. Usually your highest return and highest risk.',
        icon: '💼',
        canPay: true,
    },
    {
        key: 'CASH',
        name: 'Cash & reserves',
        description: 'Immediately accessible. Reassuring, but barely grows.',
        icon: '🪙',
        canPay: true,
    },
    {
        key: 'PENSION',
        name: 'Pension',
        description: 'Truly yours, but locked until you stop working.',
        icon: '🌅',
        canPay: false,
    },
    {
        key: 'VEHICLE',
        name: 'Vehicles',
        description: 'A car or a bike. Worth something, and it wears out.',
        icon: '🚗',
        canPay: false,
    },
    {
        key: 'VALUABLES',
        name: 'Valuables',
        description: 'Art, jewellery, a collection. Hard to sell in a week.',
        icon: '💎',
        canPay: false,
    },
    {
        key: 'OTHER',
        name: 'Something else',
        description: 'Owned, and none of the classes above.',
        icon: '✨',
        canPay: true,
    },
] as const;
