import { CAPABILITIES } from '@/app/_lib/plan';
import { RequireCapability } from '@/components/features/shell/require-capability';

/** All of Course — Today, Week, Goals and the week check — is Plus and Max. */
export default function CourseLayout({ children }: { children: React.ReactNode }) {
    return (
        <RequireCapability capabilityKey={CAPABILITIES.growthCourse}>{children}</RequireCapability>
    );
}
