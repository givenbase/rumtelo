/** Suggested names for New asset. Keys match the other catalogs: RENT, HOME, CAR. */
export const ASSET_PRESET_SEED = [
    { key: 'SAVINGS_ACCOUNT', name: 'Savings account', kindKey: 'CASH', description: null },
    { key: 'CASH_RESERVE', name: 'Cash reserve', kindKey: 'CASH', description: null },
    { key: 'BROKERAGE', name: 'Brokerage account', kindKey: 'PORTFOLIO', description: null },
    {
        key: 'DIVIDEND_PORTFOLIO',
        name: 'Dividend portfolio',
        kindKey: 'PORTFOLIO',
        description: null,
    },
    { key: 'INDEX_FUNDS', name: 'Index funds', kindKey: 'PORTFOLIO', description: null },
    { key: 'CRYPTO_WALLET', name: 'Crypto wallet', kindKey: 'PORTFOLIO', description: null },
    { key: 'HOME', name: 'Home', kindKey: 'PROPERTY', description: null },
    { key: 'RENTAL', name: 'Rental property', kindKey: 'PROPERTY', description: null },
    { key: 'COMPANY', name: 'The company', kindKey: 'BUSINESS', description: null },
    { key: 'STAKE', name: 'A stake', kindKey: 'BUSINESS', description: null },
    { key: 'WORKPLACE_PENSION', name: 'Workplace pension', kindKey: 'PENSION', description: null },
    { key: 'PRIVATE_PENSION', name: 'Private pension', kindKey: 'PENSION', description: null },
    { key: 'CAR', name: 'Car', kindKey: 'VEHICLE', description: null },
    { key: 'ART', name: 'Art', kindKey: 'VALUABLES', description: null },
    { key: 'JEWELLERY', name: 'Jewellery', kindKey: 'VALUABLES', description: null },
    { key: 'OTHER', name: 'Something else', kindKey: 'OTHER', description: null },
] as const;
