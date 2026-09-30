'use client';

import { useLocale, useTranslations } from '@rumtelo/i18n';
import { FormDatePicker as UiFormDatePicker, type FormDatePickerProps } from '@rumtelo/ui';

type AppFormDatePickerProps = Omit<
    FormDatePickerProps,
    'locale' | 'labels' | 'openCalendarLabel' | 'placeholder'
> & {
    placeholder?: string;
};

/**
 * Localized {@link UiFormDatePicker} — wires Rumtelo i18n onto the UI form control.
 * Prefer this in the application over raw `DatePicker` / native `type="date"`.
 */
export function FormDatePicker({ placeholder, ...props }: AppFormDatePickerProps) {
    const locale = useLocale();
    const tForm = useTranslations('ui.form');

    return (
        <UiFormDatePicker
            {...props}
            locale={locale}
            placeholder={placeholder}
            openCalendarLabel={tForm('aria.open_date_picker')}
            labels={{
                previousMonth: tForm('previous_month'),
                nextMonth: tForm('next_month'),
                month: tForm('month'),
                year: tForm('year'),
                today: tForm('today'),
                pickADay: tForm('pick_a_day'),
            }}
        />
    );
}
