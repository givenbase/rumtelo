'use client';

import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { PracticeRole } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { useTranslations } from '@rumtelo/i18n';
import {
    Badge,
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
    StubNotice,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    Toggle,
} from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { api } from '@/app/_lib/api';
import { apiQuery } from '@/app/_lib/api-hooks';

import { createInviteMemberSchema, type InviteMemberValues } from '../_utils/practice-form-zod';
import { practicePriceParams } from '../_utils/practice-pricing';
import { PracticeInkCard, PracticePageHeader, PracticePanel } from './practice-chrome';
import { usePractice } from './practice-context';
import { usePracticeMutation } from './use-practice-mutation';

const ROLE_OPTIONS = [
    { key: PracticeRole.COACH, labelKey: 'pages.practice.staff.role_coach' },
    { key: PracticeRole.ADMIN, labelKey: 'pages.practice.staff.role_admin' },
    { key: PracticeRole.OWNER, labelKey: 'pages.practice.staff.role_owner' },
] as const;

export function PracticeStaffPage() {
    const t = useTranslations();
    const { activePractice } = usePractice();
    const [inviteOpen, setInviteOpen] = useState(false);

    const membersQuery = useLiveQuery(
        apiQuery.practice.members.queryOptions({
            input: { practiceId: activePractice?.id ?? '' },
        }),
        [],
        Boolean(activePractice)
    );

    const inviteSchema = createInviteMemberSchema(t);
    const form = useForm<InviteMemberValues>({
        defaultValues: { email: '', role: PracticeRole.COACH, isSeatBillable: true },
        resolver: zodResolver(inviteSchema),
    });

    const invite = usePracticeMutation({
        mutationFn: async (values: InviteMemberValues) => {
            if (!activePractice) throw new Error('No active practice');
            return api.practice.inviteMember({
                practiceId: activePractice.id,
                email: values.email,
                role: values.role,
                isSeatBillable: values.isSeatBillable,
            });
        },
        invalidateKeys: [apiQuery.practice.members.key(), apiQuery.practice.billingStatus.key()],
        successMessage: t('pages.practice.staff.invited'),
        onSuccess: () => {
            form.reset({ email: '', role: PracticeRole.COACH, isSeatBillable: true });
            setInviteOpen(false);
        },
    });

    const members = membersQuery.data ?? [];

    return (
        <PracticePanel>
            <PracticePageHeader
                title={t('pages.practice.staff.title')}
                blurb={t('pages.practice.staff.blurb', practicePriceParams)}
                action={
                    <Button size="sm" onClick={() => setInviteOpen(true)}>
                        <Icon name="plus" size="sm" />
                        {t('pages.practice.staff.invite_title')}
                    </Button>
                }
            />

            <PracticeInkCard
                eyebrow={t('pages.practice.staff.title')}
                badge={
                    <span className="font-mono text-[10px] text-fg-muted tabular-nums">
                        {t('pages.practice.staff.seat_count', { count: members.length })}
                    </span>
                }
                bodyClassName="px-0 sm:px-0">
                {members.length === 0 ? (
                    <div className="py-10 text-center">
                        <StubNotice
                            prefix={t('pages.practice.staff.empty')}
                            what={t('pages.practice.staff.blurb', practicePriceParams)}
                        />
                        <div className="mt-5 flex justify-center">
                            <Button onClick={() => setInviteOpen(true)}>
                                <Icon name="plus" size="sm" />
                                {t('pages.practice.staff.invite_title')}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead>{t('pages.practice.staff.col_name')}</TableHead>
                                <TableHead className="hidden sm:table-cell">
                                    {t('pages.practice.staff.col_email')}
                                </TableHead>
                                <TableHead>{t('pages.practice.staff.col_role')}</TableHead>
                                <TableHead>{t('pages.practice.staff.col_seat')}</TableHead>
                                <TableHead className="hidden md:table-cell">
                                    {t('pages.practice.staff.joined')}
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {members.map(member => (
                                <TableRow key={member.id}>
                                    <TableCell>
                                        <p className="font-medium text-fg">{member.name}</p>
                                        <p className="mt-0.5 truncate text-[11px] text-fg-muted sm:hidden">
                                            {member.email}
                                        </p>
                                    </TableCell>
                                    <TableCell className="hidden text-fg-secondary sm:table-cell">
                                        {member.email}
                                    </TableCell>
                                    <TableCell>
                                        <Badge>{member.role}</Badge>
                                    </TableCell>
                                    <TableCell className="text-xs text-fg-muted">
                                        {member.isSeatBillable
                                            ? t('pages.practice.staff.seat_billable')
                                            : t('pages.practice.staff.seat_free')}
                                    </TableCell>
                                    <TableCell className="hidden text-xs text-fg-muted md:table-cell">
                                        {new Date(member.joinedAt).toLocaleDateString()}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </PracticeInkCard>

            <Dialog
                open={inviteOpen}
                onOpenChange={next => {
                    if (!next) {
                        form.reset({
                            email: '',
                            role: PracticeRole.COACH,
                            isSeatBillable: true,
                        });
                    }
                    setInviteOpen(next);
                }}>
                <DialogContent className="sm:max-w-md" closeLabel={t('ui.button.actions.close')}>
                    <DialogHeader>
                        <DialogTitle>{t('pages.practice.staff.invite_title')}</DialogTitle>
                        <DialogDescription>
                            {t('pages.practice.staff.blurb', practicePriceParams)}
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form
                            className="grid gap-4"
                            onSubmit={form.handleSubmit(values => invite.mutate(values))}>
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <Field
                                            label={t('pages.practice.staff.email_label')}
                                            htmlFor="invite-staff-email">
                                            <FormControl>
                                                <Email
                                                    id="invite-staff-email"
                                                    {...field}
                                                    placeholder={t(
                                                        'pages.practice.staff.email_placeholder'
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
                                name="role"
                                render={({ field }) => (
                                    <FormItem>
                                        <Field label={t('pages.practice.staff.role_label')}>
                                            <div className="flex flex-wrap gap-1.5">
                                                {ROLE_OPTIONS.map(opt => {
                                                    const selected = field.value === opt.key;
                                                    return (
                                                        <button
                                                            key={opt.key}
                                                            type="button"
                                                            onClick={() => field.onChange(opt.key)}
                                                            className={cn(
                                                                'rounded-[10px] border px-3 py-2 text-xs font-medium transition-colors',
                                                                selected
                                                                    ? 'border-accent bg-accent-soft text-accent'
                                                                    : 'border-line text-fg hover:border-accent/50'
                                                            )}>
                                                            {t(opt.labelKey)}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </Field>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="isSeatBillable"
                                render={({ field }) => (
                                    <FormItem>
                                        <Toggle
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                            label={t('pages.practice.staff.billable_label')}
                                            hint={t(
                                                'pages.practice.staff.billable_hint',
                                                practicePriceParams
                                            )}
                                        />
                                    </FormItem>
                                )}
                            />
                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => setInviteOpen(false)}>
                                    {t('ui.button.actions.cancel')}
                                </Button>
                                <Button type="submit" disabled={invite.isPending}>
                                    {invite.isPending ? '…' : t('pages.practice.staff.submit')}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </PracticePanel>
    );
}
