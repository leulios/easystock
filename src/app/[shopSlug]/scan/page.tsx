import { getCurrentContext } from "@/app/actions/auth";
import { redirect } from "next/navigation";
import { listProducts } from "@/lib/services/product-service";
import { prisma } from "@/lib/db";
import { MobileScannerClient } from "./mobile-scanner-client";

interface ScanPageProps {
  params: Promise<{ shopSlug: string }>;
}

export default async function ScanPage({ params }: ScanPageProps) {
  const { shopSlug } = await params;
  const context = await getCurrentContext();

  if (!context) {
    redirect("/login");
  }

  const [productsResult, shop, customers] = await Promise.all([
    listProducts(context, { pageSize: 500 }),
    prisma.shop.findUnique({
      where: { id: context.shopId },
      select: { id: true, name: true, currency: true, taxRate: true },
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
      shopSlug={shopSlug}
    />
  );
}
