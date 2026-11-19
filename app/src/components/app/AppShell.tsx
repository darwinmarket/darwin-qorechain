import type { ReactNode } from "react";
import { NavBar } from "./NavBar";
import styles from "./app.module.css";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <NavBar />
      <main className={styles.panel}>
        <div className={styles.container}>
          {children}
          <footer className={styles.footer}>
            Darwin on QoreChain · qorechain-diana testnet, test tokens with no value · Built for Build Before Q-Day ·{" "}
            <a href="https://github.com/darwinmarket/darwin-qorechain" target="_blank" rel="noreferrer">
              Source
            </a>{" "}
            · Darwin is live on Miden mainnet at{" "}
            <a href="https://app.darwin.market" target="_blank" rel="noreferrer">
              app.darwin.market
            </a>
          </footer>
        </div>
      </main>
    </div>
  );
}
