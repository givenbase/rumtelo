import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { API_ERROR_MESSAGES } from '@rumtelo/contracts';

import message from '../translations/common/message';

describe('API_ERROR_MESSAGES ↔ i18n sync', () => {
    const i18nKeys = Object.keys(message.error.api);

    it('every contract key has an EN leaf under common.message.error.api', () => {
        const missing = API_ERROR_MESSAGES.filter(key => !(key in message.error.api));
        assert.deepEqual(missing, [], `missing i18n leaves: ${missing.join(', ')}`);
    });

    it('every common.message.error.api leaf is listed in API_ERROR_MESSAGES', () => {
        const extra = i18nKeys.filter(
            key => !(API_ERROR_MESSAGES as readonly string[]).includes(key)
        );
        assert.deepEqual(extra, [], `orphan i18n leaves: ${extra.join(', ')}`);
    });
});
