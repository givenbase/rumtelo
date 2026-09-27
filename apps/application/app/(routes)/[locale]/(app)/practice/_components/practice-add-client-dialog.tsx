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
} from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { api } from '@/app/_lib/api';
import { apiQuery } from '@/app/_lib/api-hooks';

import { createAddClientSchema, type AddClientValues } from '../_utils/practice-form-zod';
import { usePractice } from './practice-context';
import { usePracticeMutation } from './use-practice-mutation';

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
        defaultValues: { email: '', householdId: '', access: PracticeClientAccess.MANAGE },
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
        successMessage: t('pages.practice.clients.invited'),
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
            <DialogContent className="sm:max-w-md" closeLabel={t('ui.button.actions.close')}>
                <DialogHeader>
                    <DialogTitle>{t('pages.practice.clients.add_title')}</DialogTitle>
                    <DialogDescription>{t('pages.practice.clients.blurb')}</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form
                        className="grid gap-4"
                        onSubmit={form.handleSubmit(values => addClient.mutate(values))}>
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <Field
                                        label={t('pages.practice.clients.email_label')}
                                        htmlFor="add-client-email">
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
                                    <Field label={t('pages.practice.clients.access_label')}>
                                        <div className="flex gap-1.5">
                                            {(
                                                [
                                                    {
                                                        key: PracticeClientAccess.VIEW,
                                                        label: t(
                                                            'pages.practice.clients.access_view'
                                                        ),
                                                    },
                                                    {
                                                        key: PracticeClientAccess.MANAGE,
                                                        label: t(
                                                            'pages.practice.clients.access_manage'
                                                        ),
                                                    },
                                                ] as const
                                            ).map(opt => {
                                                const selected = field.value === opt.key;
                                                return (
                                                    <button
                                                        key={opt.key}
                                                        type="button"
                                                        onClick={() => field.onChange(opt.key)}
                                                        className={cn(
                                                            'flex-1 rounded-[10px] border px-3 py-2 text-left text-xs font-medium transition-colors',
                                                            selected
                                                                ? 'border-accent bg-accent-soft text-accent'
                                                                : 'border-line text-fg hover:border-accent/50'
                                                        )}>
                                                        {opt.label}
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
