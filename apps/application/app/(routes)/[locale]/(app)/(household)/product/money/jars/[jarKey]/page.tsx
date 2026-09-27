import { getTranslations } from '@rumtelo/i18n';
import { notFound } from 'next/navigation';

import { slugToJarKey } from '@/app/_lib/jar-slug';

import { JarDetailPageClient } from './_components/jar-detail-page';

export async function generateMetadata() {
    const t = await getTranslations('pages.meta');
    return { title: t('jar') };
}

export default async function JarDetailPage({ params }: { params: Promise<{ jarKey: string }> }) {
    const { jarKey: slug } = await params;
    const jarKey = slugToJarKey(slug);
    if (!jarKey) notFound();

    return <JarDetailPageClient jarKey={jarKey} />;
}
