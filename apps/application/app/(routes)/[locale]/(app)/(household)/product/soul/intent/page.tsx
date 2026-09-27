import { getTranslations } from '@rumtelo/i18n';
import { Eyebrow, Section, Typography } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { PageContent } from '@/components/layout/page-content';

import { IntentStillnessLink } from './_components/intent-stillness-link';

export async function generateMetadata() {
    const t = await getTranslations('features.soul.intent');
    return { title: t('eyebrow') };
}

export default async function IntentPage() {
    const t = await getTranslations('features.soul.intent');
    const exampleIntent = t('example');
    const hasIntent = Boolean(exampleIntent);

    return (
        <PageContent width="narrow" className="grid animate-rise gap-6">
            <Section eyebrow={t('eyebrow')} title={t('title')}>
                <Typography as="p" variant="lead" size="default">
                    {t('lead')}
                </Typography>
            </Section>

            {/* ── Intent card ── */}
            <div className="grid gap-4 rounded-2xl border border-accent/35 bg-surface p-6 shadow-glow">
                <Eyebrow>{t('my_intention')}</Eyebrow>

                <input
                    type="text"
                    defaultValue={exampleIntent}
                    placeholder={t('placeholder')}
                    className={cn(
                        'w-full rounded-xl border border-line-strong bg-raised p-4',
                        'font-display text-lg tracking-tight text-fg lg:text-xl',
                        'placeholder:text-fg-faint',
                        'transition-colors focus:border-accent focus:outline-none'
                    )}
                />

                {hasIntent && (
                    <Typography as="p" variant="eyebrow" color="success">
                        {t('set_for_week')}
                    </Typography>
                )}

                <IntentStillnessLink />
            </div>

            {/* ── Tip ── */}
            <Typography as="p" size="sm" color="muted" className="text-fg-faint">
                {t('tip')}
            </Typography>
        </PageContent>
    );
}
