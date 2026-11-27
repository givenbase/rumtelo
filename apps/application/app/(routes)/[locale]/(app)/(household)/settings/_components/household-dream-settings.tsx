'use client';

import { useId } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';

import { HouseholdPermissionAction, HouseholdPermissionSection } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { useTranslations } from '@rumtelo/i18n';
import {
    Button,
    Field,
    Form,
    FormControl,
    FormField,
    FormItem,
    FormMessage,
    Textarea,
} from '@rumtelo/ui';

import { api } from '@/app/_lib/api';
import { apiQuery } from '@/app/_lib/api-hooks';
import { isLiveData } from '@/app/_lib/preview';
import { roleCan } from '@/app/_lib/role-permissions';
import { useBoardWriteAccess } from '@/app/_lib/use-board-write-access';
import { useAuth } from '@/components/features/shell/auth-provider';

import {
    HOUSEHOLD_WHY_MAX_LENGTH,
    householdDreamFormSchema,
    type HouseholdDreamFormValues,
} from '../_utils/settings-form-zod';
import { useSettingsMutation } from '../_utils/use-settings-mutation';
import { SettingsInkCard } from './settings-chrome';

/**
 * The household's dream: one sentence that Home shows to everyone as "Your dream". It is the
 * household's, not the person's (the personal direction lives in Mindset). The OWNER writes
 * it; everyone else reads it. Saving refreshes the household settings, which also ticks the
 * "Write down your dream" item on Home.
 */
export function HouseholdDreamSettings() {
    const t = useTranslations('pages.settings.panels.dream');
    const { householdId } = useAuth();
    const { membershipRole } = useBoardWriteAccess();
    const live = isLiveData(householdId);
    const settingsQuery = useLiveQuery(
        apiQuery.household.settings.queryOptions({ input: { householdId: householdId! } }),
        null,
        live
    );

    // Fail closed: until the membership is known nobody gets an editable field.
    const canEdit =
        membershipRole !== null &&
        roleCan(
            membershipRole,
            HouseholdPermissionSection.HOUSEHOLD_SETTINGS,
            HouseholdPermissionAction.UPDATE
        );
    const dream = settingsQuery.data?.why?.trim() ?? '';

    return (
        <SettingsInkCard eyebrow={t('eyebrow')} blurb={t('blurb')}>
            <div className="grid gap-3 py-3">
                {!live || settingsQuery.isPending ? (
                    <div aria-hidden className="h-24 animate-pulse rounded-lg bg-raised" />
                ) : canEdit && householdId ? (
                    <DreamForm key={householdId} householdId={householdId} initial={dream} />
                ) : (
                    <>
                        <p className="text-sm text-pretty [overflow-wrap:anywhere]">
                            {dream || <span className="text-fg-muted">{t('empty')}</span>}
                        </p>
                        <p className="text-xs text-pretty text-fg-muted">{t('owner_only')}</p>
                    </>
                )}
            </div>
        </SettingsInkCard>
    );
}

function DreamForm({ householdId, initial }: { householdId: string; initial: string }) {
    const t = useTranslations('pages.settings.panels.dream');
    const textId = useId();
    const hintId = useId();
    const counterId = useId();
    const form = useForm<HouseholdDreamFormValues>({
        defaultValues: { why: initial },
        resolver: zodResolver(householdDreamFormSchema),
    });
    const length = (useWatch({ control: form.control, name: 'why' }) ?? '').length;

    const save = useSettingsMutation({
        mutationFn: (values: HouseholdDreamFormValues) =>
            api.household.updateSettings({ householdId, why: values.why.trim() || null }),
        // Home, the checklist and the dashboard all read the household settings.
        invalidateKeys: [apiQuery.household.settings.key(), apiQuery.money.dashboard.get.key()],
        successMessage: t('saved'),
        onSuccess: (_saved, values) => form.reset({ why: values.why.trim() }),
    });

    const counter = t('counter', { count: length, max: HOUSEHOLD_WHY_MAX_LENGTH });
    return (
        <Form {...form}>
            <form
                className="grid gap-3"
                onSubmit={form.handleSubmit(values => save.mutate(values))}
                noValidate>
                <FormField
                    control={form.control}
                    name="why"
                    render={({ field }) => (
                        <FormItem>
                            <Field label={t('label')} htmlFor={textId}>
                                <FormControl>
                                    <Textarea
                                        {...field}
                                        id={textId}
                                        rows={3}
                                        maxLength={HOUSEHOLD_WHY_MAX_LENGTH}
                                        aria-describedby={`${hintId} ${counterId}`}
                                        className="bg-raised"
                                    />
                                </FormControl>
                            </Field>
                            <div className="mt-1.5 flex min-w-0 items-start justify-between gap-3">
                                <p
                                    id={hintId}
                                    className="min-w-0 text-xs text-pretty text-fg-muted">
                                    {t('hint')}
                                </p>
                                <p
                                    id={counterId}
                                    aria-hidden
                                    className="shrink-0 text-right text-xs text-fg-muted tabular-nums">
                                    {counter}
                                </p>
                                <span role="status" aria-live="polite" className="sr-only">
                                    {HOUSEHOLD_WHY_MAX_LENGTH - length <= 40 ? counter : ''}
                                </span>
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="flex justify-end">
                    <Button
                        type="submit"
                        className="h-12 sm:h-10"
                        disabled={!form.formState.isDirty || save.isPending}>
                        {save.isPending ? t('saving') : t('save')}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
