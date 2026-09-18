/**
 * Growth Router
 * Composes leaf contracts into the growth product contract tree.
 * Wire paths: `contract.growth.levers.list`, `contract.growth.weekCheck.current`, etc.
 *
 * Mirror: apps/backend/src/modules/public/product/growth/
 */

import { growthCatalogsContract } from './catalogs/catalogs.contract';
import { growthDashboardContract } from './dashboard/dashboard.contract';
import { learnContract } from './learn/learn.contract';
import { leverContract } from './lever/lever.contract';
import { milestoneContract } from './milestone/milestone.contract';
import { growthWeekCheckContract } from './week-check/week-check.contract';

export const contract = {
    levers: leverContract,
    milestones: milestoneContract,
    dashboard: growthDashboardContract,
    weekCheck: growthWeekCheckContract,
    catalogs: growthCatalogsContract,
    learn: learnContract,
};
