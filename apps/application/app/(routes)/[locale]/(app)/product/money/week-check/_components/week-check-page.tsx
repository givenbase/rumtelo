'use client';

import { api } from '@/app/_lib/api';
import { apiQuery } from '@/app/_lib/api-hooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { WeekCheckStage } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { Eyebrow, Typography } from '@rumtelo/ui';
import { currentWeekKey, toPeriodKey } from '@rumtelo/utils';

import { isLiveData } from '@/app/_lib/preview';
import { WeekCheckWizard } from '@/components/features/week-check/week-check-wizard';
import { useAppShell } from '@/components/features/shell/app-shell-context';
import { useAuth } from '@/components/features/shell/auth-provider';
import { PageContent } from '@/components/layout/page-content';

export function WeekCheckPageClient() {
    const queryClient = useQueryClient();
    const { householdId } = useAuth();
    const { period } = useAppShell();
    const week = currentWeekKey();
    const periodKey = toPeriodKey(period.year, period.month);
    const live = isLiveData(householdId);

    const weekCheckQuery = useLiveQuery(
        apiQuery.money.weekCheck.current.queryOptions({
            input: { householdId: householdId!, week },
        }),
        {
            id: '',
            householdId: householdId ?? '',
            week,
            stage: WeekCheckStage.LOOK,
            surplus: 0,
            allocations: [],
            intention: null,
            completedAt: null,
        },
        live
    );

    const jarsQuery = useLiveQuery(
        apiQuery.money.jars.balances.queryOptions({
            input: { householdId: householdId!, period: periodKey },
        }),
        [] as never,
        live
    );

    const advance = useMutation({
        mutationFn: async (payload: {
            stage: WeekCheckStage;
            intention?: string;
            allocations?: { jarId: string; amount: number }[];
        }) => {
            if (householdId) {
                await api.money.weekCheck.advance({
                    householdId,
                    week,
                    stage: payload.stage,
                    intention: payload.intention,
                    allocations: payload.allocations,
                });
            }
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({
                queryKey: apiQuery.money.weekCheck.current.key(),
            });
        },
    });

    const jars = (jarsQuery.data ?? []).map(j => ({
        id: j.id,
        key: j.key,
        name: j.name,
        icon: j.icon ?? '✦',
        available: j.available,
        overspent: j.overspent,
    }));

    const surplus = weekCheckQuery.data?.surplus ?? 0;

    return (
        <PageContent width="narrow" className="grid gap-8">
            <div>
                <Eyebrow>Ten minutes a week</Eyebrow>
                <Typography as="h1" className="mt-2">
                    The week check
                </Typography>
                <Typography as="p" size="sm" color="muted" className="mt-2 max-w-prose">
                    Rumtelo does not ask for your evenings. One week check — look, direct, set
                    intention — beats worrying every single day.
                </Typography>
            </div>

            <WeekCheckWizard
                jars={jars}
                surplus={surplus}
                initialStage={weekCheckQuery.data?.stage}
                onStepComplete={
                    live
                        ? (stage, payload) =>
                              advance.mutateAsync({
                                  stage,
                                  intention: payload?.intention,
                                  allocations: payload?.allocations,
                              })
                        : undefined
                }
            />
        </PageContent>
    );
}
