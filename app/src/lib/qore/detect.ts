/**
 * Is the QoreX extension here? A plain check of what the extension injects, without loading the
 * wallet adapter or the QoreChain SDK (a visitor who never connects never downloads them).
 */
type Injected = { isQoreX?: boolean };

export function qorexInjected(): Injected | null {
  if (typeof window === "undefined") return null;
  const n = (window as unknown as { qorex?: { native?: Injected } }).qorex?.native;
  return n && n.isQoreX ? n : null;
}

/** Wait briefly for the extension to inject itself. */
export async function waitForQorexInjected(ms = 1500): Promise<Injected | null> {
  const start = Date.now();
  while (Date.now() - start < ms) {
    const n = qorexInjected();
    if (n) return n;
    await new Promise((r) => setTimeout(r, 100));
  }
  return qorexInjected();
}
