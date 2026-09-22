/**
 * Schemas barrel — re-exports every domain for routers that import `* as S`.
 * Source of truth lives under the plane/product tree; prefer public imports via
 * `@rumtelo/contracts/{domain}`.
 */
export * from '../common/common.schema';
export * from '../common/api-error-message';
export * from '../backoffice/plan/plan.schema';
export * from '../backoffice/plan/plan.util';
export * from '../backoffice/plan/launch-products';
export * from '../public/platform/schemas';
export * from '../public/product/money/schemas';
export * from '../public/product/growth/schemas';
export * from '../public/product/energy/schemas';
export * from '../public/product/soul/schemas';
