import { Injectable, Logger } from '@nestjs/common';
import { createPrivateKey, createSign } from 'node:crypto';

import type { BankInstitution } from '@rumtelo/contracts';

import { currentAuthHeaders } from '../../common/household/household.context';
import { loadEnv } from '../../common/config/env.config';
import {
    type BankingPort,
    type BankAccountRef,
    type BankConnection,
    type BankLinkResult,
    type BankTransaction,
    decodeConnectionId,
    decodeInstitutionId,
    encodeInstitutionId,
} from '../banking.port';

const API_BASE = 'https://api.enablebanking.com';

/** Cap pagination so a runaway continuation_key cannot loop forever. */
const MAX_TRANSACTION_PAGES = 50;

/** Prefer spendable/available saldo, then booked. */
const BALANCE_TYPE_PRIORITY = ['ITAV', 'CLAV', 'CLBD', 'ITBD', 'FWAV', 'XPCD'] as const;

/**
 * Enable Banking AIS adapter.
 *
 * Sandbox / restricted-production apps share the same API host; environment is
 * fixed when the app is registered in the Control Panel. JWT uses APP_ID as
 * `kid` and the PEM as RS256 key — never exposed to the frontend.
 *
 * Throws on failure (never silent `[]` for list/fetch when enabled).
 */
@Injectable()
export class EnableBankingAdapter implements BankingPort {
    private readonly logger = new Logger(EnableBankingAdapter.name);
    private readonly appId: string;
    private readonly privateKeyPem: string;

    constructor() {
        const env = loadEnv();
        this.appId = env.ENABLE_BANKING_APP_ID ?? '';
        this.privateKeyPem = normalizePem(env.ENABLE_BANKING_PRIVATE_KEY ?? '');
        if (this.isEnabled() && !this.privateKeyPem.includes('END')) {
            this.logger.error(
                'ENABLE_BANKING_PRIVATE_KEY looks truncated (no END line). Put the full PEM on one .env line with \\n escapes.'
            );
        }
    }

    isEnabled(): boolean {
        const env = loadEnv();
        return (
            env.FEATURE_BANK_SYNC &&
            Boolean(env.ENABLE_BANKING_APP_ID) &&
            Boolean(env.ENABLE_BANKING_PRIVATE_KEY)
        );
    }

    async listInstitutions(country: string): Promise<BankInstitution[]> {
        const code = country.trim().toUpperCase();
        const data = await this.request<{
            aspsps: Array<{
                name: string;
                country: string;
                logo?: string | null;
            }>;
        }>('GET', `/aspsps?country=${encodeURIComponent(code)}`);

        return (data.aspsps ?? []).map(row => ({
            id: encodeInstitutionId(row.country, row.name),
            name: row.name,
            country: row.country,
            logo: row.logo ?? null,
        }));
    }

    async startLink(input: {
        institutionId: string;
        redirectUrl: string;
        state: string;
    }): Promise<{ authUrl: string }> {
        const { country, name } = decodeInstitutionId(input.institutionId);
        // EB examples use second precision (no ms); some ASPSPs reject otherwise.
        const validUntil = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
            .toISOString()
            .replace(/\.\d{3}Z$/, 'Z');
        const data = await this.request<{ url?: string }>('POST', '/auth', {
            access: {
                // Explicit AIS scopes — omitting these can yield an empty session
                // (account list only) on some ASPSPs.
                balances: true,
                transactions: true,
                valid_until: validUntil,
            },
            aspsp: { name, country },
            state: input.state,
            redirect_url: input.redirectUrl,
            psu_type: 'personal',
        });
        if (!data.url) throw new Error('Enable Banking auth response missing url');
        return { authUrl: data.url };
    }

