/**
 * Human-facing name for emails and other communication.
 * Prefer account greeting (`displayName` / user.name), then legal first + last.
 */
export function personDisplayName(input: {
    displayName?: string | null;
    firstName?: string | null;
    lastName?: string | null;
}): string | undefined {
    const display = input.displayName?.trim();
    if (display) return display;
    const legal = [input.firstName, input.lastName]
        .map(part => part?.trim())
        .filter((part): part is string => Boolean(part))
        .join(' ');
    return legal || undefined;
}
