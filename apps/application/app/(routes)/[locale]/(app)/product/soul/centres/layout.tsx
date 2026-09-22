import { getTranslations } from '@rumtelo/i18n';

import { CAPABILITIES } from '@/app/_lib/plan';
import { RequireCapability } from '@/components/features/shell/require-capability';

export async function generateMetadata() {
    const t = await getTranslations('pages.meta');
    return { title: t('centres') };
}

export default function ChakraLayout({ children }: { children: React.ReactNode }) {
    return (
        <RequireCapability capabilityKey={CAPABILITIES.soulCentres}>{children}</RequireCapability>
    );
}
