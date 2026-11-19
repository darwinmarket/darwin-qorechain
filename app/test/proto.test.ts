// The app encodes MsgCrossVMCall and MsgConvertCoin by hand to keep the SDK out of the bundle.
// These vectors were produced by the official @qorechain/sdk encoder: any drift fails here.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { encodeFunctionData, maxUint256, parseAbi, bytesToHex } from "viem";
import { convertCoin, crossVmCall, CONVERT_COIN_TYPE_URL, CROSSVM_TYPE_URL } from "../src/lib/qore/proto.ts";

const V = JSON.parse(readFileSync(new URL("./vectors.json", import.meta.url), "utf8"));
const SENDER = "qor1h92yt25my24uwl8tkju7h0yl6gez6zpcyen9q5";
const ROUTER = "0x6b4d9220db397d4490ce4acc6ff63e4386a39de3";

test("MsgCrossVMCall is byte-identical to the SDK", () => {
  const data = encodeFunctionData({ abi: parseAbi(["function approve(address,uint256)"]), functionName: "approve", args: [ROUTER, maxUint256] });
  const m = crossVmCall(SENDER, ROUTER, data);
  assert.equal(m.typeUrl, CROSSVM_TYPE_URL);
  assert.equal(bytesToHex(m.value).slice(2), V.crossvm);
});

test("MsgConvertCoin is byte-identical to the SDK", () => {
  const m = convertCoin(SENDER, "0xb95445aa9b22abc77cebb4b9ebbc9fd2322d0838", "erc20:0x97143B771D34ddb9130b807b135Ae675A5a963CA", 2_500_000n);
  assert.equal(m.typeUrl, CONVERT_COIN_TYPE_URL);
  assert.equal(bytesToHex(m.value).slice(2), V.convert);
});

test("long payloads use multi-byte varint lengths", () => {
  const data = `0x${"ab".repeat(300)}` as const;
  const m = crossVmCall(SENDER, ROUTER, data);
  const hex = bytesToHex(m.value);
  // field 5 (payload): tag 0x2a, length 300 = 0xac 0x02
  assert.ok(hex.includes(`2aac02${"ab".repeat(300)}`));
});
