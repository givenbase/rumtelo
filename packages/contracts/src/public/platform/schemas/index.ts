/**
 * Compat barrel — prefer leaf imports (`../account`, …).
 * Kept so `schemas/index` and relative `platform/schemas/*` paths keep working during migration.
 */
export * from '../account';
export * from '../auth';
export * from '../billing';
export * from '../coach';
export * from '../contact';
export * from '../household';
