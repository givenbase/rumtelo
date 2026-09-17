import { notFound } from 'next/navigation';

import { GoalDetailPageClient } from '../_components/goal-detail-page';

export const metadata = { title: 'Goal' };

export default async function GoalDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    if (!id) notFound();

    return <GoalDetailPageClient goalId={id} />;
}
