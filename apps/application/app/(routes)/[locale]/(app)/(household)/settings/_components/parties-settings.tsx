'use client';

import { api } from '@/app/_lib/api';
import { apiQuery } from '@/app/_lib/api-hooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import type { PartyWithUsage } from '@rumtelo/contracts';
import { MerchantSuggestionStatus } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { useTranslations } from '@rumtelo/i18n';
import { Button, Field, Input, Typography } from '@rumtelo/ui';

import { useApiError } from '@/app/_lib/api-error-messages';
import { isLiveData } from '@/app/_lib/preview';
import { ConfirmActionButton } from '@/components/features/forms/confirm-action-button';
import { useHouseholdShell } from '@/components/features/shell/household-shell-context';
import { useAuth } from '@/components/features/shell/auth-provider';

import { SettingsInkCard, SettingsPanel } from './settings-chrome';

function usageTotal(usage: PartyWithUsage['usage']): number {
    return usage.incomeSources + usage.fixedCosts + usage.transactions + usage.debts;
}

function statusLabel(
    party: PartyWithUsage,
    tParty: (
        key: 'already_catalog' | 'status_open' | 'status_accepted' | 'status_rejected'
    ) => string
): string | null {
    if (party.merchantKey) return tParty('already_catalog');
    if (party.suggestionStatus === MerchantSuggestionStatus.OPEN) return tParty('status_open');
    if (party.suggestionStatus === MerchantSuggestionStatus.ACCEPTED)
        return tParty('status_accepted');
    if (party.suggestionStatus === MerchantSuggestionStatus.REJECTED)
        return tParty('status_rejected');
    return null;
}

