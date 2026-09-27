import { getTranslations } from '@rumtelo/i18n';

export async function generateMetadata() {
    const t = await getTranslations('pages.meta');
    return { title: t('stillness') };
}

export default function StillnessLayout({ children }: { children: React.ReactNode }) {
    return children;
}
