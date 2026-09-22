import { getTranslations } from '@rumtelo/i18n';
import { StatusPage } from '@rumtelo/ui';

export default async function NotFound() {
    const t = await getTranslations();

    return (
        <StatusPage
            type="not-found"
            statusCode={404}
            title={t('ui.statusPage.not_found.title')}
            description={t('ui.statusPage.not_found.description')}
            goBackLabel={t('ui.statusPage.go_back')}
            homeHref="/"
            homeLabel={t('ui.statusPage.back_home')}
        />
    );
}
