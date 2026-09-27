'use client';

import { useRouter } from 'next/navigation';

import { useTranslations } from '@rumtelo/i18n';
import { Icon } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { practicePath } from '@/app/_lib/routes';
import { usePracticePreview } from '@/components/features/shell/practice-preview';

/**
 * Accent strip while a Practice coach previews a client board.
 * No wordmark — the shell header already brands the page.
 */
export function PracticePreviewBanner() {
    const t = useTranslations('pages.shell');
    const router = useRouter();
    const { preview, exitPreview } = usePracticePreview();

    if (!preview) return null;

    function leave() {
        const linkId = preview!.linkId;
        // Clear client household headers before leaving the board.
        exitPreview();
        router.push(practicePath('clients', linkId));
    }

    return (
        <div
            role="status"
            aria-live="polite"
            className={cn(
                'border-b border-accent-press/50 bg-accent text-on-accent',
                'shadow-[0_2px_14px_color-mix(in_oklab,var(--color-accent)_28%,transparent)]'
            )}>
            <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2.5">
                <div className="flex min-w-0 items-center gap-3">
                    <span
                        aria-hidden
                        className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-accent shadow-sm">
                        <Icon name="eye" size="sm" className="text-accent" />
                    </span>
                    <div className="min-w-0">
                        <p className="font-mono text-[10px] font-bold tracking-[0.16em] text-on-accent uppercase">
                            {t('practice_preview.eyebrow')}
                        </p>
                        <p className="text-sm leading-snug font-semibold text-on-accent">
                            {t('practice_preview.headline', {
                                name: preview.householdName,
                            })}
                        </p>
                        <p className="text-[11px] leading-snug text-on-accent/85">
                            {t('practice_preview.sub')}
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={leave}
                    className={cn(
                        'shrink-0 rounded-full bg-white px-4 py-2 font-mono text-[10px] font-bold tracking-wide text-accent uppercase shadow-sm',
                        'transition-[filter,transform] hover:brightness-95 active:scale-[0.98]',
                        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white'
                    )}>
                    {t('practice_preview.back')}
                </button>
            </div>
        </div>
    );
}
