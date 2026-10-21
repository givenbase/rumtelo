'use client';

import {
    DEFAULT_VISIBILITY_SETTINGS,
    HouseholdRole,
    HouseholdSharingMode,
    VISIBILITY_AREAS,
    VisibilityArea,
    sharingModeFor,
    type HouseholdVisibilitySettings,
} from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { useTranslations } from '@rumtelo/i18n';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { api } from '@/app/_lib/api';
import { apiQuery } from '@/app/_lib/api-hooks';
import { CAPABILITIES, lockCopyFor, PlanKey } from '@/app/_lib/plan';
import { isLiveData } from '@/app/_lib/preview';
import { useBoardWriteAccess } from '@/app/_lib/use-board-write-access';
import { useAuth } from '@/components/features/shell/auth-provider';
import { usePlanCapabilities } from '@/components/features/shell/use-plan-capabilities';

import { useSettingsMutation } from '../_utils/use-settings-mutation';
import { SettingsInkCard, SettingsRowLabel } from './settings-chrome';

const MODES = Object.values(HouseholdSharingMode);
const AREAS = Object.values(VisibilityArea);

/** Copy key per area — next-intl reads dots as nesting, so `growth.course` → `growth_course`. */
const areaKey = (area: VisibilityArea) => `areas.${area.replace('.', '_')}` as const;

/**
 * "Privacy and sharing" — the household rule (OWNER-only) plus per-part overrides.
 * Rules and defaults come from `@rumtelo/contracts` (`visibility.ts`).
 */
export function SharingSettings() {
    const t = useTranslations('pages.settings.panels.sharing');
    const tRoot = useTranslations();
    const { householdId } = useAuth();
    const { membershipRole } = useBoardWriteAccess();
    const { hasCapability } = usePlanCapabilities();
    const live = isLiveData(householdId);
    const isEntitled = hasCapability(CAPABILITIES.platformSharing);
    const canEdit = live && isEntitled && membershipRole === HouseholdRole.OWNER;

    const settingsQuery = useLiveQuery(
        apiQuery.household.settings.queryOptions({ input: { householdId: householdId! } }),
        null,
        live
    );
    const current: HouseholdVisibilitySettings =
        settingsQuery.data?.visibility ?? DEFAULT_VISIBILITY_SETTINGS;

    const save = useSettingsMutation({
        mutationFn: (next: HouseholdVisibilitySettings) =>
            api.household.updateSettings({ householdId: householdId!, visibility: next }),
        invalidateKeys: [apiQuery.household.settings.key(), apiQuery.growth.course.key()],
        successMessage: t('saved'),
    });

    const setArea = (area: VisibilityArea, mode: HouseholdSharingMode | 'default') => {
        const { [area]: _dropped, ...rest } = current.areas;
        save.mutate({ ...current, areas: mode === 'default' ? rest : { ...rest, [area]: mode } });
    };

    if (!isEntitled) {
        return (
            <SettingsInkCard
                eyebrow={t('eyebrow')}
                blurb={lockCopyFor(CAPABILITIES.platformSharing, PlanKey.PLUS, tRoot).line}
            />
        );
    }

    return (
        <SettingsInkCard eyebrow={t('eyebrow')} blurb={t('blurb')}>
            <fieldset className="grid gap-2 py-3" disabled={!canEdit || save.isPending}>
                <legend className="mb-2 text-sm font-medium text-fg">{t('mode_label')}</legend>
                {MODES.map(mode => (
                    <label
                        key={mode}
                        className={cn(
                            'flex cursor-pointer gap-3 rounded-xl p-3.5',
                            current.mode === mode
                                ? 'bg-accent-soft ring-2 ring-accent'
                                : 'ring-1 ring-line hover:ring-line-strong'
                        )}>
                        <input
                            type="radio"
                            name="sharing-mode"
                            checked={current.mode === mode}
                            onChange={() => save.mutate({ ...current, mode })}
                            className="mt-1 size-4 shrink-0 accent-(--color-accent)"
                        />
                        <SettingsRowLabel
                            title={t(`modes.${mode}.name`)}
                            sub={t(`modes.${mode}.desc`)}
                        />
                    </label>
                ))}
            </fieldset>

            <div className="grid gap-1 border-t border-line py-3">
                <div className="flex items-baseline justify-between gap-2">
                    <p className="font-mono text-[11px] tracking-wide text-accent uppercase">
                        {t('areas_title')}
                    </p>
                    {canEdit && Object.keys(current.areas).length > 0 ? (
                        <button
                            type="button"
                            onClick={() => save.mutate({ ...current, areas: {} })}
                            className="text-xs font-medium text-accent hover:underline">
                            {t('areas_reset')}
                        </button>
                    ) : null}
                </div>
                {AREAS.map(area => {
                    const override = current.areas[area];
                    const byDefault = sharingModeFor(area, { ...current, areas: {} }, true);
                    const tag = override
                        ? t('area_custom')
                        : VISIBILITY_AREAS[area].isSensitive
                          ? t('area_sensitive')
                          : null;
                    return (
                        <div
                            key={area}
                            className="flex min-h-12 items-center gap-3 border-t border-line first:border-t-0">
                            <span className="flex min-w-0 flex-1 items-center gap-2 text-sm text-fg">
                                {t(areaKey(area))}
                                {tag ? (
                                    <span className="rounded-full bg-raised px-2 py-0.5 font-mono text-[10px] tracking-wide text-fg-secondary uppercase">
                                        {tag}
                                    </span>
                                ) : null}
                            </span>
                            <Select
                                value={override ?? 'default'}
                                onValueChange={value =>
                                    setArea(area, value as HouseholdSharingMode | 'default')
                                }
                                disabled={!canEdit || save.isPending}>
                                <SelectTrigger className="w-48" aria-label={t(areaKey(area))}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent position="popper">
                                    <SelectItem value="default">
                                        {`${t('area_default')} · ${t(`modes.${byDefault}.name`)}`}
                                    </SelectItem>
                                    {MODES.map(mode => (
                                        <SelectItem key={mode} value={mode}>
                                            {t(`modes.${mode}.name`)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    );
                })}
            </div>

            <p className="border-t border-line py-3 text-xs text-fg-muted">
                {membershipRole === HouseholdRole.OWNER ? t('private_always') : t('owner_only')}
            </p>
        </SettingsInkCard>
    );
}
