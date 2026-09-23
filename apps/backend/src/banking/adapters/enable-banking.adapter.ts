import { Injectable, Logger } from '@nestjs/common';
import { createPrivateKey, createSign } from 'node:crypto';

import type { BankInstitution } from '@rumtelo/contracts';

import { loadEnv } from '../../common/config/env.config';
import {
    type BankingPort,
    type BankConnection,
    type BankLinkResult,
    type BankTransaction,
    decodeConnectionId,
    decodeInstitutionId,
    encodeInstitutionId,
} from '../banking.port';

const API_BASE = 'https://api.enablebanking.com';

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
            access: { valid_until: validUntil },
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

    async fetchTransactions(connectionId: string, since: string): Promise<BankTransaction[]> {
        const { accountUid } = decodeConnectionId(connectionId);
        const dateFrom = since.slice(0, 10);
        const data = await this.request<{
            transactions?: Array<{
                entry_reference?: string;
                transaction_id?: string;
                booking_date?: string;
                value_date?: string;
                transaction_amount?: { amount?: string; currency?: string };
                remittance_information?: string[] | string | null;
                creditor_name?: string | null;
                debtor_name?: string | null;
                credit_debit_indicator?: string;
            }>;
            continuation_key?: string | null;
        }>(
            'GET',
            `/accounts/${encodeURIComponent(accountUid)}/transactions?date_from=${encodeURIComponent(dateFrom)}`
        );

        const rows: BankTransaction[] = [];
        for (const tx of data.transactions ?? []) {
            const bookedOn = (tx.booking_date ?? tx.value_date ?? '').slice(0, 10);
            if (!bookedOn) continue;
            const rawAmount = tx.transaction_amount?.amount;
            if (rawAmount === undefined || rawAmount === null) continue;
            let cents = Math.round(Number.parseFloat(rawAmount) * 100);
            if (!Number.isFinite(cents)) continue;
            if (tx.credit_debit_indicator === 'DBIT' && cents > 0) cents = -cents;
            if (tx.credit_debit_indicator === 'CRDT' && cents < 0) cents = Math.abs(cents);

            const remittance = Array.isArray(tx.remittance_information)
                ? tx.remittance_information.join(' ')
                : (tx.remittance_information ?? '');
            const description = remittance.trim() || 'Bank transaction';
            const counterparty =
                cents < 0
                    ? (tx.creditor_name ?? null)
                    : (tx.debtor_name ?? tx.creditor_name ?? null);
            const externalId =
                tx.entry_reference ??
                tx.transaction_id ??
                `${bookedOn}:${cents}:${description.slice(0, 40)}`;

            rows.push({
                externalId,
                bookedOn,
                amount: cents,
                description,
                counterparty,
            });
        }
        return rows;
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
