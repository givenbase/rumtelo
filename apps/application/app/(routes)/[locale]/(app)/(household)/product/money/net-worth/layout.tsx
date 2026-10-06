import { CAPABILITIES } from '@/app/_lib/plan';
import { RequireCapability } from '@/components/features/shell/require-capability';
import FeatureModalLayout from '@/components/layout/feature-modal-layout';

export default function NetWorthLayout(props: {
    children: React.ReactNode;
    modal: React.ReactNode;
}) {
    return (
        <RequireCapability capabilityKey={CAPABILITIES.growthNetWorth}>
            <FeatureModalLayout {...props} />
        </RequireCapability>
    );
}
