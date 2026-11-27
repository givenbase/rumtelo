import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { WorkSituation } from '../../../platform/enums';
import { GoalKind, JarKey } from '../../money/enums';
import { CourseRhythmCadence, CourseRhythmKind, CourseScope } from '../enums';
import { isRhythmTargetValid, rhythmShapeFor } from './course-rules';
import {
    COURSE_PRESETS,
    coursePresetByKey,
    coursePresetCopyKey,
    monthlyAmountFor,
    presetsFor,
} from './course-presets';

describe('preset data', () => {
    it('has unique snake_case keys and both scopes', () => {
        const keys = COURSE_PRESETS.map(preset => preset.key);
        assert.equal(new Set(keys).size, keys.length);
        for (const key of keys) assert.match(key, /^[a-z][a-z0-9_]*$/);
        assert.ok(COURSE_PRESETS.some(preset => preset.scope === CourseScope.PERSONAL));
        assert.ok(COURSE_PRESETS.some(preset => preset.scope === CourseScope.BUSINESS));
    });

    it('points translation keys at its own preset', () => {
        for (const preset of COURSE_PRESETS) {
            assert.equal(
                preset.firstStepKey,
                `features.growth.course.preset.${preset.key}.firstStep`
            );
            if (preset.rhythm) {
                assert.equal(
                    preset.rhythm.nameKey,
                    `features.growth.course.preset.${preset.key}.rhythm`
                );
            }
        }
        assert.equal(
            coursePresetCopyKey('holiday', 'doneWhen'),
            'features.growth.course.preset.holiday.doneWhen'
        );
    });

    it('stores only valid rhythms, in the shape the API would store', () => {
        for (const preset of COURSE_PRESETS.filter(item => item.rhythm)) {
            const rhythm = preset.rhythm!;
            assert.ok(isRhythmTargetValid(rhythm.cadence, rhythm.target), preset.key);
            assert.deepEqual(rhythmShapeFor(rhythm.kind, rhythm.cadence, rhythm.target), {
                cadence: rhythm.cadence,
                target: rhythm.target,
            });
            if (rhythm.kind === CourseRhythmKind.HABIT) {
                assert.equal(rhythm.cadence, CourseRhythmCadence.DAILY);
            }
        }
    });

    it('keeps amounts, goal kinds and jars consistent with the jar doctrine', () => {
        for (const preset of COURSE_PRESETS) {
            if (!preset.hasAmount) {
                assert.equal(preset.goalKind, undefined, preset.key);
                assert.equal(preset.suggestedJarKey, undefined, preset.key);
                continue;
            }
            if (preset.goalKind === GoalKind.SAVE) {
                // Planned spends are Long Term Savings; Freedom is never spent.
                assert.equal(preset.suggestedJarKey, JarKey.LONG_TERM_SAVINGS, preset.key);
            } else {
                assert.equal(preset.goalKind, GoalKind.EARN, preset.key);
                assert.equal(preset.suggestedJarKey, undefined, preset.key);
            }
        }
        assert.ok(
            COURSE_PRESETS.every(preset => preset.suggestedJarKey !== JarKey.FINANCIAL_FREEDOM)
        );
    });

    it('looks a preset up by key', () => {
        assert.equal(coursePresetByKey('emergency_buffer')?.hasAmount, true);
        assert.equal(coursePresetByKey('nope'), undefined);
    });
});

describe('presetsFor', () => {
    const keysOf = (situation: WorkSituation | null, scope?: CourseScope) =>
        presetsFor(situation, scope).map(preset => preset.key);

    it('puts presets made for the situation first, then those for everyone', () => {
        const keys = keysOf(WorkSituation.SELF_EMPLOYED, CourseScope.BUSINESS);
        assert.equal(keys[0], 'new_clients');
        assert.ok(keys.indexOf('new_clients') < keys.indexOf('raise_income'));
    });

    it('leaves out presets made for other situations', () => {
        const employed = keysOf(WorkSituation.EMPLOYED);
        assert.ok(employed.includes('promotion_raise'));
        assert.ok(!employed.includes('new_clients'));
        assert.ok(!employed.includes('find_work'));
        const seeking = keysOf(WorkSituation.SEEKING);
        assert.ok(seeking.includes('find_work'));
        assert.ok(!seeking.includes('stop_at_18'));
    });

    it('covers both jobs for BOTH', () => {
        const both = keysOf(WorkSituation.BOTH, CourseScope.BUSINESS);
        assert.ok(both.includes('new_clients'));
        assert.ok(both.includes('promotion_raise'));
    });

    it('filters by scope', () => {
        assert.ok(
            presetsFor(null, CourseScope.PERSONAL).every(p => p.scope === CourseScope.PERSONAL)
        );
        assert.ok(
            presetsFor(null, CourseScope.BUSINESS).every(p => p.scope === CourseScope.BUSINESS)
        );
    });

    it('without a situation lists everyone-presets first and keeps all of them', () => {
        const keys = keysOf(null);
        assert.equal(keys.length, COURSE_PRESETS.length);
        const firstSpecific = presetsFor(null).findIndex(p => p.situations !== 'ALL');
        assert.ok(
            presetsFor(null)
                .slice(0, firstSpecific)
                .every(p => p.situations === 'ALL')
        );
        assert.ok(
            presetsFor(null)
                .slice(firstSpecific)
                .every(p => p.situations !== 'ALL')
        );
    });
});

describe('monthlyAmountFor', () => {
    it('spreads over the months left, rounding up to a whole cent', () => {
        assert.equal(monthlyAmountFor(120_000, 1), 10_000);
        assert.equal(monthlyAmountFor(120_000, 7), 20_000);
        assert.equal(monthlyAmountFor(100_000, 1, 3), 33_334);
        assert.equal(monthlyAmountFor(100_000, 1, 12), 8_334);
    });

    it('always reaches the total and never overshoots by a whole month', () => {
        for (const total of [0, 1, 99, 100_000, 1_234_567]) {
            for (let from = 1; from <= 12; from += 1) {
                const months = 12 - from + 1;
                const share = monthlyAmountFor(total, from);
                assert.ok(Number.isInteger(share));
                assert.ok(share * months >= total);
                assert.ok(share * months - total < months);
            }
        }
    });

    it('counts an inverted range as one month and rejects bad input', () => {
        assert.equal(monthlyAmountFor(5_000, 12, 3), 5_000);
        assert.throws(() => monthlyAmountFor(10.5, 1), RangeError);
        assert.throws(() => monthlyAmountFor(-1, 1), RangeError);
        assert.throws(() => monthlyAmountFor(100, 0), RangeError);
        assert.throws(() => monthlyAmountFor(100, 1, 13), RangeError);
    });
});
