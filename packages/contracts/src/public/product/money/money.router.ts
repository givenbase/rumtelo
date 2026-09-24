/**
 * Money Router
 * Composes leaf contracts into the money product contract tree.
 * Wire paths: `contract.money.jars.list`, `contract.money.debts.plan`, etc.
 *
 * Mirror: apps/backend/src/modules/public/product/money/
 */

import { accountsContract, transactionContract } from './transaction/transaction.contract';
import { bankSyncContract } from './bank-sync/bank-sync.contract';
import { catalogsContract } from './catalogs/catalogs.contract';
import { dashboardContract } from './dashboard/dashboard.contract';
import { debtContract } from './debt/debt.contract';
import { fixedCostContract } from './fixed-cost/fixed-cost.contract';
import { goalContract } from './goal/goal.contract';
import { incomeContract } from './income/income.contract';
import { jarContract } from './jar/jar.contract';
import { monthScoreContract } from './month-score/month-score.contract';
import { ruleContract } from './rule/rule.contract';
import { weekCheckContract } from './week-check/week-check.contract';

export const contract = {
    jars: jarContract,
    income: incomeContract,
    fixedCosts: fixedCostContract,
    accounts: accountsContract,
    transactions: transactionContract,
    bankSync: bankSyncContract,
    rules: ruleContract,
    goals: goalContract,
    debts: debtContract,
    monthScore: monthScoreContract,
    weekCheck: weekCheckContract,
    dashboard: dashboardContract,
    /** Backoffice company catalogs — read-only suggestions for create forms. */
    catalogs: catalogsContract,
};
