import { getCurrentContext } from "@/app/actions/auth";
import { redirect } from "next/navigation";
import { listProducts } from "@/lib/services/product-service";
import { prisma } from "@/lib/db";
import { MobileScannerClient } from "./mobile-scanner-client";
import { hashSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { resolveSessionContext } from "@/lib/auth/service";
import { cookies } from "next/headers";

interface ScanPageProps {
  params: Promise<{ shopSlug: string }>;
  searchParams?: Promise<{ token?: string }>;
}

export default async function ScanPage({ params, searchParams }: ScanPageProps) {
  const { shopSlug } = await params;
  const sParams = searchParams ? await searchParams : {};
  const token = sParams?.token;

  let context = await getCurrentContext();

  if (!context && token) {
    const tokenHash = hashSessionToken(token);
    const session = await prisma.userSession.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (session && session.expiresAt > new Date() && session.user.isActive) {
      const cookieStore = await cookies();
      cookieStore.set(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60,
      });
      context = await resolveSessionContext(token);
    }
  }

  if (!context) {
    redirect(`/login?redirect=/${shopSlug}/scan`);
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
      shopSlug={shopSlug}
    />
  );
}
