import { Injectable } from '@nestjs/common';

import type { BankingPort } from '../banking.port';

/**
 * Default adapter. Reports the feature as unavailable rather than throwing, so
 * the UI can render Connect as hidden/disabled instead of an error.
 */
@Injectable()
export class NullBankingAdapter implements BankingPort {
    isEnabled() {
        return false;
    }

    async listInstitutions() {
        return [];
    }

    async startLink(): Promise<never> {
        throw new Error(
            'Bank sync is disabled. Set FEATURE_BANK_SYNC and configure Enable Banking.'
        );
    }

    async completeLink(): Promise<never> {
        throw new Error(
            'Bank sync is disabled. Set FEATURE_BANK_SYNC and configure Enable Banking.'
        );
    }

    async getConnection() {
        return null;
    }

    async fetchBalance() {
        return null;
    }

    async fetchTransactions() {
        return [];
    }

    async disconnect() {
        /* no-op */
    }
}
