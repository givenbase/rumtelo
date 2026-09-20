/**
 * Energy Router
 * Composes leaf contracts into the energy product contract tree.
 * Wire paths: `contract.energy.logs.list`, `contract.energy.weekCheck.current`, etc.
 *
 * Mirror: apps/backend/src/modules/public/product/energy/
 */

import { energyDashboardContract } from './dashboard/dashboard.contract';
import { energyLogContract } from './log/log.contract';
import { timeEntryContract } from './time/time.contract';
import { timeTemplateContract } from './time-template/time-template.contract';
import { energyWeekCheckContract } from './week-check/week-check.contract';

export const contract = {
    logs: energyLogContract,
    time: timeEntryContract,
    timeTemplates: timeTemplateContract,
    dashboard: energyDashboardContract,
    weekCheck: energyWeekCheckContract,
};
