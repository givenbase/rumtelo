import { e2eEnv } from '../env';

type OutboxRow = {
    to: string[];
    subject: string;
    at: string;
    practiceInviteToken: string | null;
};

type OutboxResponse = {
    count: number;
    emails: OutboxRow[];
};

/** Dev memory outbox on the backend (ENABLE_SWAGGER / local). */
export async function fetchPracticeInviteToken(to: string): Promise<string> {
    const url = new URL('/email-preview/outbox', `${e2eEnv.backendUrl}/`);
    url.searchParams.set('to', to);
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Outbox ${res.status}: ${await res.text()}`);
    }
    const body = (await res.json()) as OutboxResponse;
    const token = body.emails.find(row => row.practiceInviteToken)?.practiceInviteToken;
    if (!token) {
        throw new Error(`No practiceInvite token in outbox for ${to} (count=${body.count})`);
    }
    return token;
}
