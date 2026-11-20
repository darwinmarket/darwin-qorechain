/** The site is served under a base path (docs.darwin.market/qorechain). Next's <Link> and router add
 *  it on their own; plain <a href> and <img src> written as "/..." need it added. */
export const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '/qorechain';
export const withBase = (path: string) => (path.startsWith('/') && !path.startsWith('//') ? `${BASE}${path}` : path);
