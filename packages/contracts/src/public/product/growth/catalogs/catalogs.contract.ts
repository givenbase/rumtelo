/**
 * Catalogs Contract (Growth)
 * oRPC procedures for growth catalog list endpoints.
 */

import { oc } from '@orpc/contract';
import { z } from 'zod';

import { HouseholdScoped } from '../../../../common/common.schema';
import { SpendingStyle } from '../../../platform/enums';
import {
    AssetKind,
    AssetPreset,
    GrowthLeverPreset,
    IncomePosture,
    LearnBookPreset,
    LearnWatchPreset,
    WealthStage,
} from './catalogs.schema';

/** Nested contract object mounted at `contract.growth.catalogs`. */
export const growthCatalogsContract = {
    incomePostures: {
        list: oc.input(HouseholdScoped).output(z.array(IncomePosture)),
    },
    wealthStages: {
        list: oc.input(HouseholdScoped).output(z.array(WealthStage)),
    },
    leverPresets: {
        list: oc
            .input(
                HouseholdScoped.extend({
                    postureKey: z.string().max(64).nullish(),
                    spendingStyle: z.enum(SpendingStyle).nullish(),
                    stageKey: z.string().max(64).nullish(),
                })
            )
            .output(z.array(GrowthLeverPreset)),
    },
    /** Books we recommend. Plan and spending style decide what is suggested, not hosted. */
    bookPresets: {
        list: oc.input(HouseholdScoped).output(z.array(LearnBookPreset)),
    },
    /** Films, videos, and series we recommend. Same plan and style gates as books. */
    watchPresets: {
        list: oc.input(HouseholdScoped).output(z.array(LearnWatchPreset)),
    },
    /** Classes of what a household can own. The list can grow without an enum. */
    assetKinds: {
        list: oc.input(HouseholdScoped).output(z.array(AssetKind)),
    },
    /** Suggested names for New asset. Picking one sets the class. */
    assetPresets: {
        list: oc.input(HouseholdScoped).output(z.array(AssetPreset)),
    },
};
