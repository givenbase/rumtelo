'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState, type ReactNode } from 'react';

import { SpendingStyle } from '@rumtelo/contracts';
import { useLocale, useTranslations } from '@rumtelo/i18n';
import { useLiveQuery } from '@rumtelo/hooks';
import {
    Button,
    Card,
    DatePicker,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    EmptyState,
    Input,
    Typography,
} from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { apiQuery } from '@/app/_lib/api-hooks';
import { isLiveData } from '@/app/_lib/preview';
import { PlanKey } from '@/app/_lib/plan';
import { env } from '@/app/_utils/get-env';
import { CoachMark, useHelpersEnabled } from '@/components/features/helpers';
import { useAppShell } from '@/components/features/shell/app-shell-context';
import { useAuth } from '@/components/features/shell/auth-provider';
import { EditIcon } from '@/components/features/ui/action-icons';
import { usePlanCapabilities } from '@/components/features/shell/use-plan-capabilities';
import { ListToolbar, ListToolbarTab } from '@/components/layout/list-toolbar';

import { useLearnShelf } from './learn-shelf';
import { useLearnCatalog } from './learn-catalog-provider';
import { AddLearningDialog } from './add-learning-dialog';

import {
    ABOUT_ORDER,
    FORMAT_ORDER,
    PIECES,
    SKILLS,
    aboutOf,
    bookSuggested,
    bookToPiece,
    bookVisible,
    matchesSearch,
    skillDef,
    storeFor,
    addedBookToPiece,
    watchToPiece,
    type LearnFormat,
    type LearnPiece,
    type LearnSkill,
    type LearnStatus,
} from './learn-catalog';
import { useLearnCatalogLabels } from './learn-labels';

/** A taste of the shelf, not the whole library. One of each format, then a few more. */
const RECOMMENDED_LIMIT = 6;
/** Partner tags ride along on store links when set; the links work without them. */
const STORE_TAGS = {
    bolPartnerId: env.NEXT_PUBLIC_BOL_PARTNER_ID,
    amazonTag: env.NEXT_PUBLIC_AMAZON_TAG,
};
const HAS_PARTNER_TAGS = Boolean(STORE_TAGS.bolPartnerId || STORE_TAGS.amazonTag);

type Tab = 'FOCUS' | 'DONE';
type FormatFilter = 'ALL' | LearnFormat;
type AboutFilter = string;

const LIBRARY_HREF = '/product/growth/learn/library';

function aboutFromQuery(value: string | null): AboutFilter {
    if (value && ABOUT_ORDER.includes(value)) return value;
    return 'ALL';
}

function coursePartner(plan: PlanKey): string {
    return plan === PlanKey.MAX ? 'MASTERCLASS' : 'UDEMY';
}

function onThisPlan(piece: LearnPiece, plan: PlanKey): boolean {
    if (!piece.partner) return true;
    return piece.partner === coursePartner(plan);
}

function recommendedFor(
    catalog: readonly LearnPiece[],
    skills: ReadonlySet<LearnSkill>,
    suggestedIds: ReadonlySet<string>,
    statusOf: (piece: LearnPiece) => LearnStatus
): LearnPiece[] {
    const shelf = catalog.filter(
        piece => !piece.added && skills.has(piece.skill) && statusOf(piece) === 'SHELF'
    );
    const ranked = [...shelf].sort(
        (left, right) => Number(suggestedIds.has(right.id)) - Number(suggestedIds.has(left.id))
    );
    const chosen: LearnPiece[] = [];
    const used = new Set<string>();
    for (const format of FORMAT_ORDER) {
        const hit = ranked.find(piece => piece.format === format);
        if (!hit) continue;
        chosen.push(hit);
        used.add(hit.id);
    }
    for (const piece of ranked) {
        if (chosen.length >= RECOMMENDED_LIMIT) break;
        if (used.has(piece.id)) continue;
        chosen.push(piece);
        used.add(piece.id);
    }
    return chosen.slice(0, RECOMMENDED_LIMIT);
}

function byPriority(pieces: readonly LearnPiece[], rankById: Record<string, number>): LearnPiece[] {
    return [...pieces].sort((left, right) => {
        const delta = (rankById[left.id] ?? 1) - (rankById[right.id] ?? 1);
        if (delta !== 0) return delta;
        return left.title.localeCompare(right.title);
    });
}

/** MasterClass header mark and wordmark. Their paths, our color. Not the course photo. */
const MASTERCLASS_MARK =
    'M11.843 12.6 9.775 5H4.033v1.22h.545c.68 0 1.242.421 1.45 1.199l3.162 11.58h2.88l1.412-5.14-.02-.019c-.921 0-1.375-.36-1.619-1.24m11.612 5.179c-.677 0-1.223-.48-1.43-1.22L18.865 5H14.46l3.82 13.999H24v-1.22zM0 17.776V19h5.088v-1.224z';
