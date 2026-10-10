/**
 * Inviter label for invite emails — never leave a blank "who".
 * Callers should pass {@link personDisplayName} when the account is known.
 */
export function inviterLabel(name: string | undefined | null, locale: string): string {
    const trimmed = name?.trim();
    if (trimmed) return trimmed;
    return locale.toLowerCase().startsWith('nl') ? 'Iemand' : 'Someone';
}
