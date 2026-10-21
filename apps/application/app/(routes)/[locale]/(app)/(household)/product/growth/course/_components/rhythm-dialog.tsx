'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, useWatch } from 'react-hook-form';

import {
    CourseRhythmCadence,
    CourseRhythmKind,
    VisibilityChoice,
    canParentRhythm,
    childVisibilityOptions,
    choiceOf,
    coursePeriodOf,
    type CourseRhythm,
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { api } from '@/app/_lib/api';
import { useApiError } from '@/app/_lib/api-error-messages';
import { apiQuery } from '@/app/_lib/api-hooks';
import { weekdayShort } from '@/app/_lib/course-rhythm';
import { VisibilityPicker } from '@/components/features/household/visibility-picker';
import { useHouseholdShell } from '@/components/features/shell/household-shell-context';

import { NONE, optionalId } from '../_utils/course-form';
import { rhythmFormSchema, rhythmShapeOf, type RhythmFormValues } from '../_utils/rhythm-form';

export type RhythmDialogState = { mode: 'create' } | { mode: 'edit'; rhythm: CourseRhythm };

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;

/** Create or edit one routine. */
export function RhythmDialog({
    state,
    onClose,
    householdId,
    visibilityOptions,
    defaultVisibility,
    isPickerShown,
    ownerName,
}: {
    state: RhythmDialogState | null;
    onClose: () => void;
    householdId: string;
    visibilityOptions: readonly VisibilityChoice[];
    defaultVisibility: VisibilityChoice;
    isPickerShown: boolean;
    ownerName: string | null;
}) {
    const t = useTranslations('features.growth.course.rhythm.form');
    return (
        <Dialog open={state !== null} onOpenChange={open => (open ? undefined : onClose())}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {state?.mode === 'edit' ? t('title_edit') : t('title_create')}
                    </DialogTitle>
                    <DialogDescription>{t('description')}</DialogDescription>
                </DialogHeader>
                {state ? (
                    <RhythmForm
                        key={state.mode === 'edit' ? state.rhythm.id : 'create'}
                        state={state}
                        householdId={householdId}
                        visibilityOptions={visibilityOptions}
                        defaultVisibility={defaultVisibility}
                        isPickerShown={isPickerShown}
                        ownerName={ownerName}
                        onDone={onClose}
                    />
                ) : null}
            </DialogContent>
        </Dialog>
    );
}

function RhythmForm({
    state,
    householdId,
    visibilityOptions,
    defaultVisibility,
    isPickerShown,
    ownerName,
    onDone,
}: {
    state: RhythmDialogState;
    householdId: string;
    visibilityOptions: readonly VisibilityChoice[];
    defaultVisibility: VisibilityChoice;
    isPickerShown: boolean;
    ownerName: string | null;
    onDone: () => void;
}) {
    const t = useTranslations('features.growth.course.rhythm.form');
    const tCourse = useTranslations('features.growth.course');
    const tRhythm = useTranslations('features.growth.course.rhythm');
    const locale = useLocale();
    const queryClient = useQueryClient();
    const { showToast } = useHouseholdShell();
    const apiError = useApiError();
    const rhythm = state.mode === 'edit' ? state.rhythm : null;

    const now = new Date();
    const year = String(now.getUTCFullYear());
    const yearQuery = useQuery(
        apiQuery.growth.course.year.queryOptions({ input: { householdId, year } })
    );
    // Year goals, and quarter / month steps from now on: a routine feeds what is ahead.
    const parents = (yearQuery.data ?? []).filter(
        item =>
            canParentRhythm(item.horizon) &&
            (item.id === rhythm?.parentId || item.period >= coursePeriodOf(item.horizon, now))
    );

    const form = useForm<RhythmFormValues>({
        resolver: zodResolver(rhythmFormSchema),
        defaultValues: {
            name: rhythm?.name ?? '',
            kind: rhythm?.kind ?? CourseRhythmKind.DISCIPLINE,
            cadence: rhythm?.cadence ?? CourseRhythmCadence.WEEKLY,
            target: String(rhythm?.target ?? 3),
            weekdays: rhythm?.weekdays ?? [],
            parentId: rhythm?.parentId ?? NONE,
            visibility: rhythm ? choiceOf(rhythm) : defaultVisibility,
        },
    });
    const kind = useWatch({ control: form.control, name: 'kind' });
    const cadence = useWatch({ control: form.control, name: 'cadence' });
    const parentId = useWatch({ control: form.control, name: 'parentId' });
    const parent = parents.find(item => item.id === parentId) ?? null;
    const currentChoice = rhythm ? choiceOf(rhythm) : null;
    const allowed = childVisibilityOptions(
        currentChoice && !visibilityOptions.includes(currentChoice)
            ? [...visibilityOptions, currentChoice]
            : visibilityOptions,
        parent
    );

    const save = useMutation({
        mutationFn: (values: RhythmFormValues) => {
            const visibility = allowed.includes(values.visibility)
                ? values.visibility
                : (allowed[0] ?? VisibilityChoice.PRIVATE);
            const common = {
                householdId,
                name: values.name,
                kind: values.kind,
                ...rhythmShapeOf(values),
                weekdays: values.weekdays.length > 0 ? values.weekdays : null,
                parentId: optionalId(values.parentId),
            };
            if (rhythm) {
                return api.growth.course.rhythm.update({
                    ...common,
                    id: rhythm.id,
                    ...(visibility === currentChoice ? {} : { visibility }),
                });
            }
            return api.growth.course.rhythm.create({ ...common, visibility });
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: apiQuery.growth.course.key() });
            showToast(tCourse('saved_toast'), 'success');
            onDone();
        },
        onError: (error: unknown) => showToast(apiError(error), 'error'),
    });

    return (
        <Form {...form}>
            <form
                className="grid gap-4"
                onSubmit={form.handleSubmit(values => save.mutate(values))}>
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <Field label={t('name')} hint={t('name_hint')} htmlFor="rhythm-name">
                                <FormControl>
                                    <Input
                                        id="rhythm-name"
                                        {...field}
                                        autoComplete="off"
                                        maxLength={140}
                                    />
                                </FormControl>
                            </Field>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="kind"
                    render={({ field }) => (
                        <FormItem>
                            <Field label={t('kind')}>
                                <div
                                    role="radiogroup"
                                    aria-label={t('kind')}
                                    className="grid gap-2 sm:grid-cols-2">
                                    {[CourseRhythmKind.HABIT, CourseRhythmKind.DISCIPLINE].map(
                                        option => (
                                            <button
                                                key={option}
                                                type="button"
                                                role="radio"
                                                aria-checked={field.value === option}
                                                onClick={() => field.onChange(option)}
                                                className={cn(
                                                    'grid gap-0.5 rounded-xl border px-3 py-2.5 text-left',
                                                    field.value === option
                                                        ? 'border-accent bg-accent-soft/50'
                                                        : 'border-line hover:border-line-strong'
                                                )}>
                                                <span className="text-sm font-medium text-fg">
                                                    {tRhythm(`kind_${option}`)}
                                                </span>
                                                <span className="text-xs text-fg-muted">
                                                    {t(`kind_${option}_hint`)}
                                                </span>
                                            </button>
                                        )
                                    )}
                                </div>
                            </Field>
                        </FormItem>
                    )}
                />

                {kind === CourseRhythmKind.DISCIPLINE ? (
                    <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
                        <FormField
                            control={form.control}
                            name="cadence"
                            render={({ field }) => (
                                <FormItem>
                                    <Field label={t('cadence')}>
                                        <Select value={field.value} onValueChange={field.onChange}>
                                            <FormControl>
                                                <SelectTrigger aria-label={t('cadence')}>
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent position="popper">
                                                {Object.values(CourseRhythmCadence).map(value => (
                                                    <SelectItem key={value} value={value}>
                                                        {t(`cadence_${value}`)}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </Field>
                                </FormItem>
                            )}
                        />
                        {cadence !== CourseRhythmCadence.DAILY ? (
                            <FormField
                                control={form.control}
                                name="target"
                                render={({ field }) => (
                                    <FormItem>
                                        <Field label={t('target')} htmlFor="rhythm-target">
                                            <FormControl>
                                                <Input
                                                    id="rhythm-target"
                                                    {...field}
                                                    inputMode="numeric"
                                                    autoComplete="off"
                                                    maxLength={2}
                                                    className="w-24"
                                                />
                                            </FormControl>
                                        </Field>
                                        {form.formState.errors.target ? (
                                            <p className="text-xs text-danger">
                                                {t(
                                                    cadence === CourseRhythmCadence.WEEKLY
                                                        ? 'target_week_range'
                                                        : 'target_month_range'
                                                )}
                                            </p>
                                        ) : null}
                                    </FormItem>
                                )}
                            />
                        ) : null}
                    </div>
                ) : null}

                {kind === CourseRhythmKind.HABIT || cadence !== CourseRhythmCadence.MONTHLY ? (
                    <FormField
                        control={form.control}
                        name="weekdays"
                        render={({ field }) => (
                            <FormItem>
                                <Field
                                    label={`${t('weekdays')} ${tCourse('form.parent_optional')}`}
                                    hint={t('weekdays_hint')}>
                                    <div
                                        role="group"
                                        aria-label={t('weekdays')}
                                        className="flex flex-wrap gap-1.5">
                                        {WEEKDAYS.map(day => {
                                            const isOn = field.value.includes(day);
                                            return (
                                                <button
                                                    key={day}
                                                    type="button"
                                                    aria-pressed={isOn}
                                                    onClick={() =>
                                                        field.onChange(
                                                            isOn
                                                                ? field.value.filter(
                                                                      value => value !== day
                                                                  )
                                                                : [...field.value, day].sort(
                                                                      (left, right) => left - right
                                                                  )
                                                        )
                                                    }
                                                    className={cn(
                                                        'h-9 min-w-11 rounded-lg border px-2 text-sm',
                                                        isOn
                                                            ? 'border-accent bg-accent text-on-accent'
                                                            : 'border-line text-fg-secondary hover:border-line-strong'
                                                    )}>
                                                    {weekdayShort(day, locale)}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </Field>
                            </FormItem>
                        )}
                    />
                ) : null}

                <FormField
                    control={form.control}
                    name="parentId"
                    render={({ field }) => (
                        <FormItem>
                            <Field
                                label={`${tCourse('form.parent')} ${tCourse('form.parent_optional')}`}
                                hint={t('parent_hint')}>
                                <Select value={field.value} onValueChange={field.onChange}>
                                    <FormControl>
                                        <SelectTrigger aria-label={tCourse('form.parent')}>
                                            <SelectValue />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent position="popper">
                                        <SelectItem value={NONE}>
                                            {tCourse('form.parent_none')}
                                        </SelectItem>
                                        {parents.map(item => (
                                            <SelectItem key={item.id} value={item.id}>
                                                {`${tCourse(`layer_${item.horizon.toLowerCase()}` as 'layer_week')} · ${item.name}`}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>
                        </FormItem>
                    )}
                />

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
                        {tCourse('form.cancel')}
                    </Button>
                    <Button type="submit" disabled={save.isPending}>
                        {tCourse('form.save')}
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    );
}
