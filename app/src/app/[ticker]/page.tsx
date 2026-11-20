import { notFound } from "next/navigation";
import { AppEntry } from "@/components/shell/AppEntry";
import { BASKETS, basketByUrlKey } from "@/lib/baskets";

/** `/BLUEdw` opens that basket inside the app, as on mainnet. */
export function generateStaticParams() {
  return BASKETS.map((b) => ({ ticker: b.ticker }));
}

export default async function BasketPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  if (!basketByUrlKey(decodeURIComponent(ticker))) notFound();
  return <AppEntry />;
}
