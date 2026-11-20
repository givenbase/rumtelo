/**
 * The Coach — on-screen help and the one Coach line per page.
 *
 * Product model (one name everywhere in UI: **The Coach**):
 * - **Coach page** (`/product/coach`) — the full tip feed with one next move
 * - **Coach line** (`CoachLine`) — at most one per page, after the household's own data
 * - **Reference help** (jar guide, debt compare, split tips) — small, where you decide
 *
 * Same voice: information, never shame. Toggle tips in Settings → Account (default on).
 * VIEWER look-along: `useHelpersEnabled` is always false (no tip chrome).
 * Placement rules: `docs/product/coach-redesign.md` §2.
 */
export {
    FeatureHelpersProvider,
    useFeatureHelpers,
    useHelpersEnabled,
    useHelpersEnabled as useCoachGuidesEnabled,
} from './provider';
export { HelperGate, HelperGate as CoachGuideGate } from './helper-gate';
export { CoachFeatureGate } from './coach-feature-gate';
export { CoachMark } from './helper-mark';
export { CoachLine } from './coach-line';
export { JarGuideCard } from './jar-guide-card';
export { EntityNotFoundState } from './entity-not-found-state';