const MASTERCLASS_WORD =
    'M13.048 3.619 9.121 14.695H8.064L3.891 3.619l-1.03 8.54a4 4 0 0 0-.044.493c0 1.031.449 1.242 1.963 1.321v.722H0v-.722c1.179-.062 1.576-.29 1.699-1.215L3.002 2.457c.141-1.118-.396-1.444-1.761-1.532V.229h4.675c.044.45.141.802.308 1.259l3.372 8.989 3.126-9.016c.167-.449.29-.783.326-1.233h4.595v.696c-1.329.088-1.866.414-1.716 1.532l1.259 10.301c.123.969.555 1.154 1.699 1.215v.722h-6.682v-.722c1.426-.079 1.919-.29 1.919-1.321 0-.123-.018-.334-.035-.493zm14.905 8.786c0 .704.167 1.154.687 1.154.308 0 .599-.097.827-.202l.123.449c-.599.704-1.382 1.1-2.333 1.1-1.144 0-1.866-.687-2.069-1.823-.661.872-1.735 1.779-3.249 1.779-1.655 0-2.747-1.012-2.747-2.668 0-1.752 1.259-2.501 2.809-3.055l3.125-1.135V6.26c0-1.197-.397-2.042-1.453-2.042-.968 0-1.549.246-1.857.678.643.15 1.012.66 1.012 1.303 0 .89-.616 1.471-1.567 1.471-.889 0-1.452-.581-1.452-1.488 0-1.734 1.778-2.606 4.094-2.606 2.624 0 4.05.951 4.05 3.39zm-2.826.185V8.76l-1.779.704c-.871.352-1.426.81-1.426 1.963 0 1.083.493 1.822 1.611 1.822.599.001 1.013-.227 1.594-.659m4.798 1.304-.132-2.853h.766c.458 1.796 1.488 3.143 3.081 3.143 1.119 0 1.946-.519 1.946-1.656 0-1.118-.748-1.549-2.377-2.13-2.193-.766-3.328-1.638-3.328-3.54 0-2.086 1.567-3.284 3.821-3.284 1.347 0 2.483.335 3.372.89v2.501h-.704c-.352-1.471-1.197-2.685-2.668-2.685-1.048 0-1.673.616-1.673 1.532 0 .924.643 1.383 2.236 1.981 2.228.766 3.53 1.611 3.53 3.636 0 2.193-1.628 3.478-4.173 3.478-1.575-.001-2.852-.415-3.697-1.013M42.243 3.76h2.694v.933h-2.694v6.858c0 1.241.475 1.779 1.452 1.779.555 0 1.013-.186 1.524-.555l.273.352c-.66 1.03-1.7 1.779-3.205 1.779-1.673 0-2.914-.889-2.914-3.205V4.693h-1.285v-.44c1.426-.661 2.623-1.796 3.513-3.161h.643zm12.493 4.111v.475H48.01c-.079 2.879 1.391 4.613 3.416 4.613 1.408 0 2.333-.616 3.082-1.69l.308.185c-.519 2.043-2.025 3.451-4.385 3.451-2.993 0-5-2.21-5-5.38 0-3.513 2.272-5.952 5.089-5.952 2.763.002 4.216 1.824 4.216 4.298m-6.665-.264h4.094c0-1.963-.511-3.284-1.858-3.284-1.364 0-2.086 1.382-2.236 3.284m27.478-6.365.044 3.302h-.81C74.308 2.167 73.093.89 71.085.89c-2.835 0-4.138 2.826-4.138 6.348 0 3.838 1.514 6.779 4.323 6.779 1.946 0 3.266-1.224 3.971-4.218h.845l-.326 3.883c-1.197.766-2.817 1.223-4.754 1.223-4.491 0-7.263-2.809-7.263-7.07C63.743 3.02 66.948 0 71.006 0c1.84 0 3.363.449 4.543 1.242m5.212 11.868c0 .722.308.846 1.285.907v.678h-5.441v-.678c.951-.062 1.285-.185 1.285-.907V2.105l-1.24-.643v-.431l3.654-.995h.458zm7.58-.529v-3.82l-1.778.704c-.846.326-1.409.802-1.409 1.963 0 1.074.502 1.822 1.594 1.822.599 0 1.012-.228 1.593-.669m4.808 1.313-.123-2.853h.766c.449 1.796 1.488 3.143 3.073 3.143 1.118 0 1.972-.519 1.972-1.656 0-1.118-.766-1.549-2.404-2.13-2.192-.766-3.328-1.638-3.328-3.54 0-2.086 1.567-3.284 3.847-3.284 1.32 0 2.456.335 3.346.89v2.501h-.704c-.343-1.471-1.198-2.685-2.641-2.685-1.074 0-1.7.616-1.7 1.532 0 .924.643 1.383 2.237 1.981 2.236.766 3.557 1.611 3.557 3.636 0 2.193-1.655 3.478-4.199 3.478-1.569-.001-2.854-.415-3.699-1.013m8.954 0-.106-2.853h.766c.449 1.796 1.505 3.143 3.081 3.143 1.109 0 1.963-.519 1.963-1.656 0-1.118-.783-1.549-2.377-2.13-2.219-.766-3.354-1.638-3.354-3.54 0-2.086 1.576-3.284 3.847-3.284 1.32 0 2.456.335 3.354.89v2.501h-.704c-.335-1.471-1.207-2.685-2.65-2.685-1.075 0-1.673.616-1.673 1.532 0 .924.616 1.383 2.21 1.981 2.255.765 3.54 1.61 3.54 3.635 0 2.193-1.637 3.478-4.182 3.478-1.55 0-2.853-.414-3.715-1.012m-10.918-1.489c0 .704.158 1.154.678 1.154.308 0 .599-.097.828-.202l.123.449c-.599.704-1.383 1.1-2.333 1.1-1.135 0-1.867-.687-2.069-1.823-.66.872-1.734 1.779-3.249 1.779-1.655 0-2.747-1.012-2.747-2.668 0-1.752 1.259-2.501 2.809-3.055l3.126-1.135V6.26c0-1.197-.396-2.042-1.444-2.042-.977 0-1.559.246-1.867.678.643.15 1.013.66 1.013 1.303 0 .89-.617 1.471-1.567 1.471-.889 0-1.452-.581-1.452-1.488 0-1.734 1.778-2.606 4.094-2.606 2.633 0 4.059.951 4.059 3.39v5.439zM60.212 4.94c0 1.012.599 1.655 1.506 1.655.995 0 1.62-.643 1.62-1.549 0-.933-.563-1.471-1.364-1.471-1.118 0-1.84.784-2.65 3.064l.079-3.064h-.475L55.23 4.694v.386l1.241.748v7.281c0 .722-.335.846-1.285.907v.678h5.873v-.678c-1.259-.106-1.735-.229-1.735-1.057V7.651c.458-1.286 1.18-2.175 2.377-2.879z';

