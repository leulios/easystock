import { getCurrentContext } from "@/app/actions/auth";
import { redirect } from "next/navigation";
import { listProducts } from "@/lib/services/product-service";
import { prisma } from "@/lib/db";
import { MobileScannerClient } from "@/app/[shopSlug]/scan/mobile-scanner-client";

export const dynamic = "force-dynamic";

export default async function DedicatedRootScanPage() {
  const context = await getCurrentContext();

  if (!context) {
    redirect("/login?redirect=/scan");
  }

  const [productsResult, shop, customers] = await Promise.all([
    listProducts(context, { pageSize: 1000 }),
    prisma.shop.findUnique({
      where: { id: context.shopId },
      select: { id: true, name: true, code: true, currency: true, taxRate: true },
    }),
    prisma.customer.findMany({
      where: { organizationId: context.organizationId, deletedAt: null },
      select: { id: true, name: true, phone: true, outstandingCredit: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!shop) {
    redirect("/");
  }

  const items = productsResult.items.map((p) => ({
    id: p.id,
    variantId: p.variantId!,
    name: p.name,
    sku: p.sku,
    barcode: p.barcode,
    category: p.category,
    sellingPrice: p.sellingPrice,
    costPrice: p.costPrice,
    currentStock: p.currentStock,
    unit: p.unitOfMeasure,
  }));

  const customerList = customers.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    outstandingCredit: Number(c.outstandingCredit),
  }));

  return (
    <MobileScannerClient
      products={items}
      customers={customerList}
      shop={{
        id: shop.id,
        name: shop.name,
        currency: shop.currency,
      }}
      shopSlug={shop.code || shop.id}
    />
  );
}
