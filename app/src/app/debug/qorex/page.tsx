"use client";

/**
 * Which message types does the installed QoreX agree to show? Each button hands QoreX one
 * candidate message. QoreX either refuses at once ("QoreX cannot show what … does") or opens its
 * approval window: decline it there, nothing is sent. Diagnostic page, not linked from the app.
 */
import { useState } from "react";
import deployments from "@/config/deployments.json";

const CHAIN_ID = "qorechain-diana";

class W {
  private c: number[] = [];
  private v(n: number) {
    while (n > 0x7f) {
      this.c.push((n & 0x7f) | 0x80);
      n >>>= 7;
    }
    this.c.push(n);
  }
  bytes(f: number, b: Uint8Array) {
    if (!b.length) return this;
    this.v((f << 3) | 2);
    this.v(b.length);
    for (const x of b) this.c.push(x);
    return this;
  }
  string(f: number, s: string) {
    return this.bytes(f, new TextEncoder().encode(s));
  }
  varint(f: number, n: number) {
    this.v(f << 3);
    this.v(n);
    return this;
  }
  done() {
    return Uint8Array.from(this.c);
  }
}
const coin = (denom: string, amount: string) => new W().string(1, denom).string(2, amount).done();
const hex = (h: string) => Uint8Array.from(h.replace(/^0x/, "").match(/../g)!.map((b) => parseInt(b, 16)));

type Msg = { typeUrl: string; value: Uint8Array };
type Q = { native?: { capabilities?: string[]; enable(c: string): Promise<unknown>; getKey(c: string): Promise<{ bech32Address: string; address: number[]; pubKey: number[] }>; signAndBroadcast(r: unknown): Promise<unknown>; signDirect?(chainId: string, signer: string, doc: unknown): Promise<unknown> } };

/** A full SignDoc for one message, to hand to QoreX's signDirect. Never broadcast. */
async function signDocFor(me: string, msg: Msg) {
  const k = await (window as unknown as { qorex: Q }).qorex.native!.getKey(CHAIN_ID);
  const acc = await (await fetch(`/api/rest/cosmos/auth/v1beta1/account_info/${me}`)).json();
  const info = acc.info ?? acc;
  const any = (t: string, v: Uint8Array) => new W().string(1, t).bytes(2, v).done();
  const body = new W().bytes(1, any(msg.typeUrl, msg.value)).string(2, "darwin: QoreX signDirect test (never broadcast)").done();
  const pub = any("/cosmos.crypto.secp256k1.PubKey", new W().bytes(1, Uint8Array.from(k.pubKey)).done());
  const signer = new W().bytes(1, pub).bytes(2, new W().bytes(1, new W().varint(1, 1).done()).done()).varint(3, Number(info.sequence ?? 0)).done();
  const fee = new W().bytes(1, coin("uqor", "300000")).varint(2, 2_000_000).done();
  const authInfo = new W().bytes(1, signer).bytes(2, fee).done();
  return { bodyBytes: body, authInfoBytes: authInfo, chainId: CHAIN_ID, accountNumber: BigInt(info.account_number ?? 0) };
}

const D = deployments as any;
const FUSD = `erc20:${D.tokens.fUSD}`;
const DESK = "qor1yzq84n9uj6fmgzsh7tk88gr7dhrh60u95gpw8p"; // Darwin's deployer, as a stand-in grantee/recipient

