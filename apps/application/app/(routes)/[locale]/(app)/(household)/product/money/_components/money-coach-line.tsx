'use client';

import { JarKey, MONEY_COACH_KEY_PREFIX } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { useTranslations } from '@rumtelo/i18n';
import { toPeriodKey } from '@rumtelo/utils';

import { apiQuery } from '@/app/_lib/api-hooks';
import type { CoachLineCandidate } from '@/app/_lib/coach-line';
import { useCoachFeedCandidates } from '@/app/_lib/coach-line-feed';
import { necessitiesPressureFromJars } from '@/app/_lib/necessities-pressure';
import { isLiveData } from '@/app/_lib/preview';
import { productPath } from '@/app/_lib/routes';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';
import { useJarName } from '@/app/_lib/use-jar-name';
import { CoachLine } from '@/components/features/helpers';
import { useAuth } from '@/components/features/shell/auth-provider';
import { useHouseholdShell } from '@/components/features/shell/household-shell-context';

const FEED_KEYS = [`${MONEY_COACH_KEY_PREFIX}necessities_share`];

/**
 * The one Coach line on the Money overview, after the six jar rows. Feed first
 * (`money.necessities_share`), then a local rule from the jar itself when Necessities needs
 * more than it gets. Owned here, not by `JarsPageClient embed`, so it can never render twice.
 */
export function MoneyCoachLine() {
    const t = useTranslations('features.money.jars.coach_line');
    const jarName = useJarName();
    const { householdId } = useAuth();
    const { period } = useHouseholdShell();
    const { formatMoney } = useHouseholdCurrency();
    const periodKey = toPeriodKey(period.year, period.month);
    const live = isLiveData(householdId);
    const feedCandidates = useCoachFeedCandidates(FEED_KEYS);

    // Same query options as the jar rows and Home, so the cache is shared.
    const dashboardQuery = useLiveQuery(
        apiQuery.money.dashboard.get.queryOptions({
            input: { householdId: householdId!, period: periodKey },
        }),
        null,
        live
    );

    const necessitiesJar = dashboardQuery.data?.jars.find(jar => jar.key === JarKey.NECESSITIES);
    // Measured over the Basics group (Necessities + Daily when on); the line names the Necessities pot.
    const pressure = dashboardQuery.data
        ? necessitiesPressureFromJars(dashboardQuery.data.jars)
        : null;
    const local: CoachLineCandidate[] =
        necessitiesJar && pressure?.active && pressure.shortfallCents > 0
            ? [
                  {
                      id: 'jars.necessities_over',
                      text: t('necessities_over', {
                          jar: jarName(necessitiesJar),
                          amount: formatMoney(pressure.shortfallCents),
                      }),
                      cta: { label: t('open_fixed'), href: productPath('money/fixed-costs') },
                      dismiss: { kind: 'local', fingerprint: periodKey },
                  },
              ]
            : [];

    return <CoachLine candidates={[...feedCandidates, ...local]} />;
}
