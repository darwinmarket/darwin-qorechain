/**
 * QWAKK's logo, fetched from Qwakk's own site and served from ours, so it shows in every browser
 * (some block third-party images). The mark is Qwakk's, all rights reserved: it is not copied into
 * this repository, only relayed with a cache.
 */
const SOURCE = "https://qwakk.fun/brand-mark.svg";
let cached: { at: number; body: string } | null = null;

export async function GET() {
  if (!cached || Date.now() - cached.at > 86_400_000) {
    const res = await fetch(SOURCE, { headers: { "user-agent": "darwin-app" } });
    if (!res.ok) return new Response("not found", { status: 404 });
    cached = { at: Date.now(), body: await res.text() };
  }
  return new Response(cached.body, {
    headers: { "content-type": "image/svg+xml", "cache-control": "public, max-age=86400, immutable" },
  });
}
