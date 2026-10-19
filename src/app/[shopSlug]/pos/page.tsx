import { getCurrentContext } from "@/app/actions/auth";
import { redirect } from "next/navigation";
import { listProducts } from "@/lib/services/product-service";
import { prisma } from "@/lib/db";
import { POSTerminal } from "./pos-terminal";

interface POSPageProps {
  params: Promise<{ shopSlug: string }>;
}

export default async function POSPage({ params }: POSPageProps) {
  const { shopSlug } = await params;
  const context = await getCurrentContext();

  if (!context) {
    redirect("/login");
  }

  const [productsResult, categories, shop, customers] = await Promise.all([
    listProducts(context, { pageSize: 200 }),
    prisma.category.findMany({
      where: { organizationId: context.organizationId, deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
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

  const posProducts = productsResult.items.map((p) => ({
    id: p.id,
    variantId: p.variantId!,
    name: p.name,
    sku: p.sku,
    barcode: p.barcode,
    category: p.category,
    categoryId: p.categoryId,
    sellingPrice: p.sellingPrice,
    currentStock: p.currentStock,
  }));

  const posCustomers = customers.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    outstandingCredit: Number(c.outstandingCredit),
  }));

  return (
    <POSTerminal
      products={posProducts}
      categories={categories}
      customers={posCustomers}
      shopSlug={shopSlug}
      shop={{
        id: shop.id,
        name: shop.name,
        currency: shop.currency,
        taxRate: Number(shop.taxRate),
      }}
    />
  );
}
