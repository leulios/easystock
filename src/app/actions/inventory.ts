"use server";

import { getCurrentContext } from "./auth";
import { stockAdjustmentSchema, StockAdjustmentInput } from "@/lib/validations/catalog";
import {
  adjustStock,
  listStockMovements,
  ListMovementsOptions,
  transferStockBetweenShops,
  TransferStockInput,
  batchReceiveStock,
  BatchStockInInput,
} from "@/lib/services/inventory-service";
import { revalidatePath } from "next/cache";
import { ShopRole } from "@prisma/client";

export async function adjustStockAction(data: StockAdjustmentInput) {
  const context = await getCurrentContext();
  if (!context) {
    return { success: false, error: "Not authenticated" };
  }

  if (context.role === ShopRole.SHOPKEEPER && !context.isPlatformAdmin) {
    return {
      success: false,
      error: "Unauthorized: Shopkeepers cannot adjust inventory quantities. Stock control is reserved for Shop Owners.",
    };
  }

  const parsed = stockAdjustmentSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: "Validation error",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const result = await adjustStock(context, parsed.data);
    revalidatePath(`/${context.shopId}/inventory`);
    revalidatePath(`/${context.shopId}/inventory/movements`);
    revalidatePath(`/${context.shopId}/products`);
    revalidatePath(`/${context.shopId}/pos`);
    return { success: true, ...result };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to adjust stock" };
  }
}

export async function getStockMovementsAction(options: ListMovementsOptions = {}) {
  const context = await getCurrentContext();
  if (!context) {
    return { success: false, error: "Not authenticated" };
  }

  if (context.role === ShopRole.SHOPKEEPER && !context.isPlatformAdmin) {
    return {
      success: false,
      error: "Unauthorized: Shopkeepers cannot view stock movements or inventory ledgers.",
    };
  }

  try {
    const result = await listStockMovements(context, options);
    return { success: true, ...result };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to load stock movements" };
  }
}

export async function transferStockAction(data: TransferStockInput) {
  const context = await getCurrentContext();
  if (!context) {
    return { success: false as const, error: "Not authenticated" };
  }

  if (context.role === ShopRole.SHOPKEEPER && !context.isPlatformAdmin) {
    return {
      success: false as const,
      error: "Unauthorized: Shopkeepers cannot transfer stock between shops.",
    };
  }

  if (!data.targetShopId || !data.variantId || !data.quantity || data.quantity <= 0) {
    return { success: false as const, error: "Target shop, item, and positive quantity are required." };
  }

  try {
    const result = await transferStockBetweenShops(context, data);
    revalidatePath(`/${context.shopId}/inventory`);
    revalidatePath(`/${context.shopId}/inventory/movements`);
    revalidatePath(`/${context.shopId}/pos`);
    return { success: true as const, result };
  } catch (err: any) {
    return { success: false as const, error: err.message || "Stock transfer failed." };
  }
}

export async function batchStockInAction(data: BatchStockInInput) {
  const context = await getCurrentContext();
  if (!context) {
    return { success: false as const, error: "Not authenticated" };
  }

  if (context.role === ShopRole.SHOPKEEPER && !context.isPlatformAdmin) {
    return {
      success: false as const,
      error: "Unauthorized: Shopkeepers cannot receive stock. Stock receiving is reserved for Shop Owners.",
    };
  }

  try {
    const result = await batchReceiveStock(context, data);
    revalidatePath(`/${context.shopId}/inventory`);
    revalidatePath(`/${context.shopId}/inventory/movements`);
    revalidatePath(`/${context.shopId}/products`);
    revalidatePath(`/${context.shopId}/pos`);
    revalidatePath("/scan");
    return { success: true as const, result };
  } catch (err: any) {
    return { success: false as const, error: err.message || "Failed to receive stock" };
  }
}

