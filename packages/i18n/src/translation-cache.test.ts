import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { planLeaf, translationCacheKey } from './translation-cache';

const locale = 'nl';

const path = 'features.money.deposit_link.bank_hint';

describe('translation cache', () => {
    it('changes the cache key when the English source changes', () => {
        const before = translationCacheKey('Where this income is paid.', locale, path);
        const after = translationCacheKey(
            'Only banks you already have an account at.',
            locale,
            path
        );
        assert.notEqual(before, after);
    });

    it('does not reuse another path that happens to share the English word', () => {
        const english = 'Save';
        assert.notEqual(
            translationCacheKey(english, locale, 'features.growth.kind_save'),
            translationCacheKey(english, locale, 'ui.button.save')
        );
    });

    it('reuses a cached translation after the English source changed', () => {
        const english = 'Only banks you already have an account at.';
        const plan = planLeaf({
            english,
            locale,
            path,
            previousEnglish: 'Where this income is paid.',
            existing: 'Waar dit inkomen binnenkomt.',
            cached: 'Alleen banken waar je al een rekening hebt.',
            override: undefined,
            skip: false,
        });
        assert.deepEqual(plan, {
            kind: 'use',
            text: 'Alleen banken waar je al een rekening hebt.',
        });
    });

    it('keeps this path’s locale string when the English source did not change', () => {
        const english = 'Save';
        const plan = planLeaf({
            english,
            locale,
            path: 'features.growth.kind_save',
            previousEnglish: english,
            existing: 'Sparen',
            cached: 'Opslaan',
            override: undefined,
            skip: false,
        });
        assert.equal(plan.kind, 'use');
        if (plan.kind !== 'use') return;
        assert.equal(plan.text, 'Sparen');
    });

    it('translates when the English source changed and nothing is cached', () => {
        const english = 'Only banks you already have an account at.';
        const plan = planLeaf({
            english,
            locale,
            path,
            previousEnglish: 'Where this income is paid — you can pick the seat later.',
            existing: 'Waar dit inkomen binnenkomt — de rekening kun je later kiezen.',
            cached: undefined,
            override: undefined,
            skip: false,
        });
        assert.deepEqual(plan, {
            kind: 'translate',
            english,
            cacheKey: translationCacheKey(english, locale, path),
        });
    });

    it('prefers a manual override over cache and DeepL', () => {
        const plan = planLeaf({
            english: 'Register a bank',
            locale,
            path: 'features.money.deposit_link.register_bank',
            previousEnglish: undefined,
            existing: 'Register a bank',
            cached: 'Bank registreren',
            override: 'Registreer een bank',
            skip: false,
        });
        assert.deepEqual(plan, { kind: 'use', text: 'Registreer een bank' });
    });
});
