import { getTranslations } from '@rumtelo/i18n';
import type { Metadata } from 'next';

import { PracticeCreatePage } from '../_components/practice-create-page';

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('pages.practice');
    return { title: t('create.title') };
}

export default function CreatePracticePage() {
    return <PracticeCreatePage />;
}
