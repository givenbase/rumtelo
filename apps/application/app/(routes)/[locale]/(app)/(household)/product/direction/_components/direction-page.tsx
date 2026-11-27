'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useLiveQuery } from '@rumtelo/hooks';
import { useTranslations } from '@rumtelo/i18n';
import { BrandLoader, Typography } from '@rumtelo/ui';

import { apiQuery } from '@/app/_lib/api-hooks';
import { isLiveData } from '@/app/_lib/preview';
import { useAuth } from '@/components/features/shell/auth-provider';
import { usePracticePreview } from '@/components/features/shell/practice-preview';

import { DirectionForm } from './direction-form';
import { DirectionGoals } from './direction-goals';
import { DirectionNow } from './direction-now';

/**
 * Where you're going (Mindset): the signed-in person's own direction. Everything personal on
 * this page comes from the account settings, read once here and handed down; the household
 * blocks (now, goals) read the board and follow plan and role.
 *
 * A Practice preview is a client's board, so this page never renders in one.
 */
export function DirectionPage() {
    const t = useTranslations('features.soul.direction');
    const tLoading = useTranslations('ui.statusPage');
    const router = useRouter();
    const { householdId } = useAuth();
    const { capabilities } = usePracticePreview();
    const settingsQuery = useLiveQuery(
        apiQuery.account.settings.queryOptions(),
        null,
        isLiveData(householdId) && !capabilities.active
    );

    useEffect(() => {
        if (capabilities.active) router.replace('/');
    }, [capabilities.active, router]);

    if (capabilities.active) return <BrandLoader label={tLoading('loading')} />;

    const settings = settingsQuery.data;
    return (
        <div className="mx-auto grid w-full max-w-2xl min-w-0 gap-6">
            <header className="grid gap-1">
                <Typography as="p" variant="eyebrow" color="primary">
                    {t('eyebrow')}
                </Typography>
                <Typography as="h1" className="text-balance">
                    {t('title')}
                </Typography>
                <Typography as="p" size="sm" color="muted" className="text-pretty">
                    {t('lead')}
                </Typography>
            </header>

            <DirectionNow
                workSituation={settings?.workSituation ?? null}
                yearIntention={settings?.yearIntention ?? null}
            />

            {settingsQuery.isError ? (
                <p role="alert" className="text-sm text-pretty text-fg-muted">
                    {t('load_error')}
                </p>
            ) : settingsQuery.isPending ? (
                <div
                    aria-hidden
                    className="h-64 animate-pulse rounded-2xl border border-line bg-surface"
                />
            ) : (
                <DirectionForm settings={settings} />
            )}

            <DirectionGoals />
        </div>
    );
}
