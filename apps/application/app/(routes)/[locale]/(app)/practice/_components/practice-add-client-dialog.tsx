'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { PracticeClientAccess } from '@rumtelo/contracts';
import { useTranslations } from '@rumtelo/i18n';
import {
    Button,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    Email,
    Field,
    Form,
    FormControl,
    FormField,
    FormItem,
    FormMessage,
    Icon,
    type IconName,
} from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { api } from '@/app/_lib/api';
import { apiQuery } from '@/app/_lib/api-hooks';

import { createAddClientSchema, type AddClientValues } from '../_utils/practice-form-zod';
import { usePractice } from './practice-context';
import { usePracticeMutation } from './use-practice-mutation';

const ACCESS_OPTIONS: {
    key: PracticeClientAccess;
    icon: IconName;
    titleKey: string;
    bodyKey: string;
    badgeKey: string;
}[] = [
    {
        key: PracticeClientAccess.VIEW,
        icon: 'eye',
        titleKey: 'pages.practice.clients.access_view_title',
        bodyKey: 'pages.practice.clients.access_view_body',
        badgeKey: 'pages.practice.clients.access_view_badge',
    },
    {
        key: PracticeClientAccess.MANAGE,
        icon: 'shield',
        titleKey: 'pages.practice.clients.access_manage_title',
        bodyKey: 'pages.practice.clients.access_manage_body',
        badgeKey: 'pages.practice.clients.access_manage_badge',
    },
];

export function PracticeAddClientDialog({
    open,
    onOpenChange,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const t = useTranslations();
    const { activePractice } = usePractice();
    const addClientSchema = createAddClientSchema(t);
    const form = useForm<AddClientValues>({
        defaultValues: { email: '', householdId: '', access: PracticeClientAccess.VIEW },
        resolver: zodResolver(addClientSchema),
    });

    const addClient = usePracticeMutation({
        mutationFn: async (values: AddClientValues) => {
            if (!activePractice) throw new Error('No active practice');
            return api.practice.addClient({
                practiceId: activePractice.id,
                email: values.email || undefined,
                householdId: values.householdId || undefined,
                access: values.access,
            });
        },
        invalidateKeys: [apiQuery.practice.clients.key(), apiQuery.practice.billingStatus.key()],
        successMessage: data => {
            if (data.outcome === 'email_invite' && data.reason === 'no_user') {
                return t('pages.practice.clients.invited_no_user');
            }
            if (data.outcome === 'email_invite' && data.reason === 'no_household') {
                return t('pages.practice.clients.invited_no_household');
            }
            return t('pages.practice.clients.invited');
        },
        onSuccess: () => {
            form.reset();
            onOpenChange(false);
        },
    });

    return (
        <Dialog
            open={open}
            onOpenChange={next => {
                if (!next) form.reset();
                onOpenChange(next);
            }}>
            <DialogContent className="sm:max-w-lg" closeLabel={t('ui.button.actions.close')}>
                <DialogHeader>
                    <DialogTitle>{t('pages.practice.clients.add_title')}</DialogTitle>
                    <DialogDescription>{t('pages.practice.clients.add_lead')}</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form
                        className="grid gap-5"
                        onSubmit={form.handleSubmit(values => addClient.mutate(values))}>
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <Field
                                        label={t('pages.practice.clients.email_label')}
                                        htmlFor="add-client-email"
                                        hint={t('pages.practice.clients.email_hint')}>
                                        <FormControl>
                                            <Email
                                                id="add-client-email"
                                                {...field}
                                                placeholder={t(
                                                    'pages.practice.clients.email_placeholder'
                                                )}
                                            />
                                        </FormControl>
                                    </Field>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="access"
                            render={({ field }) => (
                                <FormItem>
                                    <Field
                                        label={t('pages.practice.clients.access_label')}
                                        hint={t('pages.practice.clients.access_hint')}>
                                        <div
                                            role="radiogroup"
                                            aria-label={t('pages.practice.clients.access_label')}
                                            className="grid gap-2">
                                            {ACCESS_OPTIONS.map(opt => {
                                                const selected = field.value === opt.key;
                                                return (
                                                    <button
                                                        key={opt.key}
                                                        type="button"
                                                        role="radio"
                                                        aria-checked={selected}
                                                        onClick={() => field.onChange(opt.key)}
                                                        className={cn(
                                                            'flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors',
                                                            selected
                                                                ? 'border-accent bg-accent-soft/60 ring-1 ring-accent/30'
                                                                : 'border-line bg-surface hover:border-accent/40 hover:bg-raised/50'
                                                        )}>
                                                        <span
                                                            aria-hidden
                                                            className={cn(
                                                                'mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg',
                                                                selected
                                                                    ? 'bg-accent text-on-accent'
                                                                    : 'bg-raised text-fg-secondary'
                                                            )}>
                                                            <Icon name={opt.icon} size="sm" />
                                                        </span>
                                                        <span className="min-w-0 flex-1">
                                                            <span className="flex flex-wrap items-center gap-2">
                                                                <span
                                                                    className={cn(
                                                                        'text-sm font-semibold',
                                                                        selected
                                                                            ? 'text-accent'
                                                                            : 'text-fg'
                                                                    )}>
                                                                    {t(opt.titleKey)}
                                                                </span>
                                                                <span
                                                                    className={cn(
                                                                        'rounded-full px-2 py-0.5 font-mono text-[10px] font-medium tracking-wide uppercase',
                                                                        selected
                                                                            ? 'bg-accent/15 text-accent'
                                                                            : 'bg-raised text-fg-muted'
                                                                    )}>
                                                                    {t(opt.badgeKey)}
                                                                </span>
                                                            </span>
                                                            <span className="mt-0.5 block text-xs leading-snug text-fg-muted">
                                                                {t(opt.bodyKey)}
                                                            </span>
                                                        </span>
                                                        <span
                                                            aria-hidden
                                                            className={cn(
                                                                'mt-1 grid size-4 shrink-0 place-items-center rounded-full border',
                                                                selected
                                                                    ? 'border-accent bg-accent'
                                                                    : 'border-line-strong bg-surface'
                                                            )}>
                                                            {selected ? (
                                                                <Icon
                                                                    name="check"
                                                                    size="sm"
                                                                    className="text-on-accent"
                                                                />
                                                            ) : null}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </Field>
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => onOpenChange(false)}>
                                {t('ui.button.actions.cancel')}
                            </Button>
                            <Button type="submit" disabled={addClient.isPending}>
                                {addClient.isPending ? '…' : t('pages.practice.clients.submit')}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
