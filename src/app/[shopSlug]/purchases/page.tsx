import { getCurrentContext } from "@/app/actions/auth";
import { redirect } from "next/navigation";
import { listPurchaseOrders } from "@/lib/services/purchase-service";
import { prisma } from "@/lib/db";
import { PurchasesClient } from "./purchases-client";
import { ShopRole } from "@prisma/client";

interface PurchasesPageProps {
  params: Promise<{ shopSlug: string }>;
}

export default async function PurchasesPage({ params }: PurchasesPageProps) {
  const { shopSlug } = await params;
  const context = await getCurrentContext();

  if (!context) {
    redirect("/login");
  }

  if (context.role === ShopRole.SHOPKEEPER && !context.isPlatformAdmin) {
    redirect(`/${shopSlug}/dashboard`);
  }

  const [ordersResult, shop, documents] = await Promise.all([
    listPurchaseOrders(context, { pageSize: 100 }),
    prisma.shop.findUnique({
      where: { id: context.shopId },
      select: { currency: true },
    }),
    prisma.businessDocument.findMany({
      where: { shopId: context.shopId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <PurchasesClient
      orders={ordersResult.items}
      documents={documents}
      shopSlug={shopSlug}
      currency={shop?.currency || "USD"}
    />
  );
}
