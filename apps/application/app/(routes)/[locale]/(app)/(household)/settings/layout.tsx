import { SettingsShell } from '@/components/layout/settings-shell';

import { PracticePreviewSettingsGuard } from './_components/practice-preview-settings-guard';

/**
 * Settings layout — sidebar rail stays mounted; each section is a nested route
 * (e.g. `/settings/product/money/jars`, `/settings/general/plan`).
 * Practice coaches previewing a client cannot open household settings.
 */
export default function SettingsLayout({ children }: { children: React.ReactNode }) {
    return (
        <PracticePreviewSettingsGuard>
            <SettingsShell>{children}</SettingsShell>
        </PracticePreviewSettingsGuard>
    );
}
