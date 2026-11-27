'use client';

import Link from 'next/link';

import { HouseholdRole } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { useTranslations } from '@rumtelo/i18n';
import { Button, Card, Typography } from '@rumtelo/ui';

import { apiQuery } from '@/app/_lib/api-hooks';
import { practicePath } from '@/app/_lib/routes';
import { useBoardWriteAccess } from '@/app/_lib/use-board-write-access';

/**
 * "Start a practice" lives here (OWNER only, and only while the person has no practice).
 * It left the avatar menu so the menu stays about the account, not about a second product.
 */
export function StartPracticeCard() {
    const t = useTranslations('pages.practice.switcher');
    const { membershipRole } = useBoardWriteAccess();
    const practiceListQuery = useLiveQuery(apiQuery.practice.list.queryOptions(), [], true);

    if (membershipRole !== HouseholdRole.OWNER) return null;
    if (!practiceListQuery.isSuccess || (practiceListQuery.data?.length ?? 0) > 0) return null;

    return (
        <Card className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="grid min-w-0 gap-1">
                <Typography as="h3" size="sm" className="text-base">
                    {t('start_practice')}
                </Typography>
                <Typography as="p" size="sm" color="muted" className="text-pretty">
                    {t('start_practice_sub')}
                </Typography>
            </div>
            <Button
                as={Link}
                href={practicePath('create')}
                variant="secondary"
                className="w-full sm:w-auto">
                {t('start_practice')}
            </Button>
        </Card>
    );
}
