import { getTranslations } from '@rumtelo/i18n';
import type { Metadata } from 'next';

import { StartOwnChooser } from './_components/start-own-chooser';

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('pages.shell.viewer');
    return { title: t('chooser_title') };
}

export default function StartOwnPage() {
    return <StartOwnChooser />;
}
