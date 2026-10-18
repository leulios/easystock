import React from "react";
import { getCurrentContext } from "@/app/actions/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { OnboardingWizardClient } from "./onboarding-wizard-client";

export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ shopSlug: string }>;
}) {
  const { shopSlug } = await params;
  const context = await getCurrentContext();

  if (!context) {
    redirect("/login");
  }

  const { organizationId, shopId } = context;

  const [shop, productCount, inventoryItems, salesCount] = await Promise.all([
    prisma.shop.findUnique({
      where: { id: shopId },
      select: {
        id: true,
        name: true,
        code: true,
        currency: true,
        taxRate: true,
        phone: true,
      },
    }),
    prisma.product.count({
      where: { organizationId, deletedAt: null },
    }),
    prisma.inventoryItem.findMany({
      where: { shopId },
      select: { quantity: true },
    }),
    prisma.sale.count({
      where: { shopId },
    }),
  ]);

  if (!shop) {
    redirect("/login");
  }

  const inventoryTotalQty = inventoryItems.reduce((acc, i) => acc + i.quantity, 0);

  return (
    <OnboardingWizardClient
      shopSlug={shopSlug}
      shop={{
        id: shop.id,
        name: shop.name,
        code: shop.code,
        currency: shop.currency,
        taxRate: Number(shop.taxRate),
        phone: shop.phone,
      }}
      metrics={{
        productCount,
        inventoryTotalQty,
        salesCount,
      }}
    />
  );
}
