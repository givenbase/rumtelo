/**
 * Catalogs Contract (Money)
 * oRPC procedures for backoffice catalog list endpoints.
 */

import { oc } from '@orpc/contract';
import { z } from 'zod';

import { HouseholdScoped } from '../../../../common/common.schema';
import { DebtKind, GivingCause, IncomeKind, JarKey } from '../enums';
import {
    Audience,
    Bank,
    CategoryTemplate,
    DebtPreset,
    FixedCostPreset,
    GivingCauseCatalog,
    GivingEvaluatorCatalog,
    GivingOrganisation,
    GoalPreset,
    IncomeSourcePreset,
    JarTemplate,
    MerchantPreset,
    TransactionInPreset,
} from './catalogs.schema';

/** Nested contract object mounted at `contract.money.catalogs`. */
export const catalogsContract = {
    jarTemplates: {
        list: oc.input(HouseholdScoped).output(z.array(JarTemplate)),
    },
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
                    audienceKey: z.string().max(64).nullish(),
                })
            )
            .output(z.array(FixedCostPreset)),
    },
    audiences: {
        list: oc.input(HouseholdScoped).output(z.array(Audience)),
    },
    banks: {
        list: oc
            .input(
                HouseholdScoped.extend({
                    /** ISO-2 country filter; omit for all active banks. */
                    country: z.string().length(2).nullish(),
                })
            )
            .output(z.array(Bank)),
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
    transactionInPresets: {
        list: oc.input(HouseholdScoped).output(z.array(TransactionInPreset)),
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
                    /** ISO market filter; default NL on the server when omitted. */
                    market: z.string().length(2).nullish(),
                })
            )
            .output(z.array(MerchantPreset)),
    },
    givingOrganisations: {
        list: oc
            .input(HouseholdScoped.extend({ cause: z.enum(GivingCause).nullish() }))
            .output(z.array(GivingOrganisation)),
    },
    givingCauses: {
        list: oc.input(HouseholdScoped).output(z.array(GivingCauseCatalog)),
    },
    givingEvaluators: {
        list: oc.input(HouseholdScoped).output(z.array(GivingEvaluatorCatalog)),
    },
};
