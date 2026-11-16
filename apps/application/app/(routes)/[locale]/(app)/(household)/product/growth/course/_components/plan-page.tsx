'use client';

import Link from 'next/link';

import { JarKey, type Jar } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { useTranslations } from '@rumtelo/i18n';
import { BrandLoader, Icon, Typography } from '@rumtelo/ui';

import { apiQuery } from '@/app/_lib/api-hooks';
import { CAPABILITIES } from '@/app/_lib/plan';
import { isLiveData } from '@/app/_lib/preview';
import { useAuth } from '@/components/features/shell/auth-provider';
import { useHouseholdShell } from '@/components/features/shell/household-shell-context';
import { usePlanCapabilities } from '@/components/features/shell/use-plan-capabilities';

import { courseHref } from '../_utils/course-route';
import { PlanWizard } from './plan-wizard';

const EMPTY_JARS: Jar[] = [];

/**
 * Course › Plan your year: the intake that turns a few answers into year goals, first
 * steps and routines. Same shell as the week check; opens from the Goals tab.
 */
export function PlanPage() {
    const t = useTranslations('features.growth.course.plan');
    const tCourse = useTranslations('features.growth.course');
    const tLoading = useTranslations('ui.statusPage');
    const { householdId } = useAuth();
    const { period } = useHouseholdShell();
    const { hasCapability } = usePlanCapabilities();
    const live = isLiveData(householdId);

    const year = String(period.year);
    const boardMonth = `${year}-${String(period.month).padStart(2, '0')}`;

    const settingsQuery = useLiveQuery(apiQuery.account.settings.queryOptions(), null, live);
    const jarsQuery = useLiveQuery(
        apiQuery.money.jars.list.queryOptions({ input: { householdId: householdId! } }),
        EMPTY_JARS,
        live
    );

    // Jars a goal can draw on; Financial Freedom is for investing and never a goal's jar.
    const jars = jarsQuery.data.filter(
        jar => jar.capabilities.canSave && jar.key !== JarKey.FINANCIAL_FREEDOM
    );
    const isLoading = live && (settingsQuery.isPending || jarsQuery.isPending);

    return (
        <div className="mx-auto grid w-full max-w-2xl gap-6">
            <header className="grid gap-1">
                <Link
                    href={courseHref(boardMonth)}
                    className="inline-flex w-fit items-center gap-1 rounded-md text-sm text-fg-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
                    <Icon name="chevron-left" size="sm" aria-hidden />
                    {t('close')}
                </Link>
                <Typography as="p" variant="eyebrow" color="primary">
                    {tCourse('eyebrow')}
                </Typography>
                <Typography as="h1">{t('title', { year })}</Typography>
            </header>

            {isLoading ? (
                <BrandLoader label={tLoading('loading')} />
            ) : (
                <PlanWizard
                    householdId={householdId!}
                    year={year}
                    boardMonth={boardMonth}
                    initial={{
                        workSituation: settingsQuery.data?.workSituation ?? null,
                        yearIntention: settingsQuery.data?.yearIntention ?? null,
                    }}
                    jars={jars}
                    canAmounts={hasCapability(CAPABILITIES.growthGoals)}
                    isLive={live}
                />
            )}
        </div>
    );
}
