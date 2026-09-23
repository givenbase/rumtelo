import { Module } from '@nestjs/common';

import { loadEnv } from '../common/config/env.config';
import { EnableBankingAdapter } from './adapters/enable-banking.adapter';
import { NullBankingAdapter } from './adapters/null-banking.adapter';
import { BANKING_PORT } from './banking.port';

/**
 * Binds Enable Banking when FEATURE_BANK_SYNC + credentials are set; otherwise
 * the null adapter so callers can check `isEnabled()` without errors.
 */
@Module({
    providers: [
        EnableBankingAdapter,
        NullBankingAdapter,
        {
            provide: BANKING_PORT,
            useFactory: (enable: EnableBankingAdapter, nullAdapter: NullBankingAdapter) => {
                const env = loadEnv();
                if (
                    env.FEATURE_BANK_SYNC &&
                    env.ENABLE_BANKING_APP_ID &&
                    env.ENABLE_BANKING_PRIVATE_KEY
                ) {
                    return enable;
                }
                return nullAdapter;
            },
            inject: [EnableBankingAdapter, NullBankingAdapter],
        },
    ],
    exports: [BANKING_PORT],
})
export class BankingModule {}
