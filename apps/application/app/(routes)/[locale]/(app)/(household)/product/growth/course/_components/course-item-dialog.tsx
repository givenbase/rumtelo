'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, useWatch } from 'react-hook-form';

import {
    GoalStatus,
    CourseHorizon,
    CourseScope,
    VisibilityChoice,
    ancestorPeriodOf,
    canHaveScope,
    canLinkMoneyGoal,
    childVisibilityOptions,
    isCountableLayer,
    isOutcomeLayer,
    choiceOf,
    type CourseItem,
} from '@rumtelo/contracts';
import { useLocale, useTranslations } from '@rumtelo/i18n';
import {
    Button,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    Field,
    Form,
    FormControl,
    FormField,
    FormItem,
    FormMessage,
    Input,
    Textarea,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@rumtelo/ui';

import { api } from '@/app/_lib/api';
import { useApiError } from '@/app/_lib/api-error-messages';
import { apiQuery } from '@/app/_lib/api-hooks';
import { VisibilityPicker } from '@/components/features/household/visibility-picker';
import { useHouseholdShell } from '@/components/features/shell/household-shell-context';

import { periodLabel } from '../_utils/course-route';
import {
    NONE,
    courseItemFormSchema,
    optionalCount,
    optionalId,
    optionalScope,
    type CourseItemFormValues,
} from '../_utils/course-form';

export type CourseDialogState =
    | {
          mode: 'create';
          horizon: CourseHorizon;
          period: string;
          /** Fixed parent ("Add to this week", "Step for …"): shown read-only, no picker. */
          parent?: CourseItem;
      }
    | { mode: 'edit'; item: CourseItem };

const SCOPES = [CourseScope.PERSONAL, CourseScope.BUSINESS] as const;

/** Create or edit one Course item. */
export function CourseItemDialog({
    state,
    onClose,
    householdId,
    visibilityOptions,
    defaultVisibility,
    isPickerShown,
    ownerName,
    layerName,
}: {
    state: CourseDialogState | null;
    onClose: () => void;
    householdId: string;
    visibilityOptions: readonly VisibilityChoice[];
    defaultVisibility: VisibilityChoice;
    isPickerShown: boolean;
    ownerName: string | null;
    layerName: (horizon: CourseHorizon) => string;
}) {
    const t = useTranslations('features.growth.course.form');
    const tUi = useTranslations();
    const horizon = state?.mode === 'edit' ? state.item.horizon : state?.horizon;

    return (
        <Dialog open={state !== null} onOpenChange={open => (open ? null : onClose())}>
            <DialogContent className="sm:max-w-lg" closeLabel={tUi('ui.button.actions.close')}>
                <DialogHeader>
                    <DialogTitle>
                        {state?.mode === 'edit'
                            ? t('title_edit')
                            : horizon === CourseHorizon.YEAR
                              ? t('title_create_goal')
                              : t('title_create', { layer: horizon ? layerName(horizon) : '' })}
                    </DialogTitle>
                    <DialogDescription>{t('description')}</DialogDescription>
                </DialogHeader>
                {state ? (
                    <CourseItemForm
                        key={
                            state.mode === 'edit'
                                ? state.item.id
                                : `${state.horizon}:${state.period}:${state.parent?.id ?? ''}`
                        }
                        state={state}
                        householdId={householdId}
                        visibilityOptions={visibilityOptions}
                        defaultVisibility={defaultVisibility}
                        isPickerShown={isPickerShown}
                        ownerName={ownerName}
                        layerName={layerName}
                        onDone={onClose}
                    />
                ) : null}
            </DialogContent>
        </Dialog>
    );
}

function CourseItemForm({
    state,
    householdId,
    visibilityOptions,
    defaultVisibility,
    isPickerShown,
    ownerName,
    layerName,
    onDone,
}: {
    state: CourseDialogState;
    householdId: string;
    visibilityOptions: readonly VisibilityChoice[];
    defaultVisibility: VisibilityChoice;
    isPickerShown: boolean;
    ownerName: string | null;
    layerName: (horizon: CourseHorizon) => string;
    onDone: () => void;
}) {
    const t = useTranslations('features.growth.course.form');
    const tCourse = useTranslations('features.growth.course');
    const tGoal = useTranslations('features.growth.course.goal');
    const locale = useLocale();
    const queryClient = useQueryClient();
    const { showToast } = useHouseholdShell();
    const apiError = useApiError();

    const item = state.mode === 'edit' ? state.item : null;
    const horizon = item?.horizon ?? (state.mode === 'create' ? state.horizon : CourseHorizon.WEEK);
    const period = item?.period ?? (state.mode === 'create' ? state.period : '');
    const year = period.slice(0, 4);
    const fixedParent = state.mode === 'create' ? (state.parent ?? null) : null;

    // Possible parents: goals, quarters and months of this year (and the week, for a day).
    const yearQuery = useQuery({
        ...apiQuery.growth.course.year.queryOptions({ input: { householdId, year } }),
        enabled: horizon !== CourseHorizon.YEAR && !fixedParent,
    });
    const weekPeriod = ancestorPeriodOf(horizon, period, CourseHorizon.WEEK);
    const weekQuery = useQuery({
        ...apiQuery.growth.course.period.queryOptions({
            input: { householdId, horizon: CourseHorizon.WEEK, period: weekPeriod ?? undefined },
        }),
        enabled: weekPeriod !== null && !fixedParent,
    });
    const goalsQuery = useQuery({
        ...apiQuery.money.goals.list.queryOptions({ input: { householdId } }),
        enabled: canLinkMoneyGoal(horizon),
    });

    const parents = [...(yearQuery.data ?? []), ...(weekQuery.data?.items ?? [])].filter(
        candidate =>
            candidate.id !== item?.id &&
            ancestorPeriodOf(horizon, period, candidate.horizon) === candidate.period
    );
    const moneyGoals = (goalsQuery.data ?? []).filter(goal => goal.status === GoalStatus.ACTIVE);

    const form = useForm<CourseItemFormValues>({
        resolver: zodResolver(courseItemFormSchema),
        defaultValues: {
            name: item?.name ?? '',
            doneWhen: item?.doneWhen ?? '',
            parentId: item?.parentId ?? fixedParent?.id ?? NONE,
            visibility: item ? choiceOf(item) : defaultVisibility,
            goalId: item?.goalId ?? NONE,
            scope: item?.scope ?? NONE,
            targetCount: item?.targetCount ? String(item.targetCount) : '',
        },
    });
    const parentId = useWatch({ control: form.control, name: 'parentId' });
    const parent = fixedParent ?? parents.find(candidate => candidate.id === parentId) ?? null;
    const currentChoice = item ? choiceOf(item) : null;
    const allowed = childVisibilityOptions(
        // Editing keeps the current choice selectable even when it is no longer offered.
        currentChoice && !visibilityOptions.includes(currentChoice)
            ? [...visibilityOptions, currentChoice]
            : visibilityOptions,
        parent
    );

    const save = useMutation({
        mutationFn: (values: CourseItemFormValues) => {
            const visibility = allowed.includes(values.visibility)
                ? values.visibility
                : (allowed[0] ?? VisibilityChoice.PRIVATE);
            const common = {
                householdId,
                name: values.name,
                doneWhen: isOutcomeLayer(horizon) && values.doneWhen ? values.doneWhen : null,
                parentId: optionalId(values.parentId),
                goalId: canLinkMoneyGoal(horizon) ? optionalId(values.goalId) : null,
                targetCount: isCountableLayer(horizon) ? optionalCount(values.targetCount) : null,
                ...(canHaveScope(horizon) ? { scope: optionalScope(values.scope) } : {}),
            };
            if (item) {
                return api.growth.course.update({
                    ...common,
                    id: item.id,
                    ...(visibility === currentChoice ? {} : { visibility }),
                });
            }
            return api.growth.course.create({ ...common, horizon, period, visibility });
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: apiQuery.growth.course.key() });
            showToast(tCourse('saved_toast'), 'success');
            onDone();
        },
        onError: (error: unknown) => showToast(apiError(error), 'error'),
    });

    const deadline = periodLabel(horizon, period, locale, {
        quarter: quarter => tCourse('quarter_short', { quarter }),
        week: week => tCourse('week_short', { week }),
    });

    return (
        <Form {...form}>
            <form
                className="grid gap-4"
                onSubmit={form.handleSubmit(values => save.mutate(values))}>
                <p className="font-mono text-xs tracking-wide text-fg-muted uppercase">
                    {t('deadline')}
                    <span className="mt-1 block font-sans text-sm font-medium tracking-normal text-fg normal-case">
                        {deadline}
                    </span>
                </p>
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <Field label={t('name')} hint={t('name_hint')} htmlFor="plan-item-name">
                                <FormControl>
                                    <Textarea
                                        id="plan-item-name"
                                        {...field}
                                        rows={2}
                                        autoComplete="off"
                                        maxLength={140}
                                    />
                                </FormControl>
                            </Field>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {isOutcomeLayer(horizon) ? (
                    <FormField
                        control={form.control}
                        name="doneWhen"
                        render={({ field }) => (
                            <FormItem>
                                <Field
                                    label={t('done_when')}
                                    hint={t('done_when_hint')}
                                    htmlFor="plan-item-done-when">
                                    <FormControl>
                                        <Textarea
                                            id="plan-item-done-when"
                                            {...field}
                                            rows={3}
                                            autoComplete="off"
                                            maxLength={280}
                                        />
                                    </FormControl>
                                </Field>
                            </FormItem>
                        )}
                    />
                ) : null}

                {isCountableLayer(horizon) ? (
                    <FormField
                        control={form.control}
                        name="targetCount"
                        render={({ field }) => (
                            <FormItem>
                                <Field
                                    label={`${t('target_count')} ${t('parent_optional')}`}
                                    hint={t('target_count_hint')}
                                    htmlFor="course-item-target-count">
                                    <FormControl>
                                        <Input
                                            id="course-item-target-count"
                                            {...field}
                                            inputMode="numeric"
                                            autoComplete="off"
                                            maxLength={2}
                                            placeholder="12"
                                            className="w-24"
                                        />
                                    </FormControl>
                                </Field>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                ) : null}

                {fixedParent ? (
                    <p className="font-mono text-xs tracking-wide text-fg-muted uppercase">
                        {t('parent')}
                        <span className="mt-1 block font-sans text-sm font-medium tracking-normal text-fg normal-case">
                            {`${layerName(fixedParent.horizon)} · ${fixedParent.name}`}
                        </span>
                    </p>
                ) : horizon !== CourseHorizon.YEAR ? (
                    <FormField
                        control={form.control}
                        name="parentId"
                        render={({ field }) => (
                            <FormItem>
                                <Field label={`${t('parent')} ${t('parent_optional')}`}>
                                    <Select value={field.value} onValueChange={field.onChange}>
                                        <FormControl>
                                            <SelectTrigger aria-label={t('parent')}>
                                                <SelectValue />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent position="popper">
                                            <SelectItem value={NONE}>{t('parent_none')}</SelectItem>
                                            {parents.map(candidate => (
                                                <SelectItem key={candidate.id} value={candidate.id}>
                                                    {`${layerName(candidate.horizon)} · ${candidate.name}`}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </Field>
                            </FormItem>
                        )}
                    />
                ) : null}

                {canHaveScope(horizon) ? (
                    <FormField
                        control={form.control}
                        name="scope"
                        render={({ field }) => (
                            <FormItem>
                                <Field label={`${t('scope')} ${t('parent_optional')}`}>
                                    <Select value={field.value} onValueChange={field.onChange}>
                                        <FormControl>
                                            <SelectTrigger aria-label={t('scope')}>
                                                <SelectValue />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent position="popper">
                                            <SelectItem value={NONE}>{t('scope_none')}</SelectItem>
                                            {SCOPES.map(scope => (
                                                <SelectItem key={scope} value={scope}>
                                                    {tGoal(`scope_${scope}`)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </Field>
                            </FormItem>
                        )}
                    />
                ) : null}

                {canLinkMoneyGoal(horizon) && moneyGoals.length > 0 ? (
                    <FormField
                        control={form.control}
                        name="goalId"
                        render={({ field }) => (
                            <FormItem>
                                <Field label={t('money_goal')} hint={tCourse('money_shared_note')}>
                                    <Select value={field.value} onValueChange={field.onChange}>
                                        <FormControl>
                                            <SelectTrigger aria-label={t('money_goal')}>
                                                <SelectValue />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent position="popper">
                                            <SelectItem value={NONE}>
                                                {t('money_goal_none')}
                                            </SelectItem>
                                            {moneyGoals.map(goal => (
                                                <SelectItem key={goal.id} value={goal.id}>
                                                    {goal.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </Field>
                            </FormItem>
                        )}
                    />
                ) : null}

                {isPickerShown && allowed.length > 1 ? (
                    <FormField
                        control={form.control}
                        name="visibility"
                        render={({ field }) => (
                            <FormItem>
                                <VisibilityPicker
                                    options={allowed}
                                    value={
                                        allowed.includes(field.value) ? field.value : allowed[0]!
                                    }
                                    onChange={field.onChange}
                                    ownerName={ownerName}
                                />
                            </FormItem>
                        )}
                    />
                ) : null}

                <DialogFooter>
                    <Button type="button" variant="ghost" onClick={onDone}>
                        {t('cancel')}
                    </Button>
                    <Button type="submit" disabled={save.isPending}>
                        {t('save')}
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    );
}