    async completeLink(input: { code: string; state: string }): Promise<BankLinkResult> {
        const session = await this.request<{
            session_id: string;
            accounts?: Array<{
                uid: string;
                iban?: string | null;
                name?: string | null;
                details?: string | null;
                product?: string | null;
                account_id?: { iban?: string | null };
                identification?: string | null;
            }>;
            aspsp?: { name?: string; country?: string };
            access?: { valid_until?: string };
        }>('POST', '/sessions', { code: input.code });

        const sessionId = session.session_id;
        if (!sessionId) throw new Error('Enable Banking session missing session_id');

        const accounts = (session.accounts ?? []).map(account => ({
            uid: account.uid,
            iban: account.iban ?? account.account_id?.iban ?? account.identification ?? null,
            name: account.name ?? null,
            details: account.details ?? null,
            product: account.product ?? null,
        }));

        const institutionName = session.aspsp?.name ?? 'Bank';
        const institutionCountry = session.aspsp?.country ?? 'NL';
        if (accounts.length === 0) throw new Error('Enable Banking session has no accounts');

        return {
            sessionId,
            institutionId: encodeInstitutionId(institutionCountry, institutionName),
            institutionName,
            accounts,
            expiresAt: session.access?.valid_until ?? null,
        };
    }

    async getConnection(connectionId: string): Promise<BankConnection | null> {
        const { sessionId } = decodeConnectionId(connectionId);
        try {
            const session = await this.request<{
                session_id?: string;
                status?: string;
                aspsp?: { name?: string; country?: string };
                access?: { valid_until?: string };
            }>('GET', `/sessions/${encodeURIComponent(sessionId)}`);

            const name = session.aspsp?.name ?? 'Bank';
            const country = session.aspsp?.country ?? 'NL';
            const statusRaw = (session.status ?? 'AUTHORIZED').toUpperCase();
            const status: BankConnection['status'] =
                statusRaw.includes('EXPIR') || statusRaw === 'EXPIRED'
                    ? 'EXPIRED'
                    : statusRaw.includes('REVOK')
                      ? 'REVOKED'
                      : 'LINKED';

            return {
                id: connectionId,
                institutionId: encodeInstitutionId(country, name),
                institutionName: name,
                status,
                expiresAt: session.access?.valid_until ?? null,
            };
        } catch (error) {
            this.logger.warn(`getConnection failed: ${String(error)}`);
            return null;
        }
    }

    async fetchBalance(connectionId: string): Promise<number | null> {
        const { accountUid } = decodeConnectionId(connectionId);
        const data = await this.request<{
            balances?: Array<{
                balance_amount?: { amount?: string; currency?: string };
                balance_type?: string;
            }>;
        }>('GET', `/accounts/${encodeURIComponent(accountUid)}/balances`);

        const balances = data.balances ?? [];
        if (balances.length === 0) return null;

        const preferred =
            BALANCE_TYPE_PRIORITY.map(type =>
                balances.find(row => (row.balance_type ?? '').toUpperCase() === type)
            ).find(Boolean) ?? balances[0];

        const raw = preferred?.balance_amount?.amount;
        if (raw === undefined || raw === null) return null;
        const cents = Math.round(Number.parseFloat(raw) * 100);
        return Number.isFinite(cents) ? cents : null;
    }

    async fetchAccountMeta(connectionId: string): Promise<BankAccountRef | null> {
        const { accountUid } = decodeConnectionId(connectionId);
        try {
            const data = await this.request<{
                uid?: string;
                name?: string | null;
                details?: string | null;
                product?: string | null;
                account_id?: { iban?: string | null };
                iban?: string | null;
            }>('GET', `/accounts/${encodeURIComponent(accountUid)}/details`);
            return {
                uid: data.uid ?? accountUid,
                iban: data.iban ?? data.account_id?.iban ?? null,
                name: data.name ?? null,
                details: data.details ?? null,
                product: data.product ?? null,
            };
        } catch (error) {
            this.logger.warn(`fetchAccountMeta failed: ${String(error)}`);
            return null;
        }
    }

