import { getCurrentContext } from "@/app/actions/auth";
import { redirect } from "next/navigation";
import { listPurchaseOrders } from "@/lib/services/purchase-service";
import { prisma } from "@/lib/db";
import { PurchasesClient } from "./purchases-client";

interface PurchasesPageProps {
  params: Promise<{ shopSlug: string }>;
}

export default async function PurchasesPage({ params }: PurchasesPageProps) {
  const { shopSlug } = await params;
  const context = await getCurrentContext();

  if (!context) {
    redirect("/login");
  }

  const [ordersResult, shop] = await Promise.all([
    listPurchaseOrders(context, { pageSize: 100 }),
    prisma.shop.findUnique({
      where: { id: context.shopId },
      select: { currency: true },
    }),
  ]);

  return (
    <PurchasesClient
      orders={ordersResult.items}
      shopSlug={shopSlug}
      currency={shop?.currency || "USD"}
    />
  );
}
