import type { IntlLocale } from '@rumtelo/contracts';

export type TransactionInPresetCopy = { name: string; groupName: string };

/**
 * Non-English transaction-in preset name + groupName, keyed by intl locale then key.
 * Do not include `en`; English lives on the row.
 */
export const TRANSACTION_IN_PRESET_TRANSLATIONS: Partial<
    Record<IntlLocale, Record<string, TransactionInPresetCopy>>
> = {
    nl: {
        GIFT: { name: 'Cadeau', groupName: 'Mensen' },
        INHERITANCE: { name: 'Erfenis', groupName: 'Mensen' },
        REPAID: { name: 'Iemand heeft me terugbetaald', groupName: 'Mensen' },
        REFUND: { name: 'Terugbetaling', groupName: 'Terug naar jou' },
        CASHBACK: { name: 'Cashback', groupName: 'Terug naar jou' },
        DEPOSIT_RETURN: { name: 'Borg terug', groupName: 'Terug naar jou' },
        INSURANCE_PAYOUT: { name: 'Verzekeringsuitkering', groupName: 'Terug naar jou' },
        TAX_RETURN: { name: 'Belastingteruggave', groupName: 'Officieel' },
        BENEFIT_EXTRA: { name: 'Uitkering / toeslag', groupName: 'Officieel' },
        REIMBURSEMENT: { name: 'Vergoeding', groupName: 'Officieel' },
        BONUS: { name: 'Bonus', groupName: 'Officieel' },
        SOLD: { name: 'Iets verkocht', groupName: 'Verkocht' },
        INVESTMENT_CASH_OUT: { name: 'Uitbetaling van beleggingen', groupName: 'Verkocht' },
        OTHER_IN: { name: 'Overige', groupName: 'Overige' },
    },
    es: {
        GIFT: { name: 'Regalo', groupName: 'Personas' },
        INHERITANCE: { name: 'Herencia', groupName: 'Personas' },
        REPAID: { name: 'Alguien me devolvió dinero', groupName: 'Personas' },
        REFUND: { name: 'Reembolso', groupName: 'De vuelta a ti' },
        CASHBACK: { name: 'Cashback', groupName: 'De vuelta a ti' },
        DEPOSIT_RETURN: { name: 'Fianza devuelta', groupName: 'De vuelta a ti' },
        INSURANCE_PAYOUT: { name: 'Indemnización del seguro', groupName: 'De vuelta a ti' },
        TAX_RETURN: { name: 'Devolución de impuestos', groupName: 'Oficial' },
        BENEFIT_EXTRA: { name: 'Prestación / complemento', groupName: 'Oficial' },
        REIMBURSEMENT: { name: 'Reembolso', groupName: 'Oficial' },
        BONUS: { name: 'Bonificación', groupName: 'Oficial' },
        SOLD: { name: 'He vendido algo', groupName: 'Vendido' },
        INVESTMENT_CASH_OUT: { name: 'Retirada de fondos de una inversión', groupName: 'Vendido' },
        OTHER_IN: { name: 'Otros', groupName: 'Otros' },
    },
    fr: {
        GIFT: { name: 'Cadeau', groupName: 'Personnes' },
        INHERITANCE: { name: 'Héritage', groupName: 'Personnes' },
        REPAID: { name: "Quelqu'un m'a remboursé", groupName: 'Personnes' },
        REFUND: { name: 'Remboursement', groupName: 'De retour vers toi' },
        CASHBACK: { name: 'Cashback', groupName: 'De retour vers toi' },
        DEPOSIT_RETURN: { name: 'Caution restituée', groupName: 'De retour vers toi' },
        INSURANCE_PAYOUT: { name: "Indemnité d'assurance", groupName: 'De retour vers toi' },
        TAX_RETURN: { name: "Remboursement d'impôt", groupName: 'Officiel' },
        BENEFIT_EXTRA: { name: 'Prestation / allocation', groupName: 'Officiel' },
        REIMBURSEMENT: { name: 'Remboursement', groupName: 'Officiel' },
        BONUS: { name: 'Bonus', groupName: 'Officiel' },
        SOLD: { name: "J'ai vendu quelque chose", groupName: 'Vendu' },
        INVESTMENT_CASH_OUT: { name: "Remboursement d'un placement", groupName: 'Vendu' },
        OTHER_IN: { name: 'Autres', groupName: 'Autres' },
    },
};
