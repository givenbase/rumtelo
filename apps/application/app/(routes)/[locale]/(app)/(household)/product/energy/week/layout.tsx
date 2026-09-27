import { CAPABILITIES } from '@/app/_lib/plan';
import { RequireCapability } from '@/components/features/shell/require-capability';

export default function WeekLayout({ children }: { children: React.ReactNode }) {
    return (
        <RequireCapability capabilityKey={CAPABILITIES.energyWeek}>{children}</RequireCapability>
    );
}