function MasterclassMark() {
    const tLearn = useTranslations('features.growth.learn');
    return (
        <span
            className="inline-flex items-center gap-2 text-fg"
            aria-label={tLearn('partners.MASTERCLASS')}>
            <svg viewBox="0 0 24 24" className="size-7 shrink-0" fill="none" aria-hidden>
                <path fill="currentColor" d={MASTERCLASS_MARK} />
            </svg>
            <svg viewBox="0 0 110 15" className="h-3.5 w-auto" fill="none" aria-hidden>
                <path fill="currentColor" d={MASTERCLASS_WORD} />
            </svg>
        </span>
    );
}

function MediaCover({ piece, className }: { piece: LearnPiece; className?: string }) {
    const labels = useLearnCatalogLabels();
    const [failedSrc, setFailedSrc] = useState<string | null>(null);
    const src = piece.youtubeId
        ? `https://i.ytimg.com/vi/${piece.youtubeId}/hqdefault.jpg`
        : piece.coverId
          ? `https://covers.openlibrary.org/b/id/${piece.coverId}-L.jpg`
          : null;
    const show = Boolean(src) && src !== failedSrc;
    const wide = piece.format !== 'BOOK';
    const masterclass = !show && piece.partner === 'MASTERCLASS';

    return (
        <div
            className={cn(
                'relative w-full shrink-0 overflow-hidden bg-raised',
                wide ? 'aspect-video' : 'aspect-2/3',
                className
            )}>
            {show ? (
                <img
                    src={src!}
                    alt=""
                    className="absolute inset-0 size-full object-cover"
                    loading="lazy"
                    decoding="async"
                    onError={() => setFailedSrc(src)}
                    onLoad={event => {
                        if (event.currentTarget.naturalWidth < 2) setFailedSrc(src);
                    }}
                />
            ) : (
                <div
                    className={cn(
                        'absolute inset-0 flex p-3',
                        masterclass
                            ? 'flex-col items-center justify-center gap-3'
                            : 'flex-col justify-between'
                    )}
                    style={{
                        background: `color-mix(in srgb, ${skillDef(piece.skill).tint} 16%, var(--color-raised))`,
                    }}>
                    {masterclass ? (
                        <MasterclassMark />
                    ) : (
                        <>
                            <span className="font-mono text-[10px] tracking-widest text-fg-muted uppercase">
                                {labels.partnerLabel(piece.partner)}
                            </span>
                            <span className="text-sm leading-snug font-medium text-fg">
                                {piece.title}
                            </span>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

function PieceLine({ piece, className }: { piece: LearnPiece; className?: string }) {
    if (piece.added || !piece.use) return null;
    return <p className={className}>{piece.use}</p>;
}

function Outbound({
    href,
    children,
    primary = false,
}: {
    href: string;
    children: string;
    primary?: boolean;
}) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className={cn(
                'font-mono text-[11px] tracking-wide whitespace-nowrap uppercase hover:text-accent',
                primary
                    ? 'rounded-full border border-accent px-3 py-1.5 text-accent hover:bg-accent-soft'
                    : 'text-fg-secondary'
            )}>
            {children} ›
        </a>
    );
}

/** The store, the streaming page, or the class. The author, free text, or trailer sits with the description. */
function PieceLinks({ piece }: { piece: LearnPiece }) {
    const labels = useLearnCatalogLabels();
    return (
        <Outbound href={piece.primary.href} primary>
            {labels.linkLabel(piece.primary.labelKey)}
        </Outbound>
    );
}

function PieceSecondary({ piece }: { piece: LearnPiece }) {
    const labels = useLearnCatalogLabels();
    if (!piece.secondary) return null;
    return (
        <Outbound href={piece.secondary.href}>
            {labels.linkLabel(piece.secondary.labelKey)}
        </Outbound>
    );
}

const PICK: readonly LearnStatus[] = ['QUEUE', 'NOW', 'DONE'];

function todayIso(): string {
    return new Date().toISOString().slice(0, 10);
}

type LearnT = (key: string, values?: Record<string, string | number>) => string;

/** "12 days left", "Due today", "3 days over". Whole days, local calendar. */
export function dueLine(iso: string, t: LearnT): { text: string; over: boolean } {
    const due = new Date(`${iso}T00:00:00`);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const days = Math.round((due.getTime() - now.getTime()) / 86_400_000);
    if (days === 0) return { text: t('due_today'), over: false };
    if (days === 1) return { text: t('due_tomorrow'), over: false };
    if (days < 0) {
        const over = -days;
        return {
            text: over === 1 ? t('due_over', { days: over }) : t('due_over_many', { days: over }),
            over: true,
        };
    }
    return { text: t('due_left', { days }), over: false };
}

/** The one thing we ask about progress: when do you want to be done? */
function FinishBy({
    value,
    onChange,
    className,
}: {
    value: string | undefined;
    onChange: (iso: string) => void;
    className?: string;
}) {
    const locale = useLocale();
    const t = useTranslations();
    const tForm = useTranslations('ui.form');
    const tLearn = useTranslations('features.growth.learn');
    const line = value ? dueLine(value, tLearn) : null;
    return (
        <div
            className={cn(
                'flex flex-wrap items-center gap-2 font-mono text-[10px] tracking-wide text-fg-muted uppercase',
                className
            )}>
            <span>{tLearn('finish_by')}</span>
            <DatePicker
                value={value ?? null}
                min={todayIso()}
                onChange={onChange}
                locale={locale}
                placeholder={t('ui.form.pick_a_date')}
                labels={{
                    previousMonth: tForm('previous_month'),
                    nextMonth: tForm('next_month'),
                    month: tForm('month'),
                    year: tForm('year'),
                    today: tForm('today'),
                    pickADay: tForm('pick_a_day'),
                }}
                closeLabel={t('ui.button.actions.close')}
                className="w-40 font-sans text-xs tracking-normal normal-case"
            />
            {line ? (
                <span className={line.over ? 'text-danger' : 'text-accent'}>{line.text}</span>
            ) : null}
        </div>
    );
}

/**
 * Status and the finish date stay read-only until Edit is pressed.
 * The button is the same secondary Edit used on every detail page; the caller
 * puts it in that slot (top right). Closed, a set date still reads as "12 days left".
 */
function PieceAdjust({
    format,
    status,
    due,
    onStatus,
    onDue,
    withStatus = true,
    children,
}: {
    format: LearnFormat;
    status: LearnStatus;
    due: string | undefined;
    onStatus: (status: LearnStatus) => void;
    onDue: (iso: string) => void;
    withStatus?: boolean;
    children: (parts: { button: ReactNode; body: ReactNode }) => ReactNode;
}) {
    const tLearn = useTranslations('features.growth.learn');
    const [open, setOpen] = useState(false);
    const line = due ? dueLine(due, tLearn) : null;
    const canDate = status === 'NOW' || status === 'QUEUE';

    const button = (
        <Button
            type="button"
            variant="secondary"
            size="sm"
            aria-expanded={open}
            onClick={() => setOpen(current => !current)}>
            <EditIcon />
            {open ? tLearn('edit_done') : tLearn('edit')}
        </Button>
    );

    const body = open ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {withStatus ? <StatusPick format={format} status={status} onPick={onStatus} /> : null}
            {canDate ? <FinishBy value={due} onChange={onDue} /> : null}
        </div>
    ) : line ? (
        <p
            className={cn(
                'font-mono text-[10px] tracking-wide uppercase',
                line.over ? 'text-danger' : 'text-fg-muted'
            )}>
            {tLearn('finish_by_line', { text: line.text })}
        </p>
    ) : null;

    return children({ button, body });
}

function StatusPick({
    format,
    status,
    onPick,
}: {
    format: LearnFormat;
    status: LearnStatus;
    onPick: (status: LearnStatus) => void;
}) {
    const tLearn = useTranslations('features.growth.learn');
    const labels = useLearnCatalogLabels();

    return (
        <div
            role="group"
            aria-label={tLearn('status_group_aria')}
            className="flex flex-wrap gap-1.5">
            {PICK.map(key => {
                const on = status === key;
                return (
                    <button
                        key={key}
                        type="button"
                        aria-pressed={on}
                        onClick={() => onPick(on ? 'SHELF' : key)}
                        className={cn(
                            'rounded-full border px-2.5 py-1 font-mono text-[10px] tracking-wide uppercase',
                            on
                                ? 'border-accent/40 bg-accent-soft text-accent'
                                : 'border-line text-fg-muted hover:border-line-strong hover:text-fg'
                        )}>
                        {labels.pickLabel(format, key)}
                    </button>
                );
            })}
        </div>
    );
}

function FilterMenu({
    label,
    options,
}: {
    label: string;
    options: ReadonlyArray<{
        key: string;
        label: string;
        count: number;
        tint?: string;
        on: boolean;
        onSelect: () => void;
    }>;
}) {
    const current = options.find(option => option.on) ?? options[0];
    const skillKeys = new Set<string>(SKILLS.map(skill => skill.key));
    const tLearn = useTranslations('features.growth.learn');
    const groups = [
        { name: '', rows: options.filter(option => option.key === 'ALL') },
        {
            name: tLearn('filter_sections'),
            rows: options.filter(option => option.key !== 'ALL' && !skillKeys.has(option.key)),
        },
        {
            name: tLearn('filter_skills'),
            rows: options.filter(option => skillKeys.has(option.key)),
        },
    ].filter(group => group.rows.length > 0);
    return (
        <div className="grid gap-2.5 px-4 py-3.5">
            <Typography as="span" variant="eyebrow">
                {label}
            </Typography>
            <DropdownMenu>
                <DropdownMenuTrigger className="flex h-11 w-full items-center gap-3 rounded-lg border border-line bg-raised px-3 text-left text-sm text-fg outline-none focus-visible:border-accent">
                    {current?.tint ? <Tint pip={current.tint} /> : null}
                    <span className="min-w-0 flex-1 truncate">{current?.label}</span>
                    <span className="font-mono text-xs text-fg-muted tabular-nums">
                        {current?.count}
                    </span>
                    <Chevron />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    align="start"
                    className="max-h-80 w-(--radix-dropdown-menu-trigger-width) overflow-y-auto rounded-xl border-line bg-surface p-1.5 shadow-lg">
                    <DropdownMenuRadioGroup
                        value={current?.key}
                        onValueChange={key =>
                            options.find(option => option.key === key)?.onSelect()
                        }>
                        {groups.map((group, index) => (
                            <div key={group.name || 'all'}>
                                {index > 0 ? <DropdownMenuSeparator className="bg-line" /> : null}
                                {group.name ? (
                                    <DropdownMenuLabel className="font-mono text-[10px] tracking-wide text-fg-muted uppercase">
                                        {group.name}
                                    </DropdownMenuLabel>
                                ) : null}
                                {group.rows.map(option => (
                                    <DropdownMenuRadioItem
                                        key={option.key}
                                        value={option.key}
                                        className="rounded-lg py-2 pr-3 focus:bg-accent-soft focus:text-fg data-[state=checked]:bg-accent-soft data-[state=checked]:text-accent">
                                        <span className="min-w-0 flex-1 truncate">
                                            {option.label}
                                        </span>
                                        <span className="font-mono text-xs text-fg-muted tabular-nums">
                                            {option.count}
                                        </span>
                                    </DropdownMenuRadioItem>
                                ))}
                            </div>
                        ))}
                    </DropdownMenuRadioGroup>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}

function Tint({ pip }: { pip?: string }) {
    return (
        <span
            aria-hidden
            className="size-2 shrink-0 rounded-full"
            style={pip ? { background: pip } : undefined}
        />
    );
}

function Chevron() {
    return (
        <svg aria-hidden viewBox="0 0 16 16" className="size-4 shrink-0 text-fg-muted">
            <path
                d="M4 6.5 8 10.5 12 6.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function FilterLane({
    label,
    divided,
    options,
}: {
    label: string;
    divided?: boolean;
    options: ReadonlyArray<{
        key: string;
        label: string;
        count: number;
        tint?: string;
        on: boolean;
        onSelect: () => void;
    }>;
}) {
    return (
        <div className={cn('grid gap-2.5 px-4 py-3.5', divided && 'border-b border-line')}>
            <Typography as="span" variant="eyebrow">
                {label}
            </Typography>
            <div
                role="group"
                aria-label={label}
                className="grid gap-px overflow-hidden rounded-xl bg-line"
                style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
                {options.map(option => (
                    <button
                        key={option.key}
                        type="button"
                        aria-pressed={option.on}
                        onClick={option.onSelect}
                        className={cn(
                            'bg-surface px-1.5 py-2 text-center transition-colors hover:bg-raised',
                            option.on && 'bg-accent-soft'
                        )}
                        style={
                            option.tint ? { boxShadow: `inset 0 3px 0 ${option.tint}` } : undefined
                        }>
                        <span
                            className={cn(
                                'block truncate font-mono text-[10px] tracking-wide uppercase',
                                option.on ? 'text-accent' : 'text-fg-muted'
                            )}>
                            {option.label}
                        </span>
                        <span
                            className={cn(
                                'mt-0.5 block font-mono text-sm',
                                option.on ? 'text-accent' : 'text-fg'
                            )}>
                            {option.count}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}

export function LearnPage({ view }: { view: 'shelf' | 'library' }) {
    const t = useTranslations();
    const tLearn = useTranslations('features.growth.learn');
    const labels = useLearnCatalogLabels();
    const { householdId } = useAuth();
    const { plan } = usePlanCapabilities();
    const { locale } = useAppShell();
    const searchParams = useSearchParams();
    const store = storeFor(locale);
    const live = isLiveData(householdId);
    const browsing = view === 'library';
    const [tab, setTab] = useState<Tab>('FOCUS');
    const [search, setSearch] = useState('');
    const [addOpen, setAddOpen] = useState(false);
    const [addSeed, setAddSeed] = useState('');
    const [formatFilter, setFormatFilter] = useState<FormatFilter>('ALL');
    const [aboutFilter, setAboutFilter] = useState<AboutFilter>(() =>
        browsing ? aboutFromQuery(searchParams.get('about')) : 'ALL'
    );
    const {
        statusById,
        dueById,
        rankById,
        setStatus: saveStatus,
        setDue: saveDue,
        setOrder,
    } = useLearnShelf();

    const { books, watches, addedBooks: addedBookRows } = useLearnCatalog();
    const settingsQuery = useLiveQuery(apiQuery.account.settings.queryOptions(), null, live);
    const spendingStyle = settingsQuery.data?.spendingStyle ?? SpendingStyle.UNKNOWN;

    const suggestedIds = new Set<string>();
    const bookPieces = books.flatMap(book => {
        if (!bookVisible(book.minPlan, plan)) return [];
        if (bookSuggested(book.topic, book.spendingStyles, spendingStyle)) {
            suggestedIds.add(book.key);
        }
        return [bookToPiece(book, store, STORE_TAGS)];
    });
    const addedBooks = addedBookRows.map(book => addedBookToPiece(book, store, STORE_TAGS));
    const watchPieces = watches.flatMap(watch => {
        if (!bookVisible(watch.minPlan, plan)) return [];
        if (bookSuggested(watch.topic, watch.spendingStyles, spendingStyle)) {
            suggestedIds.add(watch.key);
        }
        return [watchToPiece(watch)];
    });
    const catalog = [
        ...bookPieces,
        ...addedBooks,
        ...watchPieces,
        ...PIECES.filter(piece => onThisPlan(piece, plan)),
    ];

    function statusOf(piece: LearnPiece): LearnStatus {
        return statusById[piece.id] ?? (live ? 'SHELF' : piece.status);
    }

    function setStatus(id: string, status: LearnStatus) {
        const piece = catalog.find(item => item.id === id);
        saveStatus(id, status, piece?.skill ?? 'MONEY');
    }

    function dueOf(piece: LearnPiece): string | undefined {
        return dueById[piece.id];
    }

    function setDue(id: string, iso: string) {
        const piece = catalog.find(item => item.id === id);
        saveDue(id, iso, piece?.skill ?? 'MONEY');
    }

    const focusPieces = catalog.filter(piece => {
        const status = statusOf(piece);
        return status === 'NOW' || status === 'QUEUE';
    });
    const donePieces = catalog.filter(piece => statusOf(piece) === 'DONE');

    const tabPieces = tab === 'FOCUS' ? focusPieces : donePieces;

    const searched = browsing ? catalog.filter(piece => matchesSearch(piece, search)) : tabPieces;
    const shown = searched
        .filter(piece => {
            if (!browsing) return true;
            if (formatFilter !== 'ALL' && piece.format !== formatFilter) return false;
            if (aboutFilter !== 'ALL' && aboutOf(piece) !== aboutFilter) return false;
            return true;
        })
        .sort(
            (left, right) => Number(suggestedIds.has(right.id)) - Number(suggestedIds.has(left.id))
        );

    const formatsPresent = FORMAT_ORDER.filter(format =>
        searched.some(piece => piece.format === format)
    );
    const aboutsPresent = ABOUT_ORDER.filter(about =>
        searched.some(piece => aboutOf(piece) === about)
    );
    const filtering = search.trim() !== '' || formatFilter !== 'ALL' || aboutFilter !== 'ALL';

    const listSkills = new Set<LearnSkill>(
        focusPieces.length > 0 ? focusPieces.map(piece => piece.skill) : ['MONEY']
    );
    const recommended =
        !browsing && tab === 'FOCUS'
            ? recommendedFor(catalog, listSkills, suggestedIds, statusOf)
            : [];

    function resetFilters() {
        setSearch('');
        setFormatFilter('ALL');
        setAboutFilter('ALL');
    }

    return (
        <div className="grid animate-rise gap-8">
            <div>
                {browsing ? (
                    <Link
                        href="/product/growth/learn"
                        className="mb-3 block w-fit font-mono text-xs font-medium tracking-wide text-fg-faint uppercase hover:text-accent">
                        {tLearn('back')}
                    </Link>
                ) : null}
                <Typography as="span" variant="eyebrow" color="primary">
                    {browsing ? tLearn('eyebrow_library') : tLearn('eyebrow_shelf')}
                </Typography>
                <Typography as="h1" className="mt-2">
                    {browsing ? tLearn('title_library') : tLearn('title_shelf')}
                </Typography>
                <Typography as="p" variant="lead" size="default" className="mt-2">
                    {browsing ? tLearn('lead_library') : tLearn('lead_shelf')}
                </Typography>
                <p className="mt-2 max-w-2xl text-sm text-pretty text-fg-muted">
                    {plan === PlanKey.MAX ? tLearn('partner_max') : tLearn('partner_default')}
                </p>
            </div>

            {browsing ? null : (
                <div
                    className="flex flex-wrap items-center gap-4 rounded-2xl border border-accent/40 bg-accent-soft px-5 py-4"
                    style={{ boxShadow: 'var(--shadow-glow)' }}>
                    <Typography
                        as="p"
                        size="sm"
                        color="secondary"
                        className="min-w-0 flex-1 basis-72 text-pretty">
                        {tLearn('jar_banner')}
                    </Typography>
                    <Link
                        href="/product/money/jars"
                        className="flex-none rounded-full border border-line-strong px-4 py-2.5 font-mono text-xs tracking-wide whitespace-nowrap text-fg-secondary uppercase transition-colors hover:border-accent-hover hover:text-accent">
                        {tLearn('jar_cta')}
                    </Link>
                </div>
            )}

            {browsing ? null : (
                <ListToolbar
                    createSlot={
                        <div className="flex flex-wrap gap-2">
                            {live && householdId ? (
                                <Button
                                    size="sm"
                                    onClick={() => {
                                        setAddSeed('');
                                        setAddOpen(true);
                                    }}>
                                    {tLearn('add_learning')}
                                </Button>
                            ) : null}
                            <Button as={Link} href={LIBRARY_HREF} size="sm">
                                {tLearn('browse_library')}
                            </Button>
                        </div>
                    }>
                    {(
                        [
                            ['FOCUS', tLearn('tab_focus'), focusPieces.length],
                            ['DONE', tLearn('tab_done'), donePieces.length],
                        ] as const
                    ).map(([key, label, count]) => (
                        <ListToolbarTab key={key} active={tab === key} onClick={() => setTab(key)}>
                            {label}
                            <span className="opacity-70">{count}</span>
                        </ListToolbarTab>
                    ))}
                </ListToolbar>
            )}

            {browsing ? (
                <div className="grid overflow-hidden rounded-2xl border border-line bg-surface">
                    <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3.5">
                        <Input
                            type="search"
                            value={search}
                            onChange={event => setSearch(event.target.value)}
                            placeholder={tLearn('search_placeholder')}
                            aria-label={tLearn('search_aria')}
                            className="min-w-0 flex-1 basis-64"
                        />
                        <span className="font-mono text-xs text-fg-muted">
                            {tLearn('count_of', { shown: shown.length, total: catalog.length })}
                        </span>
                        {filtering ? (
                            <button
                                type="button"
                                onClick={resetFilters}
                                className="font-mono text-[11px] tracking-wide text-accent uppercase">
                                {t('ui.button.actions.clear')}
                            </button>
                        ) : null}
                        {live && householdId ? (
                            <Button
                                size="sm"
                                onClick={() => {
                                    setAddSeed(search.trim());
                                    setAddOpen(true);
                                }}>
                                {tLearn('add_learning')}
                            </Button>
                        ) : null}
                    </div>
                    <FilterLane
                        label={tLearn('filter_what')}
                        divided
                        options={(['ALL', ...formatsPresent] as const).map(key => ({
                            key,
                            label:
                                key === 'ALL'
                                    ? tLearn('filter_everything')
                                    : labels.formatPlural(key),
                            count:
                                key === 'ALL'
                                    ? searched.length
                                    : searched.filter(piece => piece.format === key).length,
                            on: formatFilter === key,
                            onSelect: () => setFormatFilter(key),
                        }))}
                    />
                    <FilterMenu
                        label={tLearn('filter_about')}
                        options={(['ALL', ...aboutsPresent] as const).map(key => ({
                            key,
                            label:
                                key === 'ALL' ? tLearn('filter_anything') : labels.aboutLabel(key),
                            count:
                                key === 'ALL'
                                    ? searched.length
                                    : searched.filter(piece => aboutOf(piece) === key).length,
                            tint:
                                key === 'COMMUNICATION' || key === 'MARKETING'
                                    ? skillDef(key).tint
                                    : key === 'ALL'
                                      ? undefined
                                      : skillDef('MONEY').tint,
                            on: aboutFilter === key,
                            onSelect: () => setAboutFilter(key),
                        }))}
                    />
                </div>
            ) : null}

            {tab === 'FOCUS' && !browsing ? (
                <div className="grid gap-8">
                    <ReadingList
                        pieces={byPriority(focusPieces, rankById)}
                        statusOf={statusOf}
                        dueOf={dueOf}
                        onStatus={setStatus}
                        onDue={setDue}
                        onMove={shift => {
                            const ordered = byPriority(focusPieces, rankById);
                            const next = [...ordered];
                            const target = shift.from + shift.dir;
                            if (target < 0 || target >= next.length) return;
                            const [row] = next.splice(shift.from, 1);
                            if (!row) return;
                            next.splice(target, 0, row);
                            setOrder(next.map(piece => ({ id: piece.id, skill: piece.skill })));
                        }}
                    />
                    {recommended.length > 0 ? (
                        <PieceGroups
                            pieces={recommended}
                            recommended
                            statusOf={statusOf}
                            dueOf={dueOf}
                            onStatus={setStatus}
                            onDue={setDue}
                        />
                    ) : null}
                </div>
            ) : null}

            {shown.length === 0 && (browsing || tab === 'DONE') ? (
                <EmptyState
                    icon="✦"
                    title={
                        tab === 'DONE'
                            ? tLearn('done_empty_title')
                            : filtering
                              ? tLearn('filter_empty_title')
                              : tLearn('shelf_empty_title')
                    }
                    body={
                        filtering
                            ? search.trim()
                                ? tLearn('filter_search_body')
                                : tLearn('filter_body')
                            : tab === 'DONE'
                              ? tLearn('done_empty_body')
                              : tLearn('shelf_empty_body')
                    }
                    action={
                        browsing && live && householdId && search.trim() ? (
                            <Button
                                size="sm"
                                onClick={() => {
                                    setAddSeed(search.trim());
                                    setAddOpen(true);
                                }}>
                                {tLearn('add_learning')}
                            </Button>
                        ) : undefined
                    }
                />
            ) : null}

            {browsing && shown.length > 0 ? (
                <div className="grid gap-6">
                    {FORMAT_ORDER.map(format => {
                        const items = shown.filter(piece => piece.format === format);
                        if (items.length === 0) return null;
                        return (
                            <section key={format} className="grid gap-3">
                                <div className="flex items-baseline justify-between gap-3 px-1">
                                    <Typography as="h2" variant="eyebrow" color="primary">
                                        ✦ {labels.formatPlural(format).toUpperCase()}
                                    </Typography>
                                    <span className="font-mono text-xs text-fg-muted">
                                        {items.length}
                                    </span>
                                </div>
                                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                    {items.map(piece => {
                                        const status = statusOf(piece);
                                        const forYou = suggestedIds.has(piece.id);
                                        return (
                                            <article
                                                key={piece.id}
                                                className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-md">
                                                <MediaCover piece={piece} />
                                                <div className="flex flex-1 flex-col gap-2 p-4">
                                                    <PieceAdjust
                                                        format={piece.format}
                                                        status={status}
                                                        due={dueOf(piece)}
                                                        onStatus={next => setStatus(piece.id, next)}
                                                        onDue={iso => setDue(piece.id, iso)}>
                                                        {({ button, body }) => (
                                                            <>
                                                                <div className="flex items-start justify-between gap-3">
                                                                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                                                                        <span className="font-mono text-[10px] tracking-widest text-fg-muted uppercase">
                                                                            {labels.aboutLabel(
                                                                                aboutOf(piece)
                                                                            )}
                                                                        </span>
                                                                        {forYou ? (
                                                                            <span className="rounded-full bg-accent-soft px-2 py-0.5 font-mono text-[10px] tracking-widest text-accent uppercase">
                                                                                {tLearn('for_you')}
                                                                            </span>
                                                                        ) : null}
                                                                    </div>
                                                                    {button}
                                                                </div>
                                                                <h3 className="text-base leading-snug font-medium text-fg">
                                                                    {piece.title}
                                                                </h3>
                                                                <p className="font-mono text-xs text-fg-muted">
                                                                    {piece.by}
                                                                </p>
                                                                <PieceLine
                                                                    piece={piece}
                                                                    className="text-sm text-pretty text-fg-secondary"
                                                                />
                                                                <PieceSecondary piece={piece} />
                                                                <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-3">
                                                                    <div className="grid gap-2">
                                                                        <span className="font-mono text-[10px] tracking-widest text-accent uppercase">
                                                                            {status === 'SHELF'
                                                                                ? labels.partnerLabel(
                                                                                      piece.partner
                                                                                  )
                                                                                : labels.pickLabel(
                                                                                      piece.format,
                                                                                      status
                                                                                  )}
                                                                        </span>
                                                                        {body}
                                                                    </div>
                                                                    <PieceLinks piece={piece} />
                                                                </div>
                                                            </>
                                                        )}
                                                    </PieceAdjust>
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                            </section>
                        );
                    })}
                </div>
            ) : null}

            {!browsing && tab !== 'FOCUS' && shown.length > 0 ? (
                <PieceGroups
                    pieces={shown}
                    statusOf={statusOf}
                    dueOf={dueOf}
                    onStatus={setStatus}
                    onDue={setDue}
                />
            ) : null}

            {shown.length > 0 || recommended.length > 0 ? (
                <p className="px-1 text-center text-xs text-pretty text-fg-faint">
                    {tLearn('footer_stores', { store: labels.storeName(store) })}
                    {HAS_PARTNER_TAGS
                        ? tLearn('footer_commission')
                        : tLearn('footer_no_commission')}
                </p>
            ) : null}
            {live && householdId ? (
                <AddLearningDialog
                    open={addOpen}
                    onOpenChange={setAddOpen}
                    householdId={householdId}
                    initialQuery={addSeed}
                    books={books}
                    onPick={(pieceKey, skill) => saveStatus(pieceKey, 'QUEUE', skill)}
                />
            ) : null}
        </div>
    );
}

function ReadingList({
    pieces,
    statusOf,
    dueOf,
    onStatus,
    onDue,
    onMove,
}: {
    pieces: LearnPiece[];
    statusOf: (piece: LearnPiece) => LearnStatus;
    dueOf: (piece: LearnPiece) => string | undefined;
    onStatus: (id: string, status: LearnStatus) => void;
    onDue: (id: string, iso: string) => void;
    onMove: (shift: { from: number; dir: -1 | 1 }) => void;
}) {
    const tLearn = useTranslations('features.growth.learn');
    const labels = useLearnCatalogLabels();

    if (pieces.length === 0) {
        return (
            <EmptyState
                icon="✦"
                title={tLearn('reading_empty_title')}
                body={tLearn('reading_empty_body')}
            />
        );
    }

    return (
        <Card className="p-0">
            <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
                <Typography as="span" variant="eyebrow" color="primary">
                    ✦ {tLearn('reading_heading')}
                </Typography>
                <span className="font-mono text-xs text-fg-muted">{pieces.length}</span>
            </div>
            <ul className="grid">
                {pieces.map((piece, index) => {
                    const status = statusOf(piece);
                    const reading = status === 'NOW';
                    return (
                        <li
                            key={piece.id}
                            className={cn(
                                'border-b border-line last:border-b-0',
                                reading && 'bg-accent-soft'
                            )}>
                            <PieceAdjust
                                format={piece.format}
                                status={status}
                                due={dueOf(piece)}
                                onStatus={next => onStatus(piece.id, next)}
                                onDue={iso => onDue(piece.id, iso)}>
                                {({ button, body }) => (
                                    <div className="flex items-start gap-3 px-5 py-3.5">
                                        <span
                                            className={cn(
                                                'grid size-7 shrink-0 place-items-center rounded-full font-mono text-xs',
                                                reading
                                                    ? 'bg-accent text-on-accent'
                                                    : 'bg-raised text-fg-muted'
                                            )}>
                                            {index + 1}
                                        </span>
                                        <MediaCover
                                            piece={piece}
                                            className="w-12 shrink-0 rounded-md"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium text-fg">
                                                {piece.title}
                                                <span className="ml-2 font-mono text-[10px] tracking-wide text-accent uppercase">
                                                    {labels.pickLabel(piece.format, status)}
                                                </span>
                                            </p>
                                            <PieceLine
                                                piece={piece}
                                                className="mt-0.5 truncate text-xs text-fg-muted italic"
                                            />
                                            <p className="mt-1 font-mono text-[11px] text-fg-faint">
                                                {piece.by} · {labels.aboutLabel(aboutOf(piece))}
                                            </p>
                                            {body ? <div className="mt-3">{body}</div> : null}
                                        </div>
                                        <div className="flex shrink-0 flex-col items-end gap-2">
                                            <div className="flex gap-1">
                                                <button
                                                    type="button"
                                                    aria-label={tLearn('move_earlier')}
                                                    disabled={index === 0}
                                                    onClick={() => onMove({ from: index, dir: -1 })}
                                                    className="grid size-7 place-items-center rounded-full border border-line font-mono text-xs text-fg-muted hover:border-accent-hover hover:text-accent disabled:opacity-30">
                                                    ↑
                                                </button>
                                                <button
                                                    type="button"
                                                    aria-label={tLearn('move_later')}
                                                    disabled={index === pieces.length - 1}
                                                    onClick={() => onMove({ from: index, dir: 1 })}
                                                    className="grid size-7 place-items-center rounded-full border border-line font-mono text-xs text-fg-muted hover:border-accent-hover hover:text-accent disabled:opacity-30">
                                                    ↓
                                                </button>
                                            </div>
                                            {button}
                                            <PieceLinks piece={piece} />
                                        </div>
                                    </div>
                                )}
                            </PieceAdjust>
                        </li>
                    );
                })}
            </ul>
        </Card>
    );
}

function PieceGroups({
    pieces,
    recommended = false,
    statusOf,
    dueOf,
    onStatus,
    onDue,
}: {
    pieces: LearnPiece[];
    /** Nothing is picked yet. The coach offers a short list, not the library. */
    recommended?: boolean;
    statusOf: (piece: LearnPiece) => LearnStatus;
    dueOf: (piece: LearnPiece) => string | undefined;
    onStatus: (id: string, status: LearnStatus) => void;
    onDue: (id: string, iso: string) => void;
}) {
    const tLearn = useTranslations('features.growth.learn');
    const labels = useLearnCatalogLabels();
    const coach = useHelpersEnabled();
    const groups = recommended
        ? []
        : FORMAT_ORDER.map(format => ({
              key: format,
              label: labels.formatLabel(format).toUpperCase(),
              items: pieces.filter(piece => piece.format === format),
          })).filter(group => group.items.length > 0);

    function row(piece: LearnPiece) {
        const status = statusOf(piece);
        return (
            <li key={piece.id} className="border-b border-line last:border-b-0">
                <PieceAdjust
                    format={piece.format}
                    status={status}
                    due={dueOf(piece)}
                    onStatus={next => onStatus(piece.id, next)}
                    onDue={iso => onDue(piece.id, iso)}>
                    {({ button, body }) => (
                        <div className="flex items-start gap-3 px-5 py-3.5">
                            <MediaCover piece={piece} className="w-12 shrink-0 rounded-md" />
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-fg">
                                    {piece.title}
                                    <span className="ml-2 font-mono text-[10px] tracking-wide text-accent uppercase">
                                        {status === 'SHELF'
                                            ? ''
                                            : labels.pickLabel(piece.format, status)}
                                    </span>
                                </p>
                                <PieceLine
                                    piece={piece}
                                    className="mt-0.5 truncate text-xs text-fg-muted italic"
                                />
                                <p className="mt-1 font-mono text-[11px] text-fg-faint">
                                    {piece.by} · {labels.aboutLabel(aboutOf(piece))}
                                </p>
                                {piece.secondary ? (
                                    <div className="mt-1">
                                        <PieceSecondary piece={piece} />
                                    </div>
                                ) : null}
                                {body ? <div className="mt-3">{body}</div> : null}
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-3">
                                {button}
                                <PieceLinks piece={piece} />
                            </div>
                        </div>
                    )}
                </PieceAdjust>
            </li>
        );
    }

    if (recommended) {
        return (
            <Card className="p-0">
                <div className="grid gap-2 border-b border-line px-5 py-3.5">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                            {coach ? <CoachMark size="sm" /> : null}
                            <Typography as="span" variant="eyebrow" color="primary">
                                {coach ? tLearn('coach_not_on_list') : tLearn('recommended')}
                            </Typography>
                        </div>
                        <span className="font-mono text-xs text-fg-muted">{pieces.length}</span>
                    </div>
                    {coach ? (
                        <p className="text-sm leading-relaxed text-pretty text-fg-secondary">
                            {tLearn('coach_recommended_body')}
                        </p>
                    ) : null}
                </div>
                <ul className="grid">{pieces.map(row)}</ul>
            </Card>
        );
    }

    return (
        <div className="grid gap-4">
            {groups.map(group => (
                <Card key={group.key} className="p-0">
                    <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
                        <Typography as="span" variant="eyebrow" color="primary">
                            ✦ {group.label}
                        </Typography>
                        <span className="font-mono text-xs text-fg-muted">
                            {group.items.length}
                        </span>
                    </div>
                    <ul className="grid">{group.items.map(row)}</ul>
                </Card>
            ))}
        </div>
    );
}
