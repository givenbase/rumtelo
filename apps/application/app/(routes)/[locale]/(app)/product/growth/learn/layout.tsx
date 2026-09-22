import { CAPABILITIES } from '@/app/_lib/plan';
import { RequireCapability } from '@/components/features/shell/require-capability';

import { LearnCatalogProvider } from './learn-catalog-provider';
import { LearnShelfProvider } from './learn-shelf';

export default function LearnLayout({ children }: { children: React.ReactNode }) {
    return (
        <RequireCapability capabilityKey={CAPABILITIES.growthLearn}>
            <LearnShelfProvider>
                <LearnCatalogProvider>{children}</LearnCatalogProvider>
            </LearnShelfProvider>
        </RequireCapability>
    );
}
