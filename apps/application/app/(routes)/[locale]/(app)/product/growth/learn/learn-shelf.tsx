'use client';

import { api } from '@/app/_lib/api';
import { apiQuery } from '@/app/_lib/api-hooks';
import { isLiveData } from '@/app/_lib/preview';
import { useAuth } from '@/components/features/shell/auth-provider';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type LearnProgressStatus, type LearnShelf as LearnShelfDto } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { PIECES, SKILLS, type LearnSkill, type LearnStatus } from './learn-catalog';

type LearnShelfApi = {
    statusById: Record<string, LearnStatus>;
    dueById: Record<string, string>;
    focused: Set<LearnSkill>;
    setStatus: (id: string, status: LearnStatus, skill: LearnSkill) => void;
    setDue: (id: string, iso: string, skill: LearnSkill) => void;
    focusSkill: (skill: LearnSkill) => void;
};

const LearnShelfContext = createContext<LearnShelfApi | null>(null);

const EMPTY_SHELF: LearnShelfDto = { progress: [], focused: [] };

/** Status and finish dates live above both Learn pages so a visit to the library keeps them. */
export function LearnShelfProvider({ children }: { children: ReactNode }) {
    const { householdId } = useAuth();
    const live = isLiveData(householdId);
    const local = useLocalShelf();
    const remote = useRemoteShelf(live, householdId);
    const value = live ? remote : local;

    return <LearnShelfContext.Provider value={value}>{children}</LearnShelfContext.Provider>;
}

export function useLearnShelf(): LearnShelfApi {
    const shelf = useContext(LearnShelfContext);
    if (!shelf) throw new Error('useLearnShelf must be used inside LearnShelfProvider');
    return shelf;
}

function useLocalShelf(): LearnShelfApi {
    const [statusById, setStatusById] = useState<Record<string, LearnStatus>>(() =>
        Object.fromEntries(PIECES.map(piece => [piece.id, piece.status]))
    );
    const [dueById, setDueById] = useState<Record<string, string>>({});
    const [focused, setFocused] = useState<Set<LearnSkill>>(() => new Set(['MONEY']));

    return useMemo(
        () => ({
            statusById,
            dueById,
            focused,
            setStatus(id, status, skill) {
                setStatusById(previous => ({ ...previous, [id]: status }));
                if (status === 'SHELF') {
                    setDueById(previous => {
                        const { [id]: _gone, ...rest } = previous;
                        return rest;
                    });
                }
                if (status === 'NOW' || status === 'QUEUE') {
                    setFocused(previous => new Set(previous).add(skill));
                }
            },
            setDue(id, iso) {
                setDueById(previous => {
                    if (!iso) {
                        const { [id]: _gone, ...rest } = previous;
                        return rest;
                    }
                    return { ...previous, [id]: iso };
                });
            },
            focusSkill(skill) {
                setFocused(previous => new Set(previous).add(skill));
            },
        }),
        [statusById, dueById, focused]
    );
}

function useRemoteShelf(live: boolean, householdId: string | null): LearnShelfApi {
    const queryClient = useQueryClient();
    const options = apiQuery.growth.learn.list.queryOptions({
        input: { householdId: householdId ?? '00000000-0000-4000-8000-000000000000' },
    });
    const query = useLiveQuery(options, EMPTY_SHELF, live);
    const shelf = query.data;

    const statusById = useMemo(() => {
        const map: Record<string, LearnStatus> = {};
        for (const row of shelf.progress) map[row.pieceKey] = row.status;
        return map;
    }, [shelf.progress]);

    const dueById = useMemo(() => {
        const map: Record<string, string> = {};
        for (const row of shelf.progress) {
            if (row.dueOn) map[row.pieceKey] = row.dueOn;
        }
        return map;
    }, [shelf.progress]);

    const focused = useMemo(() => {
        const known = new Set<string>(SKILLS.map(skill => skill.key));
        return new Set(shelf.focused.filter((key): key is LearnSkill => known.has(key)));
    }, [shelf.focused]);

    const refresh = () => {
        void queryClient.invalidateQueries({ queryKey: apiQuery.growth.learn.list.key() });
    };

    const save = useMutation({
        mutationFn: (input: Parameters<typeof api.growth.learn.save>[0]) =>
            api.growth.learn.save(input),
        onSettled: refresh,
    });
    const remove = useMutation({
        mutationFn: (input: Parameters<typeof api.growth.learn.remove>[0]) =>
            api.growth.learn.remove(input),
        onSettled: refresh,
    });
    const focus = useMutation({
        mutationFn: (input: Parameters<typeof api.growth.learn.focus>[0]) =>
            api.growth.learn.focus(input),
        onSettled: refresh,
    });

    return useMemo(() => {
        function write(next: LearnShelfDto) {
            queryClient.setQueryData(options.queryKey, next);
        }

        return {
            statusById,
            dueById,
            focused,
            setStatus(id, status, skill) {
                if (!householdId) return;
                const current = queryClient.getQueryData<LearnShelfDto>(options.queryKey) ?? shelf;
                if (status === 'SHELF') {
                    write({
                        ...current,
                        progress: current.progress.filter(row => row.pieceKey !== id),
                    });
                    remove.mutate({ householdId, pieceKey: id });
                    return;
                }
                const picked = status as LearnProgressStatus;
                const existing = current.progress.find(row => row.pieceKey === id);
                const nextRow = existing
                    ? { ...existing, status: picked, skill }
                    : {
                          id: crypto.randomUUID(),
                          householdId,
                          accountId: householdId,
                          pieceKey: id,
                          status: picked,
                          skill,
                          dueOn: null,
                      };
                const progress = existing
                    ? current.progress.map(row => (row.pieceKey === id ? nextRow : row))
                    : [nextRow, ...current.progress];
                const alreadyFocused = current.focused.includes(skill);
                const nextFocused =
                    (status === 'NOW' || status === 'QUEUE') && !alreadyFocused
                        ? [...current.focused, skill]
                        : current.focused;
                write({ progress, focused: nextFocused });
                save.mutate({
                    householdId,
                    pieceKey: id,
                    status: picked,
                    skill,
                    dueOn: existing?.dueOn ?? null,
                });
                if ((status === 'NOW' || status === 'QUEUE') && !alreadyFocused) {
                    focus.mutate({ householdId, skill, on: true });
                }
            },
            setDue(id, iso, skill) {
                if (!householdId) return;
                const current = queryClient.getQueryData<LearnShelfDto>(options.queryKey) ?? shelf;
                const existing = current.progress.find(row => row.pieceKey === id);
                if (!existing) return;
                const dueOn = iso || null;
                write({
                    ...current,
                    progress: current.progress.map(row =>
                        row.pieceKey === id ? { ...row, dueOn } : row
                    ),
                });
                save.mutate({
                    householdId,
                    pieceKey: id,
                    status: existing.status,
                    skill,
                    dueOn,
                });
            },
            focusSkill(skill) {
                if (!householdId) return;
                const current = queryClient.getQueryData<LearnShelfDto>(options.queryKey) ?? shelf;
                if (!current.focused.includes(skill)) {
                    write({ ...current, focused: [...current.focused, skill] });
                }
                focus.mutate({ householdId, skill, on: true });
            },
        };
    }, [
        dueById,
        focus,
        focused,
        householdId,
        options.queryKey,
        queryClient,
        remove,
        save,
        shelf,
        statusById,
    ]);
}
