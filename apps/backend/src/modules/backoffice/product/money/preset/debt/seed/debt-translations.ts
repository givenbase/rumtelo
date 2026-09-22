import type { IntlLocale } from '@rumtelo/contracts';

/**
 * Non-English debt preset names, keyed by intl locale then preset key.
 * Do not include `en`; English lives on the preset row.
 */
export const DEBT_PRESET_TRANSLATIONS: Partial<Record<IntlLocale, Record<string, string>>> = {
    nl: {
        CREDIT_CARD: 'Creditcard',
        STUDENT: 'Studielening',
        MORTGAGE: 'Hypotheek',
        LOAN: 'Persoonlijke lening',
        CAR_LOAN: 'Autolening / particuliere lease',
        PHONE_PLAN: 'Telefoon-/apparaatabonnement',
        BNPL: 'Nu kopen, later betalen',
        GOV_PLAN: 'Betalingsregeling van de overheid',
        OVERDRAFT: 'Rekening-courantkrediet / roodstand',
        FAMILY: 'Familie / vrienden',
        OTHER: 'Overige',
    },
    es: {
        CREDIT_CARD: 'Tarjeta de crédito',
        STUDENT: 'Préstamo para estudios',
        MORTGAGE: 'Hipoteca',
        LOAN: 'Préstamo personal',
        CAR_LOAN: 'Préstamo para la compra de un coche / arrendamiento privado',
        PHONE_PLAN: 'Plan de teléfono/dispositivo',
        BNPL: 'Compra ahora, paga después',
        GOV_PLAN: 'Plan de pago del Gobierno',
        OVERDRAFT: 'Descubierto / saldo negativo',
        FAMILY: 'Familia / amigos',
        OTHER: 'Otros',
    },
    fr: {
        CREDIT_CARD: 'Carte de crédit',
        STUDENT: 'Prêt étudiant',
        MORTGAGE: 'Prêt immobilier',
        LOAN: 'Prêt personnel',
        CAR_LOAN: 'Crédit automobile / location longue durée pour particuliers',
        PHONE_PLAN: 'Forfait téléphone / appareil',
        BNPL: 'Achetez maintenant, payez plus tard',
        GOV_PLAN: 'Plan de paiement du gouvernement',
        OVERDRAFT: 'Découvert / solde débiteur',
        FAMILY: 'Famille / amis',
        OTHER: 'Autres',
    },
};
