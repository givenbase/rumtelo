'use client';

import { useLocale, useTranslations } from '@rumtelo/i18n';
import { DatePicker } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

type LearnT = (key: string, values?: Record<string, string | number>) => string;

export function todayIso(): string {
    return new Date().toISOString().slice(0, 10);
}

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
export function FinishBy({
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
