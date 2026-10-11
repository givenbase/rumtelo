import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { HouseholdRole } from '../enums';
import {
    HouseholdPermissionAction,
    HouseholdPermissionSection,
    permissionActionFromPath,
    roleCan,
} from './role-permissions';

describe('permissionActionFromPath', () => {
    it('classifies fixed-cost jar/settlement reads as READ despite POST', () => {
        assert.equal(
            permissionActionFromPath('/money/fixedCosts/byJar', 'POST'),
            HouseholdPermissionAction.READ
        );
        assert.equal(
            permissionActionFromPath('/money/fixedCosts/listSettlements', 'POST'),
            HouseholdPermissionAction.READ
        );
    });

    it('keeps other documented money reads as READ', () => {
        for (const leaf of [
            'inbox',
            'plan',
            'projections',
            'levels',
            'recap',
            'balances',
            'listInstitutions',
        ]) {
            assert.equal(
                permissionActionFromPath(`/money/x/${leaf}`, 'POST'),
                HouseholdPermissionAction.READ,
                leaf
            );
        }
    });

    it('still treats mutations as write actions', () => {
        assert.equal(
            permissionActionFromPath('/money/fixedCosts/create', 'POST'),
            HouseholdPermissionAction.CREATE
        );
        assert.equal(
            permissionActionFromPath('/money/fixedCosts/unlinkSettlement', 'POST'),
            HouseholdPermissionAction.DELETE
        );
    });
});

describe('roleCan VIEWER money', () => {
    it('allows READ on fixedCosts.byJar path classification', () => {
        const action = permissionActionFromPath('/money/fixedCosts/byJar', 'POST');
        assert.equal(roleCan(HouseholdRole.VIEWER, HouseholdPermissionSection.MONEY, action), true);
    });

    it('denies CREATE on money', () => {
        assert.equal(
            roleCan(
                HouseholdRole.VIEWER,
                HouseholdPermissionSection.MONEY,
                HouseholdPermissionAction.CREATE
            ),
            false
        );
    });
});
