import { getCurrentContext } from "@/app/actions/auth";
import { redirect } from "next/navigation";
import { listProducts } from "@/lib/services/product-service";
import { prisma } from "@/lib/db";
import { InventoryClient } from "./inventory-client";

interface InventoryPageProps {
  params: Promise<{ shopSlug: string }>;
}

export default async function InventoryPage({ params }: InventoryPageProps) {
  const { shopSlug } = await params;
  const context = await getCurrentContext();

  if (!context) {
    redirect("/login");
  }

  const [productsResult, shop, siblingShops] = await Promise.all([
    listProducts(context, { pageSize: 150 }),
    prisma.shop.findUnique({
      where: { id: context.shopId },
      select: { currency: true },
    }),
    prisma.shop.findMany({
      where: { organizationId: context.organizationId, deletedAt: null },
      select: { id: true, name: true, code: true },
    }),
  ]);

  const items = productsResult.items.map((p) => ({
    productId: p.id,
    variantId: p.variantId!,
    name: p.name,
    sku: p.sku,
    barcode: p.barcode,
    category: p.category,
    unitOfMeasure: p.unitOfMeasure,
    costPrice: p.costPrice,
    sellingPrice: p.sellingPrice,
    currentStock: p.currentStock,
    reorderLevel: p.reorderLevel,
    isLowStock: p.isLowStock,
  }));

  return (
    <InventoryClient
      initialItems={items}
      shopSlug={shopSlug}
      currency={shop?.currency || "USD"}
      currentShopId={context.shopId}
      siblingShops={siblingShops}
    />
  );
}
