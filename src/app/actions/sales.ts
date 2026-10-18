"use server";

import { getCurrentContext } from "./auth";
import { createSaleSchema, CreateSaleInput, returnSaleSchema, ReturnSaleInput } from "@/lib/validations/sales";
import { createSale, processReturn, listSales, ListSalesOptions } from "@/lib/services/sales-service";
import { revalidatePath } from "next/cache";

export async function checkoutSaleAction(data: CreateSaleInput) {
  const context = await getCurrentContext();
  if (!context) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = createSaleSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: "Validation error",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const result = await createSale(context, parsed.data);
    revalidatePath(`/${context.shopId}/pos`);
    revalidatePath(`/${context.shopId}/inventory`);
    revalidatePath(`/${context.shopId}/dashboard`);
    return {
      success: true,
      sale: result.sale,
      isDuplicateReplay: result.isDuplicateReplay,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Checkout failed" };
  }
}

export async function returnSaleAction(data: ReturnSaleInput) {
  const context = await getCurrentContext();
  if (!context) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = returnSaleSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: "Validation error",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const result = await processReturn(context, parsed.data);
    revalidatePath(`/${context.shopId}/pos`);
    revalidatePath(`/${context.shopId}/pos/history`);
    revalidatePath(`/${context.shopId}/inventory`);
    return { success: true, ...result };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to process return" };
  }
}

export async function getSalesHistoryAction(options: ListSalesOptions = {}) {
  const context = await getCurrentContext();
  if (!context) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const result = await listSales(context, options);
    return { success: true, ...result };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to load sales history" };
  }
}
