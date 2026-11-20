'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

import { HouseholdRole } from '@rumtelo/contracts';
import { useTranslations } from '@rumtelo/i18n';
import { Button, Icon } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { moneyPath } from '@/app/_lib/routes';
import { useBoardWriteAccess } from '@/app/_lib/use-board-write-access';
import { useWeekCheckStatus } from '@/app/_lib/use-week-check-status';

/** Pages where a second Week check button would only be noise. */
function isHidden(pathname: string): boolean {
    const path = pathname.replace(/^\/(en|nl|es|fr)(?=\/|$)/, '');
    return (
        path.startsWith(moneyPath('week-check')) ||
        /\/(create|update)(\/|$)/.test(path) ||
        path.includes('/import')
    );
}

/**
 * The week check's door on every Money page: a compact button at the right edge, not a bar
 * across the page. Primary when it is due and not done, secondary otherwise; "View week check"
 * for a VIEWER or a Practice preview. The status line shows from `sm` up and is read out on
 * phones. It does not depend on the Coach: nothing here reads the Coach settings.
 */
export function WeekCheckEntry() {
    const t = useTranslations('features.money.week_check');
    const pathname = usePathname() ?? '';
    const { practicePreview, role } = useBoardWriteAccess();
    const status = useWeekCheckStatus();

    if (isHidden(pathname)) return null;

    const readOnly = practicePreview || role === HouseholdRole.VIEWER;
    const done = status.ready && status.doneThisWeek;
    const primary = !readOnly && status.ready && status.due && !done;
    const statusText = !status.ready ? '' : done ? t('entry_status_done') : t('entry_status_open');

    return (
        <div className="mb-3 flex items-center justify-end gap-3">
            <p
                className={cn(
                    'sr-only min-w-0 text-sm text-fg-muted sm:not-sr-only',
                    !statusText && 'sm:sr-only'
                )}>
                {statusText}
            </p>
            <Button
                as={Link}
                href={moneyPath('week-check')}
                size="sm"
                variant={primary ? 'primary' : 'secondary'}
                className="min-h-11 shrink-0 sm:min-h-10">
                {readOnly ? (
                    t('entry_view')
                ) : done ? (
                    <>
                        {t('entry_done')}
                        <Icon name="check" size="sm" aria-hidden />
                        <span className="sr-only">{t('entry_done_sr')}</span>
                    </>
                ) : (
                    t('entry')
                )}
            </Button>
        </div>
    );
}
