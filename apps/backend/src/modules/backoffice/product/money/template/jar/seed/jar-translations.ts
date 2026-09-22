import { JarKey, type IntlLocale } from '@rumtelo/contracts';

export type JarTemplateCopy = { name: string; subtitle: string };

/**
 * Non-English jar template copy, keyed by intl locale then JarKey.
 * Add locales as siblings — seeder upserts every key here.
 * Do not include `en`; English lives on the template row.
 * Locale list: contracts {@link Locale} / {@link LOCALE_TO_INTL}.
 */
export const JAR_TEMPLATE_TRANSLATIONS: Partial<
    Record<IntlLocale, Partial<Record<JarKey, JarTemplateCopy>>>
> = {
    nl: {
        [JarKey.NECESSITIES]: { name: 'Noodzakelijk', subtitle: 'Vaste lasten' },
        [JarKey.FINANCIAL_FREEDOM]: { name: 'Financiële vrijheid', subtitle: 'Nooit uitgeven' },
        [JarKey.LONG_TERM_SAVINGS]: { name: 'Langetermijn sparen', subtitle: 'Grote dingen' },
        [JarKey.EDUCATION]: { name: 'Opleiding', subtitle: 'Investeer in jezelf' },
        [JarKey.PLAY]: { name: 'Plezier', subtitle: 'Zonder schuldgevoel' },
        [JarKey.GIVE]: { name: 'Geven / stichting', subtitle: 'Geef door' },
    },
    es: {
        [JarKey.NECESSITIES]: { name: 'Necesidades', subtitle: 'Gastos fijos' },
        [JarKey.FINANCIAL_FREEDOM]: { name: 'Libertad financiera', subtitle: 'Nunca gastar' },
        [JarKey.LONG_TERM_SAVINGS]: { name: 'Ahorro a largo plazo', subtitle: 'Cosas grandes' },
        [JarKey.EDUCATION]: { name: 'Educación', subtitle: 'Invierte en ti' },
        [JarKey.PLAY]: { name: 'Ocio', subtitle: 'Sin culpa' },
        [JarKey.GIVE]: { name: 'Dar / fundación', subtitle: 'Hazlo circular' },
    },
    fr: {
        [JarKey.NECESSITIES]: { name: 'Nécessités', subtitle: 'Charges fixes' },
        [JarKey.FINANCIAL_FREEDOM]: { name: 'Liberté financière', subtitle: 'Ne jamais dépenser' },
        [JarKey.LONG_TERM_SAVINGS]: { name: 'Épargne long terme', subtitle: 'Les grandes choses' },
        [JarKey.EDUCATION]: { name: 'Éducation', subtitle: 'Investis en toi' },
        [JarKey.PLAY]: { name: 'Plaisir', subtitle: 'Sans culpabilité' },
        [JarKey.GIVE]: { name: 'Donner / fondation', subtitle: 'Fais circuler' },
    },
};
