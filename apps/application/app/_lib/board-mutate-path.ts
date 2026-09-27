/**
 * Soft-nav board mutate paths (`CREATE_HREF` under `/product/…` only).
 *
 * Settings data Import (`/settings/data/import`) and Export must never match —
 * MEMBER/VIEWER and frozen periods set `showCreateFlows` false on settings
 * (HOUSEHOLD_SETTINGS is READ_ONLY), which used to bounce Import to `/`.
 */
export function isBoardMutatePath(pathname: string): boolean {
    const path = pathname.replace(/^\/(en|nl|es|fr)(?=\/|$)/, '') || '/';
    if (path === '/settings' || path.startsWith('/settings/')) return false;
    if (!path.startsWith('/product/')) return false;
    return /\/(create|update|import)(\/|$)/.test(path) || /\/move\/create(\/|$)/.test(path);
}