    async fetchTransactions(
        connectionId: string,
        since: string,
        options?: { strategy?: 'default' | 'longest' }
    ): Promise<BankTransaction[]> {
        const { accountUid } = decodeConnectionId(connectionId);
        const dateFrom = since.slice(0, 10);
        const strategy = options?.strategy ?? 'default';
        const rows: BankTransaction[] = [];
        let continuationKey: string | null = null;
        let rawCount = 0;
        let skipped = 0;

        // Keep query params identical across continuation pages (EB FAQ).
        const baseQuery = new URLSearchParams({
            date_from: dateFrom,
            strategy,
        });

        for (let page = 0; page < MAX_TRANSACTION_PAGES; page += 1) {
            const query = new URLSearchParams(baseQuery);
            if (continuationKey) query.set('continuation_key', continuationKey);

            // oxlint-disable-next-line no-await-in-loop -- paginate Enable Banking pages in order
            const data = await this.request<{
                transactions?: Array<Record<string, unknown>>;
                continuation_key?: string | null;
            }>(
                'GET',
                `/accounts/${encodeURIComponent(accountUid)}/transactions?${query.toString()}`
            );

            const pageRows = data.transactions ?? [];
            rawCount += pageRows.length;
            for (const tx of pageRows) {
                const mapped = mapTransaction(tx);
                if (mapped) rows.push(mapped);
                else skipped += 1;
            }

            // Empty page + continuation_key still means “keep going” (EB FAQ).
            continuationKey = data.continuation_key?.trim() || null;
            if (!continuationKey) break;
        }

        if (continuationKey) {
            this.logger.warn(
                `fetchTransactions hit ${MAX_TRANSACTION_PAGES}-page cap for account ${accountUid}; more pages remain`
            );
        }
        this.logger.log(
            `fetchTransactions account=${accountUid} strategy=${strategy} date_from=${dateFrom} raw=${rawCount} imported=${rows.length} skipped=${skipped}`
        );
        if (rawCount === 0) {
            const { sessionId } = decodeConnectionId(connectionId);
            await this.logEmptyTransactionPull(sessionId, accountUid);
        }
        return rows;
    }

    /** Diagnose empty AIS pulls — session status / access scopes (EB Control Panel). */
    private async logEmptyTransactionPull(sessionId: string, accountUid: string): Promise<void> {
        try {
            const session = await this.request<{
                status?: string;
                access?: Record<string, unknown>;
                accounts?: Array<{ uid?: string; name?: string | null; iban?: string | null }>;
                aspsp?: { name?: string; country?: string };
            }>('GET', `/sessions/${encodeURIComponent(sessionId)}`);
            const access = session.access ?? {};
            this.logger.warn(
                `empty tx pull session=${sessionId} account=${accountUid} status=${session.status ?? '?'} aspsp=${session.aspsp?.name ?? '?'} access=${JSON.stringify(access)} accounts=${(session.accounts ?? []).length}`
            );
        } catch (error) {
            this.logger.warn(
                `empty tx pull: could not load session ${sessionId}: ${String(error)}`
            );
        }
    }

    async disconnect(connectionId: string): Promise<void> {
        const { sessionId } = decodeConnectionId(connectionId);
        try {
            await this.request('DELETE', `/sessions/${encodeURIComponent(sessionId)}`);
        } catch (error) {
            this.logger.warn(`disconnect session ${sessionId}: ${String(error)}`);
        }
    }

    private async request<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
        const jwt = this.signJwt();
        const response = await fetch(`${API_BASE}${path}`, {
            method,
            headers: {
                Authorization: `Bearer ${jwt}`,
                Accept: 'application/json',
                ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
                ...psuHeadersFromRequest(),
            },
            body: body !== undefined ? JSON.stringify(body) : undefined,
        });
        const text = await response.text();
        let json: unknown = null;
        if (text) {
            try {
                json = JSON.parse(text) as unknown;
            } catch {
                json = { raw: text };
            }
        }
        if (!response.ok) {
            this.logger.error(`Enable Banking ${method} ${path} → ${response.status}: ${text}`);
            const detail = enableBankingErrorDetail(json, text);
            throw new Error(
                `Enable Banking ${method} ${path} failed (${response.status})${detail ? `: ${detail}` : ''}`
            );
        }
        return json as T;
    }

    private signJwt(): string {
        if (!this.appId || !this.privateKeyPem) {
            throw new Error('Enable Banking credentials are not configured');
        }
        const iat = Math.floor(Date.now() / 1000);
        const header = { typ: 'JWT', alg: 'RS256', kid: this.appId };
        const payload = {
            iss: 'enablebanking.com',
            aud: 'api.enablebanking.com',
            iat,
            exp: iat + 3600,
        };
        const encodedHeader = base64url(JSON.stringify(header));
        const encodedPayload = base64url(JSON.stringify(payload));
        const signingInput = `${encodedHeader}.${encodedPayload}`;
        const key = createPrivateKey(this.privateKeyPem);
        const sign = createSign('RSA-SHA256');
        sign.update(signingInput);
        sign.end();
        const signature = sign.sign(key).toString('base64url');
        return `${signingInput}.${signature}`;
    }
}

