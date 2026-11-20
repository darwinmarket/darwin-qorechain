import { notFound } from "next/navigation";
import { TxScreen } from "@/components/para/TxScreen";

export const metadata = { title: "Transaction" };

export default async function TxPage({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params;
  if (!/^(0x)?[0-9a-fA-F]{64}$/.test(hash)) notFound();
  return <TxScreen hash={hash} />;
}
