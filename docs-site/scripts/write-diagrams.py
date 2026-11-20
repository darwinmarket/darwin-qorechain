"""Draws the QoreChain diagrams in the visual language of the mainnet docs (public/images/*.svg)."""
import os
from xml.sax.saxutils import escape

OUT = os.path.join(os.path.dirname(__file__), "..", "public", "images")

HEAD = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" font-family="Geist, Helvetica Neue, Helvetica, Arial, sans-serif">
<defs>
  <marker id="b" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
    <path d="M0,0 L10,5 L0,10 z" fill="#e2c57e"/></marker>
  <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#a9813f"/><stop offset="0.18" stop-color="#bb9450"/>
    <stop offset="0.38" stop-color="#cdab6b"/><stop offset="0.58" stop-color="#c09c5b"/>
    <stop offset="0.80" stop-color="#ae8743"/><stop offset="1" stop-color="#94702f"/>
  </linearGradient>
</defs>
<rect width="{w}" height="{h}" fill="#201e17"/>
<rect x="22" y="22" width="{iw}" height="{ih}" fill="none" stroke="#f5f2e8" stroke-opacity="0.10" rx="8"/>
"""


def text(x, y, s, size=12, fill="#a69f8c", weight=None, anchor=None):
    w = f' font-weight="{weight}"' if weight else ""
    a = f' text-anchor="{anchor}"' if anchor else ""
    return f'<text x="{x}" y="{y}" fill="{fill}" font-size="{size}"{w}{a}>{escape(s)}</text>\n'


def flow(name, title, subtitle, steps):
    w, h = 1160, 430
    out = HEAD.format(w=w, h=h, iw=w - 44, ih=h - 44)
    out += text(56, 64, title, 21, "#f5f2e8", 600)
    out += text(56, 88, subtitle, 13)
    x = 56
    for i, (head, lines, tag, mine) in enumerate(steps):
        stroke = 'stroke="#e2c57e" stroke-opacity="0.5"' if mine else 'stroke="#474334"'
        fill = "#201e17" if mine else "#2d2b22"
        out += f'<rect x="{x}" y="124" width="235" height="210" rx="12" fill="{fill}" {stroke} stroke-width="1.5"/>\n'
        circ = 'fill="url(#gold)"' if mine else 'fill="#474334"'
        num = "#ffffff" if mine else "#f5f2e8"
        out += f'<circle cx="{x + 30}" cy="156" r="14" {circ}/>' + text(x + 30, 161, str(i + 1), 14, num, 700, "middle")
        out += text(x + 54, 161, head, 14.5, "#f5f2e8", 700)
        for j, ln in enumerate(lines):
            out += text(x + 20, 196 + 20 * j, ln)
        if tag:
            out += text(x + 20, 300, tag, 12, "#e2c57e" if mine else "#a69f8c", 600)
        if i < len(steps) - 1:
            out += f'<path d="M{x + 237} 229 L{x + 269} 229" stroke="#e2c57e" stroke-width="2" marker-end="url(#b)"/>\n'
        x += 273
    out += "</svg>\n"
    with open(os.path.join(OUT, name), "w") as f:
        f.write(out)


flow(
    "buy-flow.svg",
    "One buy, one signature",
    "You sign the intent. The relayer verifies it and the chain executes it as you, inside your grant and your EVM window.",
    [
        ("You sign the intent", ["In QoreX: action, basket,", "fUSD in, minimum shares,", "nonce, expiry.", "secp256k1 + ML-DSA-87."], "your signature", True),
        ("The relayer checks", ["QoreSign verifies it against", "your on-chain ML-DSA-87", "key. Fields, expiry, and a", "nonce never used before."], "refuses replays", False),
        ("The chain executes", ["MsgExec as you, admitted by", "your EVM window. The router", "takes 0.30%, buys components", "from the reserve, mints."], "router + basket", False),
        ("The shares are yours", ["An ERC-20 balance on your", "account. Darwin has no key", "that moves it. The relayer", "paid the gas."], "done", True),
    ],
)

flow(
    "sell-flow.svg",
    "One sell, one signature",
    "Same shape: an intent you sign, verified by the relayer, executed as you. Selling stays open when buying is paused.",
    [
        ("You sign the intent", ["In QoreX: action sell, basket,", "shares, minimum fUSD,", "nonce, expiry.", "secp256k1 + ML-DSA-87."], "your signature", True),
        ("The relayer checks", ["Same checks as a buy:", "your on-chain key, the", "fields, expiry, nonce."], "refuses replays", False),
        ("Redeem and sell", ["The router redeems your", "shares in kind and sells", "each component to the", "reserve at oracle prices."], "no price for redeem", False),
        ("fUSD is yours", ["Paid to your account,", "minus 0.30%. Never less", "than your minimum."], "done", True),
    ],
)

# architecture: boxes with arrows
w, h = 1160, 560
out = HEAD.format(w=w, h=h, iw=w - 44, ih=h - 44)
out += text(56, 64, "Darwin on QoreChain", 21, "#f5f2e8", 600)
out += text(56, 88, "Every arrow that changes state carries an ML-DSA-87 signature checked on chain, or against an on-chain key.", 13)


def box(x, y, bw, bh, head, lines, mine=False):
    stroke = 'stroke="#e2c57e" stroke-opacity="0.5"' if mine else 'stroke="#474334"'
    fill = "#201e17" if mine else "#2d2b22"
    s = f'<rect x="{x}" y="{y}" width="{bw}" height="{bh}" rx="12" fill="{fill}" {stroke} stroke-width="1.5"/>\n'
    s += text(x + 18, y + 30, head, 14.5, "#f5f2e8", 700)
    for j, ln in enumerate(lines):
        s += text(x + 18, y + 54 + 19 * j, ln)
    return s


def arrow(x1, y1, x2, y2, label=None, lx=None, ly=None):
    s = f'<path d="M{x1} {y1} L{x2} {y2}" stroke="#e2c57e" stroke-width="2" marker-end="url(#b)"/>\n'
    if label:
        s += text(lx, ly, label, 11.5, "#e2c57e", 600)
    return s


out += box(56, 130, 230, 120, "You, in QoreX", ["signArbitrary: trade intent", "secp256k1 + ML-DSA-87", "+ EVM window, 24 h grant"], True)
out += box(360, 130, 250, 120, "Darwin's relayer", ["QoreSign: verifies the intent", "against your on-chain key", "sends MsgExec as you"])
out += box(690, 130, 200, 120, "DarwinRouter", ["fee 0.30%", "buys or sells every", "component, no admin"])
out += box(930, 110, 180, 90, "DarwinBasket", ["mint / redeem in kind", "curator-signed rebalance"])
out += box(930, 230, 180, 90, "DarwinReserve", ["oracle-priced inventory", "spread 0.30%"])
out += box(690, 380, 200, 110, "DarwinOracle", ["rounds signed by the", "reporter (ML-DSA-87)", "15% breaker, 60 s apart"])
out += box(360, 380, 250, 110, "pqcVerify / pqcKeyStatus", ["QoreChain precompiles", "0x...0A01, 0x...0A02", "used by PqcAuth"])
out += box(56, 380, 230, 110, "Reporter, curator, admin", ["ML-DSA-87 keys registered", "with proof of possession", "no secp256k1 power"], True)

out += arrow(288, 190, 356, 190, "intent", 300, 180)
out += arrow(612, 190, 686, 190, "MsgExec", 622, 180)
out += arrow(892, 175, 926, 160)
out += arrow(892, 210, 926, 262)
out += arrow(1020, 322, 900, 410, "prices", 975, 375)
out += arrow(288, 435, 356, 435, "signatures", 292, 425)
out += arrow(612, 435, 686, 435)
out += "</svg>\n"
with open(os.path.join(OUT, "architecture.svg"), "w") as f:
    f.write(out)
print("diagrams written")
