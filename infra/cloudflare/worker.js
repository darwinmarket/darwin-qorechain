/**
 * darwin.market/qorechain -> the darwin-qorechain Vercel project (built with basePath /qorechain).
 * Attached only to the route darwin.market/qorechain*; every other path of darwin.market never
 * reaches this Worker. Any request that does reach it outside /qorechain passes through untouched.
 */
const ORIGIN = "https://darwin-qorechain.vercel.app";

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname !== "/qorechain" && !url.pathname.startsWith("/qorechain/")) return fetch(request);
    const target = new URL(url.pathname + url.search, ORIGIN);
    const headers = new Headers(request.headers);
    headers.set("x-forwarded-host", url.host);
    const init = { method: request.method, headers, redirect: "manual" };
    if (!["GET", "HEAD"].includes(request.method)) init.body = await request.arrayBuffer();
    const res = await fetch(target, init);
    // keep the visitor on darwin.market when the app redirects within itself
    const out = new Response(res.body, res);
    const loc = out.headers.get("location");
    if (loc && loc.startsWith(ORIGIN)) out.headers.set("location", loc.replace(ORIGIN, `https://${url.host}`));
    return out;
  },
};
