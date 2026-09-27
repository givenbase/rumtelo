import { PracticeSettingsShell } from '../_components/practice-settings-shell';

/**
 * Practice settings layout — tab rail stays mounted; each section is a nested route
 * (`/practice/settings/billing`, `/practice/settings/company`).
 */
export default function PracticeSettingsLayout({ children }: { children: React.ReactNode }) {
    return <PracticeSettingsShell>{children}</PracticeSettingsShell>;
}
