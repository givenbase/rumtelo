/**
 * Bank aggregation port — adapter I/O only.
 *
 * Shapes that also go over oRPC live in `@rumtelo/contracts` (bank-sync schema)
 * and are imported here. Provider-only shapes (session uid, raw AIS rows) stay
 * local so Enable Banking / Tink adapters are not coupled to household DTOs.
 *
 * @see packages/contracts/.../bank-sync/bank-sync.schema.ts
 */

import type { BankInstitution, BankSyncStartLinkResult } from '@rumtelo/contracts';

export type { BankInstitution };

export interface BankConnection {
    id: string;
    institutionId: string;
    institutionName: string;
    status: 'PENDING' | 'LINKED' | 'EXPIRED' | 'REVOKED';
    /** PSD2 consents expire, typically after 90 days; the UI must warn before this. */
    expiresAt: string | null;
}

/** Provider account after AIS authorisation — not an oRPC DTO. */
export interface BankAccountRef {
    uid: string;
    iban: string | null;
    name: string | null;
}

/** Adapter result before we map onto a household BankAccount.connectionId. */
export interface BankLinkResult {
    sessionId: string;
    institutionId: string;
    institutionName: string;
    accounts: BankAccountRef[];
    expiresAt: string | null;
}

/** Normalised AIS row — imported into Inbox; not returned on the wire as-is. */
export interface BankTransaction {
    externalId: string;
    bookedOn: string;
    amount: number;
    description: string;
    counterparty: string | null;
}

export interface BankingPort {
    isEnabled(): boolean;
    listInstitutions(country: string): Promise<BankInstitution[]>;
    /**
     * Start AIS authorisation. `state` is echoed back on redirect (we put the
     * Rumtelo bank-account id there). Returns the ASPSP auth URL.
     */
    startLink(input: {
        institutionId: string;
        redirectUrl: string;
        state: string;
    }): Promise<BankSyncStartLinkResult>;
    /** Exchange the OAuth `code` for a session + authorised accounts. */
    completeLink(input: { code: string; state: string }): Promise<BankLinkResult>;
    getConnection(connectionId: string): Promise<BankConnection | null>;
    fetchTransactions(connectionId: string, since: string): Promise<BankTransaction[]>;
    /** Best-effort revoke; adapters may no-op if the provider has no delete. */
    disconnect(connectionId: string): Promise<void>;
}

export const BANKING_PORT = Symbol('BANKING_PORT');

/** Encode ASPSP identity for round-trips (`country::name`). */
export function encodeInstitutionId(country: string, name: string): string {
    return `${country.trim().toUpperCase()}::${name.trim()}`;
}

export function decodeInstitutionId(id: string): { country: string; name: string } {
    const sep = id.indexOf('::');
    if (sep <= 0) throw new Error(`Invalid institution id: ${id}`);
    return { country: id.slice(0, sep), name: id.slice(sep + 2) };
}

/**
 * Persist as `sessionId::accountUid` on BankAccount.connectionId so sync can
 * hit the right Enable Banking account without an extra table.
 */
export function encodeConnectionId(sessionId: string, accountUid: string): string {
    return `${sessionId}::${accountUid}`;
}

export function decodeConnectionId(connectionId: string): {
    sessionId: string;
    accountUid: string;
} {
    const sep = connectionId.indexOf('::');
    if (sep <= 0) throw new Error(`Invalid connection id: ${connectionId}`);
    return { sessionId: connectionId.slice(0, sep), accountUid: connectionId.slice(sep + 2) };
}