export function PartiesSettings() {
    const t = useTranslations();
    const tParty = useTranslations('pages.settings.panels.parties');
    const queryClient = useQueryClient();
    const { householdId } = useAuth();
    const { showToast } = useHouseholdShell();
    const apiError = useApiError();
    const live = isLiveData(householdId);

    const partiesQuery = useLiveQuery(
        apiQuery.money.parties.list.queryOptions({ input: { householdId: householdId! } }),
        [],
        live
    );

    const [editingId, setEditingId] = useState<string | null>(null);
    const [draftName, setDraftName] = useState('');
    const [draftNote, setDraftNote] = useState('');
    const [draftWebsite, setDraftWebsite] = useState('');
    const [draftIcon, setDraftIcon] = useState('');
    const [draftColor, setDraftColor] = useState('');

    function startEdit(party: PartyWithUsage) {
        setEditingId(party.id);
        setDraftName(party.name);
        setDraftNote(party.note ?? '');
        setDraftWebsite(party.website ?? '');
        setDraftIcon(party.icon ?? '');
        setDraftColor(party.color ?? '');
    }

    function invalidate() {
        void queryClient.invalidateQueries({ queryKey: apiQuery.money.parties.list.key() });
        void queryClient.invalidateQueries({ queryKey: apiQuery.money.income.list.key() });
        void queryClient.invalidateQueries({ queryKey: apiQuery.money.fixedCosts.list.key() });
        void queryClient.invalidateQueries({ queryKey: apiQuery.money.debts.key() });
    }

    const saveMutation = useMutation({
        mutationFn: async () => {
            if (!householdId || !editingId) throw new Error('No party');
            return api.money.parties.update({
                id: editingId,
                householdId,
                name: draftName.trim(),
                note: draftNote.trim() || null,
                website: draftWebsite.trim() || null,
                icon: draftIcon.trim() || null,
                color: draftColor.trim() || null,
            });
        },
        onSuccess: () => {
            invalidate();
            setEditingId(null);
            showToast(t('common.message.success.updated', { entity: tParty('entity') }), 'success');
        },
        onError: (error: unknown) => showToast(apiError(error), 'error'),
    });

    const removeMutation = useMutation({
        mutationFn: async (id: string) => {
            if (!householdId) throw new Error('No household');
            return api.money.parties.remove({ householdId, id });
        },
        onSuccess: () => {
            invalidate();
            if (editingId) setEditingId(null);
            showToast(t('common.message.success.deleted'), 'success');
        },
        onError: (error: unknown) => showToast(apiError(error), 'error'),
    });

    const suggestMutation = useMutation({
        mutationFn: async (partyId: string) => {
            if (!householdId) throw new Error('No household');
            return api.money.parties.suggest({ householdId, partyId });
        },
        onSuccess: () => {
            invalidate();
            showToast(tParty('suggest_done'), 'success');
        },
        onError: (error: unknown) => showToast(apiError(error), 'error'),
    });

    const parties = partiesQuery.data ?? [];

    return (
        <SettingsPanel>
            <SettingsInkCard eyebrow={tParty('eyebrow')} blurb={tParty('blurb')}>
                {parties.length === 0 ? (
                    <p className="text-sm text-fg-muted">{tParty('empty')}</p>
                ) : (
                    <ul className="divide-y divide-line">
                        {parties.map(party => {
                            const uses = usageTotal(party.usage);
                            const editing = editingId === party.id;
                            const badge = statusLabel(party, tParty);
                            const canSuggest =
                                live &&
                                !party.merchantKey &&
                                party.suggestionStatus === null &&
                                !suggestMutation.isPending;
                            return (
                                <li key={party.id} className="py-4 first:pt-0 last:pb-0">
                                    {editing ? (
                                        <div className="space-y-3">
                                            <Field label={tParty('field_name')}>
                                                <Input
                                                    value={draftName}
                                                    onChange={event =>
                                                        setDraftName(event.target.value)
                                                    }
                                                    disabled={!live || saveMutation.isPending}
                                                />
                                            </Field>
                                            <Field label={tParty('field_note')}>
                                                <Input
                                                    value={draftNote}
                                                    onChange={event =>
                                                        setDraftNote(event.target.value)
                                                    }
                                                    disabled={!live || saveMutation.isPending}
                                                />
                                            </Field>
                                            <div className="grid gap-3 sm:grid-cols-3">
                                                <Field label={tParty('field_icon')}>
                                                    <Input
                                                        value={draftIcon}
                                                        onChange={event =>
                                                            setDraftIcon(event.target.value)
                                                        }
                                                        disabled={!live || saveMutation.isPending}
                                                        maxLength={8}
                                                    />
                                                </Field>
                                                <Field label={tParty('field_color')}>
                                                    <Input
                                                        value={draftColor}
                                                        onChange={event =>
                                                            setDraftColor(event.target.value)
                                                        }
                                                        disabled={!live || saveMutation.isPending}
                                                        placeholder="var(--color-accent)"
                                                    />
                                                </Field>
                                                <Field label={tParty('field_website')}>
                                                    <Input
                                                        value={draftWebsite}
                                                        onChange={event =>
                                                            setDraftWebsite(event.target.value)
                                                        }
                                                        disabled={!live || saveMutation.isPending}
                                                    />
                                                </Field>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <Button
                                                    type="button"
                                                    disabled={
                                                        !live ||
                                                        !draftName.trim() ||
                                                        saveMutation.isPending
                                                    }
                                                    onClick={() => saveMutation.mutate()}>
                                                    {t('ui.button.actions.save')}
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    disabled={saveMutation.isPending}
                                                    onClick={() => setEditingId(null)}>
                                                    {t('ui.button.actions.cancel')}
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-medium text-fg">
                                                    {party.icon ? (
                                                        <span className="mr-1.5" aria-hidden>
                                                            {party.icon}
                                                        </span>
                                                    ) : null}
                                                    {party.name}
                                                    {badge ? (
                                                        <span className="ml-2 text-xs font-normal text-fg-muted">
                                                            · {badge}
                                                        </span>
                                                    ) : null}
                                                </p>
                                                <Typography
                                                    as="p"
                                                    variant="caption"
                                                    className="mt-0.5">
                                                    {uses === 0
                                                        ? tParty('usage_none')
                                                        : tParty('usage_count', { count: uses })}
                                                    {party.note ? ` · ${party.note}` : null}
                                                </Typography>
                                            </div>
                                            <div className="flex shrink-0 flex-wrap justify-end gap-2">
                                                {canSuggest ? (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        disabled={!canSuggest}
                                                        onClick={() =>
                                                            suggestMutation.mutate(party.id)
                                                        }>
                                                        {tParty('suggest')}
                                                    </Button>
                                                ) : null}
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    disabled={!live}
                                                    onClick={() => startEdit(party)}>
                                                    {t('ui.button.actions.edit')}
                                                </Button>
                                                <ConfirmActionButton
                                                    label={t('ui.button.actions.delete')}
                                                    confirmLabel={tParty('confirm_remove')}
                                                    disabled={!live || removeMutation.isPending}
                                                    pending={removeMutation.isPending}
                                                    onConfirm={() =>
                                                        removeMutation.mutate(party.id)
                                                    }
                                                />
                                            </div>
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
                <Typography as="p" variant="caption" className="mt-4 text-fg-muted">
                    {tParty('remove_hint')}
                </Typography>
            </SettingsInkCard>
        </SettingsPanel>
    );
}
