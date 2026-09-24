/**
 * Company-authored banks for account pickers (not payment rails).
 * Keys align with former BANKING merchant keys where they were real banks.
 *
 * `partnerBankKeys` — retail banks a card issuer co-brands with / that typically
 * settle the card bill (e.g. ICS ↔ ING). Empty for plain retail banks.
 */
export const BANK_SEED = [
    {
        key: 'ING',
        name: 'ING',
        countries: ['NL'],
        ibanBankCode: 'INGB',
        logoDomain: 'ing.nl',
        website: 'https://ing.nl',
        partnerBankKeys: [] as const,
    },
    {
        key: 'ABN_AMRO',
        name: 'ABN AMRO',
        countries: ['NL'],
        ibanBankCode: 'ABNA',
        logoDomain: 'abnamro.nl',
        website: 'https://abnamro.nl',
        partnerBankKeys: [] as const,
    },
    {
        key: 'RABOBANK',
        name: 'Rabobank',
        countries: ['NL'],
        ibanBankCode: 'RABO',
        logoDomain: 'rabobank.nl',
        website: 'https://rabobank.nl',
        partnerBankKeys: [] as const,
    },
    {
        key: 'BUNQ',
        name: 'bunq',
        countries: ['NL'],
        ibanBankCode: 'BUNQ',
        logoDomain: 'bunq.com',
        website: 'https://bunq.com',
        partnerBankKeys: [] as const,
    },
    {
        key: 'REVOLUT',
        name: 'Revolut',
        countries: ['NL'],
        ibanBankCode: null,
        logoDomain: 'revolut.com',
        website: 'https://revolut.com',
        partnerBankKeys: [] as const,
    },
    {
        key: 'N26',
        name: 'N26',
        countries: ['NL'],
        ibanBankCode: null,
        logoDomain: 'n26.com',
        website: 'https://n26.com',
        partnerBankKeys: [] as const,
    },
    {
        key: 'TRIODOS',
        name: 'Triodos',
        countries: ['NL'],
        ibanBankCode: 'TRIO',
        logoDomain: 'triodos.nl',
        website: 'https://triodos.nl',
        partnerBankKeys: [] as const,
    },
    {
        key: 'ASN_BANK',
        name: 'ASN Bank',
        countries: ['NL'],
        ibanBankCode: 'ASNB',
        logoDomain: 'asnbank.nl',
        website: 'https://asnbank.nl',
        partnerBankKeys: [] as const,
    },
    {
        key: 'SNS',
        name: 'SNS',
        countries: ['NL'],
        ibanBankCode: 'SNSB',
        logoDomain: 'snsbank.nl',
        website: 'https://snsbank.nl',
        partnerBankKeys: [] as const,
    },
    {
        key: 'REGIOBANK',
        name: 'RegioBank',
        countries: ['NL'],
        ibanBankCode: 'RBRB',
        logoDomain: 'regiobank.nl',
        website: 'https://regiobank.nl',
        partnerBankKeys: [] as const,
    },
    {
        key: 'KNAB',
        name: 'Knab',
        countries: ['NL'],
        ibanBankCode: 'KNAB',
        logoDomain: 'knab.nl',
        website: 'https://knab.nl',
        partnerBankKeys: [] as const,
    },
    {
        key: 'OPENBANK',
        name: 'Openbank',
        countries: ['NL'],
        ibanBankCode: null,
        logoDomain: 'openbank.nl',
        website: 'https://openbank.nl',
        partnerBankKeys: [] as const,
    },
    /**
     * Card issuers (not retail banks). Amex/Diners issue their own cards;
     * ICS issues most NL Visa/Mastercard credit cards (often co-branded ING/ABN/ANWB).
     */
    {
        key: 'AMEX',
        name: 'American Express',
        countries: ['NL'],
        ibanBankCode: null,
        logoDomain: 'americanexpress.com',
        website: 'https://www.americanexpress.com/nl/',
        partnerBankKeys: [] as const,
    },
    {
        key: 'ICS',
        name: 'ICS',
        countries: ['NL'],
        ibanBankCode: null,
        logoDomain: 'icscards.nl',
        website: 'https://www.icscards.nl',
        /** Retail brands ICS white-labels; statements are often paid from these banks. */
        partnerBankKeys: ['ING', 'ABN_AMRO', 'ASN_BANK', 'SNS', 'REGIOBANK', 'KNAB'] as const,
    },
    {
        key: 'DINERS',
        name: 'Diners Club',
        countries: ['NL'],
        ibanBankCode: null,
        logoDomain: 'dinersclub.nl',
        website: 'https://www.dinersclub.nl',
        partnerBankKeys: [] as const,
    },
] as const;

export type BankSeedRow = (typeof BANK_SEED)[number];
