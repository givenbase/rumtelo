'use client';

import { choiceOf, VisibilityChoice, type Visibility } from '@rumtelo/contracts';
import { useTranslations } from '@rumtelo/i18n';
import { Icon } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { VISIBILITY_ICON } from './visibility-icon';

/** Mono label on a card: ONLY ME · SHARED · TOGETHER, plus whose it is when not yours. */
export function VisibilityBadge({
    accountId,
    visibility,
    makerName,
}: {
    accountId: string | null;
    visibility: Visibility;
    /** Name of the maker when the row is someone else's. */
    makerName?: string | null;
}) {
    const t = useTranslations('features.growth.course.visibility');
    const choice = choiceOf({ accountId, visibility });

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] tracking-wide uppercase',
                choice === VisibilityChoice.SHARED
                    ? 'bg-fg text-surface'
                    : choice === VisibilityChoice.PRIVATE
                      ? 'bg-raised text-fg-secondary'
                      : 'bg-accent-soft text-accent'
            )}>
            <Icon name={VISIBILITY_ICON[choice]} size="sm" aria-hidden />
            {makerName ? `${makerName} · ` : null}
            {t(`badge_${choice}`)}
        </span>
    );
}
