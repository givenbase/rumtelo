'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type ReactNode } from 'react';

import {
    SpendingStyle,
    type LearnBookPreset,
    type LearnBook,
    type LearnWatchPreset,
} from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import {
    AccentCard,
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
import { CoachTipCard } from '@/components/features/helpers';
import { useAppShell } from '@/components/features/shell/app-shell-context';
import { useAuth } from '@/components/features/shell/auth-provider';
import { EditIcon } from '@/components/features/ui/action-icons';
import { usePlanCapabilities } from '@/components/features/shell/use-plan-capabilities';
import { ListToolbar, ListToolbarTab } from '@/components/layout/list-toolbar';

import { useLearnShelf } from './learn-shelf';
import { AddLearningDialog } from './add-learning-dialog';

import {
    ABOUT_ORDER,
    FORMAT_ORDER,
    PIECES,
    SKILLS,
    aboutLabel,
    aboutOf,
    bookSuggested,
    bookToPiece,
    bookVisible,
    formatLabel,
    formatPlural,
    matchesSearch,
    partnerLabel,
    pickLabel,
    skillDef,
    storeFor,
    storeName,
    addedBookToPiece,
    watchToPiece,
    type LearnFormat,
    type LearnPiece,
    type LearnSkill,
    type LearnStatus,
} from './learn-catalog';

const EMPTY_BOOKS: LearnBookPreset[] = [];
const EMPTY_WATCH: LearnWatchPreset[] = [];
const EMPTY_BOOKS_ADDED: LearnBook[] = [];
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

function partnerLine(plan: PlanKey): string {
    if (plan === PlanKey.MAX) {
        return 'Courses on Max are on Masterclass. Basic and Plus point at Udemy instead. Books, films, and series open as the plan allows — we recommend them, we do not host them.';
    }
    return 'Courses on Basic and Plus are on Udemy. Max points at Masterclass instead. Books, films, and series open as the plan allows — we recommend them, we do not host them.';
}

/** MasterClass header mark and wordmark. Their paths, our color. Not the course photo. */
const MASTERCLASS_MARK =
    'M11.843 12.6 9.775 5H4.033v1.22h.545c.68 0 1.242.421 1.45 1.199l3.162 11.58h2.88l1.412-5.14-.02-.019c-.921 0-1.375-.36-1.619-1.24m11.612 5.179c-.677 0-1.223-.48-1.43-1.22L18.865 5H14.46l3.82 13.999H24v-1.22zM0 17.776V19h5.088v-1.224z';
const MASTERCLASS_WORD =
    'M13.048 3.619 9.121 14.695H8.064L3.891 3.619l-1.03 8.54a4 4 0 0 0-.044.493c0 1.031.449 1.242 1.963 1.321v.722H0v-.722c1.179-.062 1.576-.29 1.699-1.215L3.002 2.457c.141-1.118-.396-1.444-1.761-1.532V.229h4.675c.044.45.141.802.308 1.259l3.372 8.989 3.126-9.016c.167-.449.29-.783.326-1.233h4.595v.696c-1.329.088-1.866.414-1.716 1.532l1.259 10.301c.123.969.555 1.154 1.699 1.215v.722h-6.682v-.722c1.426-.079 1.919-.29 1.919-1.321 0-.123-.018-.334-.035-.493zm14.905 8.786c0 .704.167 1.154.687 1.154.308 0 .599-.097.827-.202l.123.449c-.599.704-1.382 1.1-2.333 1.1-1.144 0-1.866-.687-2.069-1.823-.661.872-1.735 1.779-3.249 1.779-1.655 0-2.747-1.012-2.747-2.668 0-1.752 1.259-2.501 2.809-3.055l3.125-1.135V6.26c0-1.197-.397-2.042-1.453-2.042-.968 0-1.549.246-1.857.678.643.15 1.012.66 1.012 1.303 0 .89-.616 1.471-1.567 1.471-.889 0-1.452-.581-1.452-1.488 0-1.734 1.778-2.606 4.094-2.606 2.624 0 4.05.951 4.05 3.39zm-2.826.185V8.76l-1.779.704c-.871.352-1.426.81-1.426 1.963 0 1.083.493 1.822 1.611 1.822.599.001 1.013-.227 1.594-.659m4.798 1.304-.132-2.853h.766c.458 1.796 1.488 3.143 3.081 3.143 1.119 0 1.946-.519 1.946-1.656 0-1.118-.748-1.549-2.377-2.13-2.193-.766-3.328-1.638-3.328-3.54 0-2.086 1.567-3.284 3.821-3.284 1.347 0 2.483.335 3.372.89v2.501h-.704c-.352-1.471-1.197-2.685-2.668-2.685-1.048 0-1.673.616-1.673 1.532 0 .924.643 1.383 2.236 1.981 2.228.766 3.53 1.611 3.53 3.636 0 2.193-1.628 3.478-4.173 3.478-1.575-.001-2.852-.415-3.697-1.013M42.243 3.76h2.694v.933h-2.694v6.858c0 1.241.475 1.779 1.452 1.779.555 0 1.013-.186 1.524-.555l.273.352c-.66 1.03-1.7 1.779-3.205 1.779-1.673 0-2.914-.889-2.914-3.205V4.693h-1.285v-.44c1.426-.661 2.623-1.796 3.513-3.161h.643zm12.493 4.111v.475H48.01c-.079 2.879 1.391 4.613 3.416 4.613 1.408 0 2.333-.616 3.082-1.69l.308.185c-.519 2.043-2.025 3.451-4.385 3.451-2.993 0-5-2.21-5-5.38 0-3.513 2.272-5.952 5.089-5.952 2.763.002 4.216 1.824 4.216 4.298m-6.665-.264h4.094c0-1.963-.511-3.284-1.858-3.284-1.364 0-2.086 1.382-2.236 3.284m27.478-6.365.044 3.302h-.81C74.308 2.167 73.093.89 71.085.89c-2.835 0-4.138 2.826-4.138 6.348 0 3.838 1.514 6.779 4.323 6.779 1.946 0 3.266-1.224 3.971-4.218h.845l-.326 3.883c-1.197.766-2.817 1.223-4.754 1.223-4.491 0-7.263-2.809-7.263-7.07C63.743 3.02 66.948 0 71.006 0c1.84 0 3.363.449 4.543 1.242m5.212 11.868c0 .722.308.846 1.285.907v.678h-5.441v-.678c.951-.062 1.285-.185 1.285-.907V2.105l-1.24-.643v-.431l3.654-.995h.458zm7.58-.529v-3.82l-1.778.704c-.846.326-1.409.802-1.409 1.963 0 1.074.502 1.822 1.594 1.822.599 0 1.012-.228 1.593-.669m4.808 1.313-.123-2.853h.766c.449 1.796 1.488 3.143 3.073 3.143 1.118 0 1.972-.519 1.972-1.656 0-1.118-.766-1.549-2.404-2.13-2.192-.766-3.328-1.638-3.328-3.54 0-2.086 1.567-3.284 3.847-3.284 1.32 0 2.456.335 3.346.89v2.501h-.704c-.343-1.471-1.198-2.685-2.641-2.685-1.074 0-1.7.616-1.7 1.532 0 .924.643 1.383 2.237 1.981 2.236.766 3.557 1.611 3.557 3.636 0 2.193-1.655 3.478-4.199 3.478-1.569-.001-2.854-.415-3.699-1.013m8.954 0-.106-2.853h.766c.449 1.796 1.505 3.143 3.081 3.143 1.109 0 1.963-.519 1.963-1.656 0-1.118-.783-1.549-2.377-2.13-2.219-.766-3.354-1.638-3.354-3.54 0-2.086 1.576-3.284 3.847-3.284 1.32 0 2.456.335 3.354.89v2.501h-.704c-.335-1.471-1.207-2.685-2.65-2.685-1.075 0-1.673.616-1.673 1.532 0 .924.616 1.383 2.21 1.981 2.255.765 3.54 1.61 3.54 3.635 0 2.193-1.637 3.478-4.182 3.478-1.55 0-2.853-.414-3.715-1.012m-10.918-1.489c0 .704.158 1.154.678 1.154.308 0 .599-.097.828-.202l.123.449c-.599.704-1.383 1.1-2.333 1.1-1.135 0-1.867-.687-2.069-1.823-.66.872-1.734 1.779-3.249 1.779-1.655 0-2.747-1.012-2.747-2.668 0-1.752 1.259-2.501 2.809-3.055l3.126-1.135V6.26c0-1.197-.396-2.042-1.444-2.042-.977 0-1.559.246-1.867.678.643.15 1.013.66 1.013 1.303 0 .89-.617 1.471-1.567 1.471-.889 0-1.452-.581-1.452-1.488 0-1.734 1.778-2.606 4.094-2.606 2.633 0 4.059.951 4.059 3.39v5.439zM60.212 4.94c0 1.012.599 1.655 1.506 1.655.995 0 1.62-.643 1.62-1.549 0-.933-.563-1.471-1.364-1.471-1.118 0-1.84.784-2.65 3.064l.079-3.064h-.475L55.23 4.694v.386l1.241.748v7.281c0 .722-.335.846-1.285.907v.678h5.873v-.678c-1.259-.106-1.735-.229-1.735-1.057V7.651c.458-1.286 1.18-2.175 2.377-2.879z';

function MasterclassMark() {
    return (
        <span className="inline-flex items-center gap-2 text-fg" aria-label="MasterClass">
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
                                {partnerLabel(piece.partner)}
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
    return (
        <Outbound href={piece.primary.href} primary>
            {piece.primary.label}
        </Outbound>
    );
}

function PieceSecondary({ piece }: { piece: LearnPiece }) {
    if (!piece.secondary) return null;
    return <Outbound href={piece.secondary.href}>{piece.secondary.label}</Outbound>;
}

const PICK: readonly LearnStatus[] = ['QUEUE', 'NOW', 'DONE'];

function todayIso(): string {
    return new Date().toISOString().slice(0, 10);
}

/** "12 days left", "Due today", "3 days over". Whole days, local calendar. */
export function dueLine(iso: string): { text: string; over: boolean } {
    const due = new Date(`${iso}T00:00:00`);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const days = Math.round((due.getTime() - now.getTime()) / 86_400_000);
    if (days === 0) return { text: 'Due today', over: false };
    if (days === 1) return { text: 'Due tomorrow', over: false };
    if (days < 0) return { text: `${-days} day${days === -1 ? '' : 's'} over`, over: true };
    return { text: `${days} days left`, over: false };
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
    const line = value ? dueLine(value) : null;
    return (
        <div
            className={cn(
                'flex flex-wrap items-center gap-2 font-mono text-[10px] tracking-wide text-fg-muted uppercase',
                className
            )}>
            <span>Finish by</span>
            <DatePicker
                value={value ?? null}
                min={todayIso()}
                onChange={onChange}
                placeholder="Pick a date"
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
    const [open, setOpen] = useState(false);
    const line = due ? dueLine(due) : null;
    const canDate = status === 'NOW' || status === 'QUEUE';

    const button = (
        <Button
            type="button"
            variant="secondary"
            size="sm"
            aria-expanded={open}
            onClick={() => setOpen(current => !current)}>
            <EditIcon />
            {open ? 'Done' : 'Edit'}
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
            Finish by · {line.text}
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
    return (
        <div role="group" aria-label="Where this sits" className="flex flex-wrap gap-1.5">
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
                        {pickLabel(format, key)}
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
    const groups = [
        { name: '', rows: options.filter(option => option.key === 'ALL') },
        {
            name: 'Sections',
            rows: options.filter(option => option.key !== 'ALL' && !skillKeys.has(option.key)),
        },
        { name: 'Skills', rows: options.filter(option => skillKeys.has(option.key)) },
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
    const { householdId } = useAuth();
    const { plan } = usePlanCapabilities();
    const { locale } = useAppShell();
    const router = useRouter();
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
        focused,
        setStatus: saveStatus,
        setDue: saveDue,
        focusSkill,
    } = useLearnShelf();

    const booksQuery = useLiveQuery(
        apiQuery.growth.catalogs.bookPresets.list.queryOptions({
            input: { householdId: householdId! },
        }),
        EMPTY_BOOKS,
        live
    );
    const addedBooksQuery = useLiveQuery(
        apiQuery.growth.learn.listBooks.queryOptions({
            input: { householdId: householdId! },
        }),
        EMPTY_BOOKS_ADDED,
        live
    );
    const watchQuery = useLiveQuery(
        apiQuery.growth.catalogs.watchPresets.list.queryOptions({
            input: { householdId: householdId! },
        }),
        EMPTY_WATCH,
        live
    );
    const settingsQuery = useLiveQuery(apiQuery.account.settings.queryOptions(), null, live);
    const spendingStyle = settingsQuery.data?.spendingStyle ?? SpendingStyle.UNKNOWN;

    const suggestedIds = new Set<string>();
    const bookPieces = (booksQuery.data ?? EMPTY_BOOKS).flatMap(book => {
        if (!bookVisible(book.minPlan, plan)) return [];
        if (bookSuggested(book.topic, book.spendingStyles, spendingStyle)) {
            suggestedIds.add(book.key);
        }
        return [bookToPiece(book, store, STORE_TAGS)];
    });
    const addedBooks = (addedBooksQuery.data ?? EMPTY_BOOKS_ADDED).map(book =>
        addedBookToPiece(book, store, STORE_TAGS)
    );
    const watchPieces = (watchQuery.data ?? EMPTY_WATCH).flatMap(watch => {
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

    const activeSkills = SKILLS.filter(skill => focused.has(skill.key));
    const idleSkills = SKILLS.filter(skill => !focused.has(skill.key));

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
                        ← Learn
                    </Link>
                ) : null}
                <Typography as="span" variant="eyebrow" color="primary">
                    {browsing ? '✦ THE LIBRARY' : '✦ WHAT I LEARN'}
                </Typography>
                <Typography as="h1" className="mt-2">
                    {browsing
                        ? 'What we recommend. We do not host it.'
                        : "Distribution has a floor. Learning doesn't."}
                </Typography>
                <Typography as="p" variant="lead" size="default" className="mt-2">
                    {browsing
                        ? 'Search, then narrow by what it is and what it is about. Mark a title and it lands on Learn.'
                        : 'A skill is the decision. A book, film, series, video, or course is how you work it. We recommend what to get and who to support — we never host the work.'}
                </Typography>
                <p className="mt-2 max-w-2xl text-sm text-pretty text-fg-muted">
                    {partnerLine(plan)}
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
                        Your Education jar is where this spending lives. What raises your earning
                        power pays itself back into Financial Freedom.
                    </Typography>
                    <Link
                        href="/product/money/jars"
                        className="flex-none rounded-full border border-line-strong px-4 py-2.5 font-mono text-xs tracking-wide whitespace-nowrap text-fg-secondary uppercase transition-colors hover:border-accent-hover hover:text-accent">
                        View Education jar ›
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
                                    Add learning
                                </Button>
                            ) : null}
                            <Button as={Link} href={LIBRARY_HREF} size="sm">
                                Browse library
                            </Button>
                        </div>
                    }>
                    {(
                        [
                            ['FOCUS', 'Focus', focusPieces.length],
                            ['DONE', 'Done', donePieces.length],
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
                            placeholder="Search a title, author, or subject"
                            aria-label="Search the library"
                            className="min-w-0 flex-1 basis-64"
                        />
                        <span className="font-mono text-xs text-fg-muted">
                            {shown.length} of {catalog.length}
                        </span>
                        {filtering ? (
                            <button
                                type="button"
                                onClick={resetFilters}
                                className="font-mono text-[11px] tracking-wide text-accent uppercase">
                                Clear
                            </button>
                        ) : null}
                        {live && householdId ? (
                            <Button
                                size="sm"
                                onClick={() => {
                                    setAddSeed(search.trim());
                                    setAddOpen(true);
                                }}>
                                Add learning
                            </Button>
                        ) : null}
                    </div>
                    <FilterLane
                        label="What"
                        divided
                        options={(['ALL', ...formatsPresent] as const).map(key => ({
                            key,
                            label: key === 'ALL' ? 'Everything' : formatPlural(key),
                            count:
                                key === 'ALL'
                                    ? searched.length
                                    : searched.filter(piece => piece.format === key).length,
                            on: formatFilter === key,
                            onSelect: () => setFormatFilter(key),
                        }))}
                    />
                    <FilterMenu
                        label="About"
                        options={(['ALL', ...aboutsPresent] as const).map(key => ({
                            key,
                            label: key === 'ALL' ? 'Anything' : aboutLabel(key),
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
                <FocusBoard
                    active={activeSkills}
                    idle={idleSkills}
                    catalog={catalog}
                    statusOf={statusOf}
                    dueOf={dueOf}
                    onDue={setDue}
                    onFocus={skill => {
                        focusSkill(skill);
                        router.push(
                            skill === 'MONEY' ? LIBRARY_HREF : `${LIBRARY_HREF}?about=${skill}`
                        );
                    }}
                    shelf={
                        shown.length > 0 ? (
                            <PieceGroups
                                pieces={shown}
                                statusOf={statusOf}
                                dueOf={dueOf}
                                onStatus={setStatus}
                                onDue={setDue}
                            />
                        ) : null
                    }
                />
            ) : null}

            {shown.length === 0 && (browsing || tab === 'DONE') ? (
                <EmptyState
                    icon="✦"
                    title={
                        tab === 'DONE'
                            ? 'Nothing finished yet.'
                            : filtering
                              ? 'Nothing matches.'
                              : 'Nothing on this shelf.'
                    }
                    body={
                        filtering
                            ? search.trim()
                                ? 'Nothing we recommend matches. Add it from the public catalog.'
                                : 'Try another word, or clear the filters.'
                            : tab === 'DONE'
                              ? 'Mark a title as read, watched, or finished and it lands here.'
                              : 'Pick one. Say if you need it, or if you already have it.'
                    }
                    action={
                        browsing && live && householdId && search.trim() ? (
                            <Button
                                size="sm"
                                onClick={() => {
                                    setAddSeed(search.trim());
                                    setAddOpen(true);
                                }}>
                                Add learning
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
                                        ✦ {formatPlural(format).toUpperCase()}
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
                                                                            {aboutLabel(
                                                                                aboutOf(piece)
                                                                            )}
                                                                        </span>
                                                                        {forYou ? (
                                                                            <span className="rounded-full bg-accent-soft px-2 py-0.5 font-mono text-[10px] tracking-widest text-accent uppercase">
                                                                                For you
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
                                                                                ? partnerLabel(
                                                                                      piece.partner
                                                                                  )
                                                                                : pickLabel(
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

            {shown.length > 0 ? (
                <p className="px-1 text-center text-xs text-pretty text-fg-faint">
                    Books open at {storeName(store)}. Films and series open on JustWatch, which
                    shows where they stream in your country. Courses open at Udemy or Masterclass.
                    {HAS_PARTNER_TAGS
                        ? ' Some of these links earn Rumtelo a small commission. The price is the same for you.'
                        : ' We recommend and point — we never host the work.'}
                </p>
            ) : null}
            {live && householdId ? (
                <AddLearningDialog
                    open={addOpen}
                    onOpenChange={setAddOpen}
                    householdId={householdId}
                    initialQuery={addSeed}
                    books={booksQuery.data ?? EMPTY_BOOKS}
                    onPick={(pieceKey, skill) => saveStatus(pieceKey, 'QUEUE', skill)}
                />
            ) : null}
        </div>
    );
}

function FocusBoard({
    active,
    idle,
    catalog,
    statusOf,
    dueOf,
    onDue,
    onFocus,
    shelf,
}: {
    active: readonly (typeof SKILLS)[number][];
    idle: readonly (typeof SKILLS)[number][];
    catalog: LearnPiece[];
    statusOf: (piece: LearnPiece) => LearnStatus;
    dueOf: (piece: LearnPiece) => string | undefined;
    onDue: (id: string, iso: string) => void;
    onFocus: (skill: LearnSkill) => void;
    /** The titles already picked. Sits in the space beside one skill in focus. */
    shelf?: ReactNode;
}) {
    if (active.length === 0 && idle.length === 0) return null;

    const withShelf = Boolean(shelf) && active.length > 0;

    return (
        <div className="grid gap-4">
            {active.length > 0 ? (
                <div
                    className={cn(
                        'grid gap-4',
                        !withShelf && active.length > 1 && 'sm:grid-cols-2'
                    )}>
                    {active.map(skill => {
                        const pieces = catalog.filter(piece => piece.skill === skill.key);
                        const next = withShelf
                            ? null
                            : (pieces.find(piece => statusOf(piece) === 'NOW') ??
                              pieces.find(piece => statusOf(piece) === 'QUEUE') ??
                              null);
                        return (
                            <AccentCard key={skill.key} tint={skill.tint}>
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-raised px-2.5 py-1 font-mono text-[10px] tracking-widest text-fg-secondary uppercase">
                                    <span
                                        className="size-1.75 rounded-sm"
                                        style={{ background: skill.tint }}
                                    />
                                    Skill · {skill.line}
                                </span>
                                <Typography as="h3" className="mt-3 text-2xl leading-tight">
                                    {skill.name}
                                </Typography>
                                <p className="mt-2 text-sm leading-snug text-fg-secondary italic">
                                    “{skill.why}”
                                </p>
                                {next ? (
                                    <PieceAdjust
                                        format={next.format}
                                        status={statusOf(next)}
                                        due={dueOf(next)}
                                        onStatus={() => undefined}
                                        onDue={iso => onDue(next.id, iso)}
                                        withStatus={false}>
                                        {({ button, body }) => (
                                            <div className="mt-5 grid gap-3">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex min-w-0 items-center gap-3">
                                                        <MediaCover
                                                            piece={next}
                                                            className="w-11 shrink-0 rounded-md"
                                                        />
                                                        <div className="min-w-0">
                                                            <p className="font-mono text-[10px] tracking-widest text-fg-faint uppercase">
                                                                {pickLabel(
                                                                    next.format,
                                                                    statusOf(next)
                                                                )}
                                                            </p>
                                                            <p className="truncate text-sm font-medium text-fg">
                                                                {next.title}
                                                            </p>
                                                            <p className="truncate font-mono text-[11px] text-fg-muted">
                                                                {formatLabel(next.format)} ·{' '}
                                                                {next.by}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    {button}
                                                </div>
                                                {body}
                                            </div>
                                        )}
                                    </PieceAdjust>
                                ) : withShelf ? null : (
                                    <p className="mt-4 font-mono text-xs text-fg-muted">
                                        ◇ Nothing picked for {skill.name} yet. Choose one in the
                                        library.
                                    </p>
                                )}
                            </AccentCard>
                        );
                    })}
                    {withShelf ? <div className="sm:col-span-full">{shelf}</div> : null}
                </div>
            ) : (
                <EmptyState
                    icon="✦"
                    title="No skill in focus."
                    body="Pick communication, marketing, or money. Then choose a piece from the library."
                />
            )}

            {idle.length > 0 ? (
                <div
                    className={cn(
                        'grid gap-2',
                        idle.length === 3
                            ? 'sm:grid-cols-3'
                            : idle.length > 1
                              ? 'sm:grid-cols-2'
                              : undefined
                    )}>
                    {idle.map(skill => (
                        <button
                            key={skill.key}
                            type="button"
                            onClick={() => onFocus(skill.key)}
                            className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-line bg-surface px-4 py-3 text-left hover:border-accent-hover">
                            <span className="min-w-0">
                                <span className="flex items-center gap-2">
                                    <span
                                        className="size-1.75 rounded-sm"
                                        style={{ background: skill.tint }}
                                    />
                                    <span className="text-sm font-medium text-fg">
                                        {skill.name}
                                    </span>
                                </span>
                                <span className="mt-0.5 block truncate text-xs text-fg-muted">
                                    {skill.line}
                                </span>
                            </span>
                            <span className="shrink-0 font-mono text-[11px] tracking-wide text-accent uppercase">
                                Focus
                            </span>
                        </button>
                    ))}
                </div>
            ) : null}
        </div>
    );
}

function PieceGroups({
    pieces,
    statusOf,
    dueOf,
    onStatus,
    onDue,
}: {
    pieces: LearnPiece[];
    statusOf: (piece: LearnPiece) => LearnStatus;
    dueOf: (piece: LearnPiece) => string | undefined;
    onStatus: (id: string, status: LearnStatus) => void;
    onDue: (id: string, iso: string) => void;
}) {
    const groups = FORMAT_ORDER.map(format => ({
        format,
        items: pieces.filter(piece => piece.format === format),
    })).filter(group => group.items.length > 0);

    return (
        <div className="grid gap-4">
            {pieces.some(piece => piece.added) ? (
                <CoachTipCard title="Yours, not ours">
                    Added by this household. We keep the pointer, not the book.
                </CoachTipCard>
            ) : null}
            {groups.map(group => (
                <Card key={group.format} className="p-0">
                    <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
                        <div>
                            <Typography as="span" variant="eyebrow" color="primary">
                                ✦ {formatLabel(group.format).toUpperCase()}
                            </Typography>
                        </div>
                        <span className="font-mono text-xs text-fg-muted">
                            {group.items.length}
                        </span>
                    </div>
                    <ul className="grid">
                        {group.items.map(piece => {
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
                                                <MediaCover
                                                    piece={piece}
                                                    className="w-12 shrink-0 rounded-md"
                                                />
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-medium text-fg">
                                                        {piece.title}
                                                        <span className="ml-2 font-mono text-[10px] tracking-wide text-accent uppercase">
                                                            {status === 'SHELF'
                                                                ? ''
                                                                : pickLabel(piece.format, status)}
                                                        </span>
                                                    </p>
                                                    <PieceLine
                                                        piece={piece}
                                                        className="mt-0.5 truncate text-xs text-fg-muted italic"
                                                    />
                                                    <p className="mt-1 font-mono text-[11px] text-fg-faint">
                                                        {piece.by} · {aboutLabel(aboutOf(piece))}
                                                    </p>
                                                    {piece.secondary ? (
                                                        <div className="mt-1">
                                                            <PieceSecondary piece={piece} />
                                                        </div>
                                                    ) : null}
                                                    {body ? (
                                                        <div className="mt-3">{body}</div>
                                                    ) : null}
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
                        })}
                    </ul>
                </Card>
            ))}
        </div>
    );
}
