/**
 * Catalogs Contract (Money)
 * oRPC procedures for backoffice catalog list endpoints.
 */

import { oc } from '@orpc/contract';
import { z } from 'zod';

import { HouseholdScoped } from '../../../../common/common.schema';
import { DebtKind, GivingCause, IncomeKind, JarKey } from '../enums';
import {
    CategoryTemplate,
    DebtPreset,
    FixedCostPreset,
    GivingOrganisation,
    GoalPreset,
    IncomeSourcePreset,
    MerchantPreset,
} from './catalogs.schema';

/** Nested contract object mounted at `contract.money.catalogs`. */
export const catalogsContract = {
    categoryTemplates: {
        list: oc
            .input(HouseholdScoped.extend({ jarKey: z.enum(JarKey).nullish() }))
            .output(z.array(CategoryTemplate)),
    },
    fixedCostPresets: {
        list: oc
            .input(
                HouseholdScoped.extend({
                    jarKey: z.enum(JarKey).nullish(),
                    categoryTemplateKey: z.string().max(64).nullish(),
                    audienceTag: z.string().max(32).nullish(),
                })
            )
            .output(z.array(FixedCostPreset)),
    },
    debtPresets: {
        list: oc
            .input(HouseholdScoped.extend({ kind: z.enum(DebtKind).nullish() }))
            .output(z.array(DebtPreset)),
    },
    incomeSourcePresets: {
        list: oc
            .input(HouseholdScoped.extend({ kind: z.enum(IncomeKind).nullish() }))
            .output(z.array(IncomeSourcePreset)),
    },
    goalPresets: {
        list: oc
            .input(HouseholdScoped.extend({ jarKey: z.enum(JarKey).nullish() }))
            .output(z.array(GoalPreset)),
    },
    merchantPresets: {
        list: oc
            .input(
                HouseholdScoped.extend({
                    jarKey: z.enum(JarKey).nullish(),
                    categoryTemplateKey: z.string().max(64).nullish(),
                    mcc: z.string().length(4).nullish(),
                })
            )
            .output(z.array(MerchantPreset)),
    },
    givingOrganisations: {
        list: oc
            .input(HouseholdScoped.extend({ cause: z.enum(GivingCause).nullish() }))
            .output(z.array(GivingOrganisation)),
    },
};
