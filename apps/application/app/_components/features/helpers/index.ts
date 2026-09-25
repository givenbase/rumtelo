/**
 * The Coach — on-screen tips (why-lines, jar cards) + Help/Settings toggle.
 *
 * Product model (one name everywhere in UI: **The Coach**):
 * - **Inbox** (`/product/coach`) — tip feed with one next move
 * - **On-screen tips** (this module) — in-context teaching on screens
 *
 * Same voice: informatie, nooit schaamte. Toggle tips in Settings → Account
 * (default on for beginners). Code may still say “helpers”; UI says The Coach.
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
export { CoachGuideSurface } from './helper-surface';
export { CoachTipCard } from './coach-tip-card';
export { WhyCaption } from './why-caption';
export { JarGuideCard } from './jar-guide-card';
