/**
 * The app can live under a path prefix: darwin.market/qorechain in production
 * (NEXT_PUBLIC_BASE_PATH=/qorechain), the root locally. Next.js prefixes its own links and assets;
 * plain fetches, <img> sources and window.location need it added here.
 */
export const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/+$/, "");

export const withBase = (path: string) => `${BASE_PATH}${path}`;

/** A location's pathname without the base path. */
export const stripBase = (pathname: string) =>
  BASE_PATH && pathname.startsWith(BASE_PATH) ? pathname.slice(BASE_PATH.length) || "/" : pathname;
