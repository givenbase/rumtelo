'use client';

import { FormControl } from '../Form';
import { DatePicker, type DatePickerProps } from './index';

export type FormDatePickerProps = DatePickerProps & {
    /** When false, skip FormControl (standalone fields outside RHF FormField). */
    withFormControl?: boolean;
};

/**
 * Form-ready {@link DatePicker} — wraps the field in {@link FormControl}.
 * Pass `locale` / `labels` / `openCalendarLabel` from the app (`useTranslations`).
 */
export function FormDatePicker({ withFormControl = true, value, ...props }: FormDatePickerProps) {
    const picker = <DatePicker value={value || null} {...props} />;
    return withFormControl ? <FormControl>{picker}</FormControl> : picker;
}
