'use client';

import { HouseholdRole, type HouseholdFeatureSettings } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { useTranslations } from '@rumtelo/i18n';
import { Toggle } from '@rumtelo/ui';

import { api } from '@/app/_lib/api';
import { apiQuery } from '@/app/_lib/api-hooks';
import { CAPABILITIES } from '@/app/_lib/plan';
import { isLiveData } from '@/app/_lib/preview';
import { useBoardWriteAccess } from '@/app/_lib/use-board-write-access';
import { useAuth } from '@/components/features/shell/auth-provider';
import { usePlanCapabilities } from '@/components/features/shell/use-plan-capabilities';

import { useSettingsMutation } from '../_utils/use-settings-mutation';
import { SettingsInkCard } from './settings-chrome';

type CourseLayerFlag = keyof Pick<
    HouseholdFeatureSettings,
    'isCourseQuartersEnabled' | 'isCourseDaysEnabled'
>;

const LAYERS: ReadonlyArray<{ flag: CourseLayerFlag; copy: 'quarters' | 'days' }> = [
    { flag: 'isCourseQuartersEnabled', copy: 'quarters' },
    { flag: 'isCourseDaysEnabled', copy: 'days' },
];

/** Course layers beyond goals · month · week. OWNER writes; hidden without Course. */
export function CourseLayersSettings() {
    const t = useTranslations('pages.settings.panels.course_layers');
    const tSharing = useTranslations('pages.settings.panels.sharing');
    const { householdId } = useAuth();
    const { membershipRole } = useBoardWriteAccess();
    const { hasCapability } = usePlanCapabilities();
    const live = isLiveData(householdId);
    const isOwner = membershipRole === HouseholdRole.OWNER;

    const settingsQuery = useLiveQuery(
        apiQuery.household.settings.queryOptions({ input: { householdId: householdId! } }),
        null,
        live
    );
    const save = useSettingsMutation({
        mutationFn: (patch: Partial<Record<CourseLayerFlag, boolean>>) =>
            api.household.updateSettings({ householdId: householdId!, features: patch }),
        invalidateKeys: [apiQuery.household.settings.key()],
        successMessage: t('saved'),
    });

    if (!hasCapability(CAPABILITIES.growthCourse)) return null;
    const features = settingsQuery.data?.features;

    return (
        <SettingsInkCard eyebrow={t('eyebrow')} blurb={t('blurb')}>
            <div className="grid gap-1 py-2">
                {LAYERS.map(layer => (
                    <Toggle
                        key={layer.flag}
                        checked={features?.[layer.flag] ?? false}
                        label={t(`${layer.copy}_title`)}
                        hint={t(`${layer.copy}_sub`)}
                        disabled={!live || !isOwner || save.isPending}
                        onCheckedChange={next => save.mutate({ [layer.flag]: next })}
                    />
                ))}
                {!isOwner ? (
                    <p className="text-xs text-fg-muted">{tSharing('owner_only')}</p>
                ) : null}
            </div>
        </SettingsInkCard>
    );
}
