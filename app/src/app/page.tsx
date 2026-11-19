"use client";

import { DarwinHome } from "@/components/darwin/DarwinHome";
import { HeroActions } from "@/components/darwin/shell";
import { Activity } from "@/components/app/Activity";
import { PqProof } from "@/components/app/PqProof";
import styles from "@/components/app/app.module.css";

export default function Home() {
  return (
    <>
      <DarwinHome actions={<HeroActions />} />
      <section className={styles.pillars}>
        <div className={styles.pillar}>
          <b>Oracle</b>
          <h3>Every price is post-quantum signed</h3>
          <p>
            The reporter signs each round with ML-DSA-87. The oracle contract checks it with QoreChain&apos;s pqcVerify precompile
            against the key registered on chain before it stores a single price.
          </p>
        </div>
        <div className={styles.pillar}>
          <b>Curator</b>
          <h3>Rebalances need an ML-DSA-87 signature</h3>
          <p>
            The curator signs the exact trades. The basket runs them at oracle prices and reverts if a rebalance would cost more than 1% of
            its NAV.
          </p>
        </div>
        <div className={styles.pillar}>
          <b>You</b>
          <h3>Trades signed twice, by QoreX</h3>
          <p>
            Buy and sell with fUSD in one transaction. QoreX adds the ML-DSA-87 layer to the secp256k1 signature, and the trade reaches the
            EVM through a native cross-VM call.
          </p>
        </div>
      </section>
      <div className={styles.homeLower}>
        <Activity />
        <PqProof />
      </div>
    </>
  );
}
