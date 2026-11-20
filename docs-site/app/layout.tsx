import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const sans = Geist({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const mono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://docs.darwin.market'),
  title: {
    template: 'Darwin on QoreChain | %s',
    default: 'Darwin on QoreChain | Documentation',
  },
  description:
    'Darwin on QoreChain: crypto baskets whose prices, rebalances, admin actions and trades are all authorised by ML-DSA-87 post-quantum signatures, on the qorechain-diana testnet.',
  openGraph: {
    title: 'Darwin on QoreChain | Documentation',
    description:
      'One token, a whole portfolio, priced and rebalanced only with ML-DSA-87 signatures checked on chain. Live on the QoreChain testnet.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${sans.variable} ${mono.variable}`}>
      <body className="min-h-screen bg-bg text-fg antialiased">{children}</body>
    </html>
  );
}
