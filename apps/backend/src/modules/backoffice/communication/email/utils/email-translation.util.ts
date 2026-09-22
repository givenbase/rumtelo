/**
 * Email translation utilities.
 */

export type EmailLanguageObject = Record<string, Record<string, string>>;

export function createEmailTranslator(
    languageObject: EmailLanguageObject,
    locale: string,
    fallbackLocale = 'en'
) {
    return (key: string, params?: Record<string, string | number>): string => {
        const translations = languageObject[locale] || languageObject[fallbackLocale];
        let value = translations?.[key] ?? key;

        if (params) {
            for (const [paramKey, paramValue] of Object.entries(params)) {
                value = value.replaceAll(`{${paramKey}}`, String(paramValue));
            }
        }

        return value;
    };
}
