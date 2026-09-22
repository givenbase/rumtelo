import { getTranslations } from '@rumtelo/i18n';
import { EmptyState, Section, Typography } from '@rumtelo/ui';

export async function generateMetadata() {
    const t = await getTranslations('features.energy.sleep');
    return { title: t('eyebrow') };
}

export default async function SleepPage() {
    const t = await getTranslations('features.energy.sleep');

    return (
        <div className="grid animate-rise gap-6">
            <Section eyebrow={t('eyebrow')} title={t('title')}>
                <Typography as="p" variant="lead" size="default">
                    {t('lead')}
                </Typography>
            </Section>

            <EmptyState icon="🌙" title={t('empty_title')} body={t('empty_body')} />
        </div>
    );
}
