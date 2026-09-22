import { getTranslations } from '@rumtelo/i18n';
import { BrandLoader } from '@rumtelo/ui';

export default async function Loading() {
    const t = await getTranslations('ui.statusPage');
    return <BrandLoader fullScreen label={t('loading')} />;
}
