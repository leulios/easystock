import { prisma } from "../db";
import { TenantContext } from "../tenant/context";
import { UpdateShopSettingsInput } from "../validations/shop-settings";
import { Decimal } from "../decimal";
import { ShopRole } from "@prisma/client";

export async function getShopSettings(context: TenantContext) {
  const { organizationId, shopId } = context;

  const shop = await prisma.shop.findFirst({
    where: { id: shopId, organizationId, deletedAt: null },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          plan: true,
          planStatus: true,
        },
      },
    },
  });

  if (!shop) {
    throw new Error("Shop not found or access denied");
  }

  return {
    ...shop,
    taxRate: Number(shop.taxRate),
  };
}

export async function updateShopSettings(
  context: TenantContext,
  input: UpdateShopSettingsInput
) {
  const { organizationId, shopId, user, role, isPlatformAdmin } = context;

  // Authorization: Only SHOP_OWNER or Platform Admin can update settings
  if (role !== ShopRole.SHOP_OWNER && !isPlatformAdmin) {
    throw new Error("Unauthorized: Only Shop Owners can modify shop policies and settings.");
  }

  const existing = await prisma.shop.findFirst({
    where: { id: shopId, organizationId, deletedAt: null },
  });

  if (!existing) {
    throw new Error("Shop not found or access denied");
  }

  const updated = await prisma.shop.update({
    where: { id: shopId },
    data: {
      name: input.name.trim(),
      phone: input.phone?.trim() || null,
      email: input.email ? input.email.trim().toLowerCase() : null,
      address: input.address?.trim() || null,
      currency: input.currency.trim().toUpperCase(),
      taxRate: new Decimal(input.taxRate),
      taxNumber: input.taxNumber?.trim() || null,
      receiptHeader: input.receiptHeader?.trim() || null,
      receiptFooter: input.receiptFooter?.trim() || null,
      allowNegativeStock: input.allowNegativeStock,
    },
  });

  // Record audit log
  await prisma.auditLog.create({
    data: {
      organizationId,
      shopId,
      userId: user.id,
      action: "SHOP_SETTINGS_UPDATED",
      entityType: "Shop",
      entityId: shopId,
      previousData: {
        name: existing.name,
        currency: existing.currency,
        taxRate: existing.taxRate.toString(),
        allowNegativeStock: existing.allowNegativeStock,
      },
      newData: {
        name: updated.name,
        currency: updated.currency,
        taxRate: updated.taxRate.toString(),
        allowNegativeStock: updated.allowNegativeStock,
      },
    },
  });

  return {
    ...updated,
    taxRate: Number(updated.taxRate),
  };
}
