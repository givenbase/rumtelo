import { getTranslations } from '@rumtelo/i18n';

import { CAPABILITIES } from '@/app/_lib/plan';
import FeatureModalLayout from '@/components/layout/feature-modal-layout';
import { RequireCapability } from '@/components/features/shell/require-capability';

export async function generateMetadata() {
    const t = await getTranslations('pages.meta');
    return { title: t('training') };
}

export default function TrainLayout({
    children,
    modal,
}: {
    children: React.ReactNode;
    modal: React.ReactNode;
}) {
    return (
        <RequireCapability capabilityKey={CAPABILITIES.energyTraining}>
            <FeatureModalLayout modal={modal}>{children}</FeatureModalLayout>
        </RequireCapability>
    );
}
