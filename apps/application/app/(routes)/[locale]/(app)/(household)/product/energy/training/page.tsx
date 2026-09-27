import { getTranslations } from '@rumtelo/i18n';
import { EmptyState, Section, Typography } from '@rumtelo/ui';

import { CREATE_HREF } from '@/app/_lib/create-routes';
import { ListToolbar } from '@/components/layout/list-toolbar';

export async function generateMetadata() {
    const t = await getTranslations('features.energy.training');
    return { title: t('eyebrow') };
}

export default async function TrainingPage() {
    const t = await getTranslations('features.energy.training');

    return (
        <div className="grid animate-rise gap-6">
            <Section eyebrow={t('eyebrow')} title={t('title')}>
                <Typography as="p" variant="lead" size="default">
                    {t('lead')}
                </Typography>
            </Section>

            <ListToolbar createLabel={t('add_session')} createHref={CREATE_HREF.session} />

            <EmptyState icon="dumbbell" title={t('empty_title')} body={t('empty_body')} />
        </div>
    );
}
