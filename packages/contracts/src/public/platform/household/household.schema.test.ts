import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { BoardStage } from '../enums';
import { HouseholdSettings, HouseholdSettingsPatch } from './household.schema';

describe('boardStageFloor', () => {
    it('is read-only: a settings patch drops it', () => {
        const parsed = HouseholdSettingsPatch.parse({
            householdId: '3f0c1b52-6d1e-4c3a-9b8e-2a7d5f6e4c10',
            boardStageFloor: BoardStage.MONTH,
        });
        assert.equal('boardStageFloor' in parsed, false);
    });

    it('is part of the settings read, nullable', () => {
        assert.equal(HouseholdSettings.shape.boardStageFloor.safeParse(null).success, true);
        assert.equal(HouseholdSettings.shape.boardStageFloor.safeParse('MONTH').success, true);
        assert.equal(HouseholdSettings.shape.boardStageFloor.safeParse('NOPE').success, false);
    });
});
