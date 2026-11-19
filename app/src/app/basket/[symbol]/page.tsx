import { notFound } from "next/navigation";
import { BasketScreen } from "@/components/app/BasketScreen";
import { canonicalBasketSymbol } from "@/lib/baskets";
import { D } from "@/lib/qore/chain";

export function generateStaticParams() {
  return Object.values(D.baskets).map((b) => ({ symbol: b.display }));
}

export default async function BasketPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  const key = canonicalBasketSymbol(decodeURIComponent(symbol));
  if (!key) notFound();
  return <BasketScreen symbol={key} />;
}
