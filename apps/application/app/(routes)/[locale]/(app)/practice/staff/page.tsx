import { getTranslations } from '@rumtelo/i18n';
import type { Metadata } from 'next';

import { PracticeStaffPage } from '../_components/practice-staff-page';

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('pages.practice');
    return { title: t('staff.title') };
}

export default function StaffPage() {
    return <PracticeStaffPage />;
}
