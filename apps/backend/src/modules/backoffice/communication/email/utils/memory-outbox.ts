/**
 * In-memory sent-mail buffer for local/dev (EMAIL_PROVIDER=memory).
 * Used by /email-preview/outbox and Playwright invite flows.
 */

export type MemoryEmail = {
    to: string[];
    subject: string;
    html: string;
    at: string;
};

const MAX = 80;
const outbox: MemoryEmail[] = [];

export function pushMemoryEmail(input: { to: string[]; subject: string; html: string }): void {
    outbox.unshift({
        to: input.to.map(addr => addr.trim().toLowerCase()),
        subject: input.subject,
        html: input.html,
        at: new Date().toISOString(),
    });
    if (outbox.length > MAX) outbox.length = MAX;
}

export function listMemoryEmails(filter?: { to?: string }): MemoryEmail[] {
    const to = filter?.to?.trim().toLowerCase();
    if (!to) return [...outbox];
    return outbox.filter(row => row.to.includes(to));
}

export function clearMemoryEmails(): void {
    outbox.length = 0;
}

/** Pull practiceInvite token from a signup/continue URL in HTML. */
export function practiceInviteTokenFromHtml(html: string): string | null {
    const match = html.match(/practiceInvite=([0-9a-f-]{8,80})/i);
    return match?.[1] ?? null;
}
