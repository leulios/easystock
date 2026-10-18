"use server";

import { getCurrentContext } from "./auth";
import { stockAdjustmentSchema, StockAdjustmentInput } from "@/lib/validations/catalog";
import { adjustStock, listStockMovements, ListMovementsOptions, transferStockBetweenShops, TransferStockInput } from "@/lib/services/inventory-service";
import { revalidatePath } from "next/cache";

export async function adjustStockAction(data: StockAdjustmentInput) {
  const context = await getCurrentContext();
  if (!context) {
    return { success: false, error: "Not authenticated" };
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
