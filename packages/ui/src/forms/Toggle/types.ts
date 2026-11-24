interface ToggleProps {
    checked: boolean;
    label: string;
    hint?: string;
    onCheckedChange?: (next: boolean) => void;
    disabled?: boolean;
}

export type { ToggleProps };
export default ToggleProps;
