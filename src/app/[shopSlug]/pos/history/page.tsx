import { getCurrentContext } from "@/app/actions/auth";
import { redirect } from "next/navigation";
import { listSales } from "@/lib/services/sales-service";
import { prisma } from "@/lib/db";
import { HistoryClient } from "./history-client";

interface HistoryPageProps {
  params: Promise<{ shopSlug: string }>;
}

export default async function HistoryPage({ params }: HistoryPageProps) {
  const { shopSlug } = await params;
  const context = await getCurrentContext();

  if (!context) {
    redirect("/login");
  }

  const [salesResult, shop] = await Promise.all([
    listSales(context, { pageSize: 100 }),
    prisma.shop.findUnique({
      where: { id: context.shopId },
      select: { name: true, currency: true },
    }),
  ]);

  return (
    <HistoryClient
      sales={salesResult.items}
      shopSlug={shopSlug}
      shopName={shop?.name || "Shop"}
      currency={shop?.currency || "USD"}
    />
  );
}