function base64url(value: string): string {
    return Buffer.from(value, 'utf8').toString('base64url');
}

/** Accept literal newlines or `\n` escapes from .env. */
function normalizePem(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) return '';
    if (trimmed.includes('-----BEGIN') && trimmed.includes('\n')) return trimmed;
    return trimmed.replace(/\\n/g, '\n');
}

function enableBankingErrorDetail(json: unknown, text: string): string {
    if (json && typeof json === 'object') {
        const row = json as Record<string, unknown>;
        const code = typeof row.error === 'string' ? row.error : null;
        const message =
            typeof row.message === 'string'
                ? row.message
                : typeof row.error_description === 'string'
                  ? row.error_description
                  : null;
        if (code && message) return `${code} — ${message}`;
        if (code) return code;
        if (message) return message;
    }
    return text.slice(0, 280);
}

/**
 * Forward PSU headers when an end-user triggered the call (EB FAQ).
 * ASPSPs often require at least IP + User-Agent for AIS transaction pulls.
 */
function psuHeadersFromRequest(): Record<string, string> {
    const headers = currentAuthHeaders();
    const forwarded = headers.get('x-forwarded-for');
    const ip =
        forwarded?.split(',')[0]?.trim() ||
        headers.get('x-real-ip')?.trim() ||
        headers.get('cf-connecting-ip')?.trim() ||
        '';
    const userAgent = headers.get('user-agent')?.trim() || '';
    const out: Record<string, string> = {};
    if (ip) out['Psu-Ip-Address'] = ip;
    if (userAgent) out['Psu-User-Agent'] = userAgent;
    return out;
}

function asRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function stringField(row: Record<string, unknown>, key: string): string | null {
    const value = row[key];
    return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function nestedName(row: Record<string, unknown>, key: string): string | null {
    const nested = asRecord(row[key]);
    if (!nested) return null;
    return stringField(nested, 'name');
}

function mapTransaction(tx: Record<string, unknown>): BankTransaction | null {
    const bookedOn = (
        stringField(tx, 'booking_date') ??
        stringField(tx, 'value_date') ??
        stringField(tx, 'transaction_date') ??
        ''
    ).slice(0, 10);
    if (!bookedOn) return null;

    const amountObj = asRecord(tx.transaction_amount);
    const rawAmount = amountObj && typeof amountObj.amount === 'string' ? amountObj.amount : null;
    if (rawAmount === null) return null;
    let cents = Math.round(Number.parseFloat(rawAmount) * 100);
    if (!Number.isFinite(cents)) return null;

    const indicator = stringField(tx, 'credit_debit_indicator');
    if (indicator === 'DBIT' && cents > 0) cents = -cents;
    if (indicator === 'CRDT' && cents < 0) cents = Math.abs(cents);

    const remittanceRaw = tx.remittance_information;
    const remittance = Array.isArray(remittanceRaw)
        ? remittanceRaw.filter(part => typeof part === 'string').join(' ')
        : typeof remittanceRaw === 'string'
          ? remittanceRaw
          : '';
    const description = remittance.trim() || 'Bank transaction';

    const creditorName = stringField(tx, 'creditor_name') ?? nestedName(tx, 'creditor');
    const debtorName = stringField(tx, 'debtor_name') ?? nestedName(tx, 'debtor');
    const counterparty = cents < 0 ? (creditorName ?? null) : (debtorName ?? creditorName ?? null);

    const externalId =
        stringField(tx, 'entry_reference') ??
        stringField(tx, 'transaction_id') ??
        `${bookedOn}:${cents}:${description.slice(0, 40)}`;

    return {
        externalId,
        bookedOn,
        amount: cents,
        description,
        counterparty,
    };
}
