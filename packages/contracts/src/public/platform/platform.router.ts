/**
 * Platform router — composes leaf contracts into `contract.account|household|…`.
 * Plans catalog stays here (backoffice PlanCatalogItem).
 */

import { oc } from '@orpc/contract';
import { z } from 'zod';

import { PlanCatalogItem } from '../../backoffice/plan/plan.schema';
import { accountContract } from './account/account.contract';
import { billingContract } from './billing/billing.contract';
import { coachContract } from './coach/coach.contract';
import { contactContract } from './contact/contact.contract';
import { householdContract } from './household/household.contract';

/** Platform-level: account prefs, the household itself, and cross-product advisory. */
export const contract = {
    account: accountContract,
    household: householdContract,
    /** Product tier catalog (Basic / Plus / Max). */
    plans: {
        list: oc.output(z.array(PlanCatalogItem)),
    },
    billing: billingContract,
    coach: coachContract,
    contact: contactContract,
};