function candidates(me: string, twin: string): { label: string; msg: Msg }[] {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const generic = (t: string) => new W().string(1, t).done();
  const grant = (t: string) =>
    new W()
      .bytes(1, new W().string(1, "/cosmos.authz.v1beta1.GenericAuthorization").bytes(2, generic(t)).done())
      .bytes(2, new W().varint(1, exp).done())
      .done();
  return [
    { label: "bank MsgSend 1 uqor to yourself", msg: { typeUrl: "/cosmos.bank.v1beta1.MsgSend", value: new W().string(1, me).string(2, me).bytes(3, coin("uqor", "1")).done() } },
    { label: "bank MsgSend 1 ufUSD (bank form) to Darwin", msg: { typeUrl: "/cosmos.bank.v1beta1.MsgSend", value: new W().string(1, me).string(2, DESK).bytes(3, coin(FUSD, "1")).done() } },
    { label: "authz MsgGrant: MsgCrossVMCall, 1 hour", msg: { typeUrl: "/cosmos.authz.v1beta1.MsgGrant", value: new W().string(1, me).string(2, DESK).bytes(3, grant("/qorechain.crossvm.v1.MsgCrossVMCall")).done() } },
    { label: "authz MsgGrant: MsgConvertCoin, 1 hour", msg: { typeUrl: "/cosmos.authz.v1beta1.MsgGrant", value: new W().string(1, me).string(2, DESK).bytes(3, grant("/cosmos.evm.erc20.v1.MsgConvertCoin")).done() } },
    { label: "cosmwasm MsgExecuteContract", msg: { typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract", value: new W().string(1, me).string(2, DESK).bytes(3, new TextEncoder().encode('{"ping":{}}')).done() } },
    { label: "erc20 MsgConvertERC20 (EVM -> bank)", msg: { typeUrl: "/cosmos.evm.erc20.v1.MsgConvertERC20", value: new W().string(1, D.tokens.fUSD).string(2, "1").string(3, me).string(4, me).done() } },
    { label: "erc20 MsgConvertCoin (bank -> EVM)", msg: { typeUrl: "/cosmos.evm.erc20.v1.MsgConvertCoin", value: new W().bytes(1, coin(FUSD, "1")).string(2, twin).string(3, me).done() } },
    { label: "crossvm MsgCrossVMCall (fUSD.totalSupply)", msg: { typeUrl: "/qorechain.crossvm.v1.MsgCrossVMCall", value: new W().string(1, me).string(2, "cosmwasm").string(3, "evm").string(4, D.tokens.fUSD).bytes(5, hex("0x18160ddd")).done() } },
  ];
}

export default function QorexDebug() {
  const [me, setMe] = useState<{ addr: string; twin: string; caps: string[] } | null>(null);
  const [out, setOut] = useState<Record<string, string>>({});
  const q = () => (window as unknown as { qorex?: Q }).qorex?.native;

  async function connect() {
    const n = q();
    if (!n) return setOut({ connect: "QoreX not found" });
    await n.enable(CHAIN_ID);
    const k = await n.getKey(CHAIN_ID);
    setMe({ addr: k.bech32Address, twin: "0x" + k.address.map((b) => b.toString(16).padStart(2, "0")).join(""), caps: n.capabilities ?? [] });
  }
  async function attemptDirect(label: string, msg: Msg) {
    setOut((o) => ({ ...o, [label]: "waiting for QoreX… (decline the approval if it opens)" }));
    try {
      const n = q()!;
      if (!n.signDirect) throw new Error("this QoreX has no signDirect");
      const r = await n.signDirect(CHAIN_ID, me!.addr, await signDocFor(me!.addr, msg));
      setOut((o) => ({ ...o, [label]: `SIGNED via signDirect, NOT broadcast: ${JSON.stringify(r, (_k, v) => (typeof v === "bigint" ? String(v) : v)).slice(0, 120)}` }));
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      const verdict = /cannot show|cannot read|cannot display/i.test(m) ? "REFUSED (cannot display)" : /reject/i.test(m) ? "DISPLAYED (you declined)" : "OTHER";
      setOut((o) => ({ ...o, [label]: `${verdict}: ${m}` }));
    }
  }

  async function attempt(label: string, msg: Msg) {
    setOut((o) => ({ ...o, [label]: "waiting for QoreX… (decline the approval if it opens)" }));
    try {
      const r = await q()!.signAndBroadcast({ chainId: CHAIN_ID, messages: [msg], memo: "darwin: QoreX capability test", gasLimit: 300000 });
      setOut((o) => ({ ...o, [label]: `SIGNED: ${JSON.stringify(r).slice(0, 160)}` }));
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      const verdict = /cannot show|cannot read|cannot display/i.test(m) ? "REFUSED (cannot display)" : /reject/i.test(m) ? "DISPLAYED (you declined)" : "OTHER";
      setOut((o) => ({ ...o, [label]: `${verdict}: ${m}` }));
    }
  }

  return (
    <main style={{ maxWidth: 900, margin: "40px auto", fontFamily: "system-ui", padding: 20 }}>
      <h1>QoreX: which messages can it show?</h1>
      <p>Click a row. If QoreX opens its approval window, <b>decline</b> it: nothing is sent.</p>
      <button onClick={connect} style={{ padding: "8px 14px", cursor: "pointer" }}>Connect QoreX</button>
      {me && (
        <>
          <p>
            {me.addr} · {me.twin}
            <br />
            capabilities: <code>{me.caps.join(", ") || "(none listed)"}</code>
          </p>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {candidates(me.addr, me.twin).map(({ label, msg }) => (
                <tr key={label} style={{ borderTop: "1px solid #ddd" }}>
                  <td style={{ padding: 8 }}>
                    <button onClick={() => attempt(label, msg)} style={{ padding: "6px 10px", cursor: "pointer" }}>{label}</button>
                  </td>
                  <td style={{ padding: 8, fontSize: 13 }} data-result={label}>
                    {out[label] ?? ""}
                  </td>
                </tr>
              ))}
              {(() => {
                const label = "signDirect: MsgCrossVMCall (never broadcast)";
                const msg = candidates(me.addr, me.twin).at(-1)!.msg;
                return (
                  <tr key={label} style={{ borderTop: "1px solid #ddd" }}>
                    <td style={{ padding: 8 }}>
                      <button onClick={() => attemptDirect(label, msg)} style={{ padding: "6px 10px", cursor: "pointer" }}>{label}</button>
                    </td>
                    <td style={{ padding: 8, fontSize: 13 }}>{out[label] ?? ""}</td>
                  </tr>
                );
              })()}
            </tbody>
          </table>
        </>
      )}
      {out.connect && <p>{out.connect}</p>}
    </main>
  );
}
