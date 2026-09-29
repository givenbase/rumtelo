import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { presetForMerchant, resolveVendorPresets } from './catalog-link';

type Preset = { key: string; categoryTemplateKey: string; merchantKeys?: readonly string[] };

const presets: Preset[] = [
    { key: 'MEAL_KIT', categoryTemplateKey: 'GROCERIES', merchantKeys: ['HELLOFRESH', 'FOODBAG'] },
    { key: 'INTERNET', categoryTemplateKey: 'TELECOM', merchantKeys: ['KPN', 'ZIGGO'] },
    { key: 'MOBILE_PHONE', categoryTemplateKey: 'TELECOM', merchantKeys: ['KPN', 'ODIDO'] },
    { key: 'TV_PACKAGE', categoryTemplateKey: 'MEDIA', merchantKeys: ['ZIGGO'] },
    { key: 'NO_LINKS', categoryTemplateKey: 'OTHER' },
];

describe('resolveVendorPresets', () => {
    it('returns the single linked preset', () => {
        assert.deepEqual(resolveVendorPresets(presets, 'HELLOFRESH'), {
            kind: 'preset',
            preset: presets[0],
        });
    });

    it('returns none when no preset links the vendor', () => {
        assert.deepEqual(resolveVendorPresets(presets, 'NETFLIX'), { kind: 'none' });
    });

    it('returns all candidates when several presets link the vendor', () => {
        const result = resolveVendorPresets(presets, 'KPN');
        assert.equal(result.kind, 'ambiguous');
        if (result.kind === 'ambiguous') {
            assert.deepEqual(
                result.candidates.map(preset => preset.key),
                ['INTERNET', 'MOBILE_PHONE']
            );
        }
    });

    it('uses prefer as a tie-break only when it narrows to exactly one', () => {
        const media = resolveVendorPresets(
            presets,
            'ZIGGO',
            preset => preset.categoryTemplateKey === 'MEDIA'
        );
        assert.deepEqual(media, { kind: 'preset', preset: presets[3] });

        const stillAmbiguous = resolveVendorPresets(
            presets,
            'KPN',
            preset => preset.categoryTemplateKey === 'TELECOM'
        );
        assert.equal(stillAmbiguous.kind, 'ambiguous');
    });

    it('treats presets without merchantKeys as unlinked', () => {
        assert.deepEqual(resolveVendorPresets(presets, 'NO_LINKS'), { kind: 'none' });
    });
});

describe('presetForMerchant', () => {
    it('unwraps the single match and returns null otherwise', () => {
        assert.equal(presetForMerchant(presets, 'HELLOFRESH')?.key, 'MEAL_KIT');
        assert.equal(presetForMerchant(presets, 'KPN'), null);
        assert.equal(presetForMerchant(presets, 'NETFLIX'), null);
        assert.equal(
            presetForMerchant(presets, 'ZIGGO', preset => preset.categoryTemplateKey === 'MEDIA')
                ?.key,
            'TV_PACKAGE'
        );
    });
});
