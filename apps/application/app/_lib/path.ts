/**
 * Strip locale prefix / query / trailing slash so route matching works on bare app paths.
 * Defensive: next/navigation can occasionally disagree with next-intl.
 */
export function normalizeAppPathname(pathname: string): string {
    let path = pathname.split(/[?#]/)[0] || '/';
    path = path.replace(/^\/(en|nl|es|fr)(?=\/|$)/, '') || '/';
    if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
    return path || '/';
}

/** True when `pathname` is exactly `href` or a nested route under it. */
export function pathMatchesHref(pathname: string, href: string): boolean {
    const path = normalizeAppPathname(pathname);
    if (href === '/') return path === '/';
    return path === href || path.startsWith(`${href}/`);
}
