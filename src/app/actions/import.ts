"use server";

import { getCurrentContext } from "./auth";
import {
  parseCsvText,
  validateProductImport,
  executeProductImport,
  CsvProductRow,
} from "@/lib/services/import-service";
import { ShopRole } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function previewProductImportAction(rawCsvText: string) {
  const context = await getCurrentContext();
  if (!context) {
    return { success: false as const, error: "Not authenticated" };
  }

  if (context.role !== ShopRole.SHOP_OWNER && context.role !== ShopRole.SHOP_MANAGER && !context.isPlatformAdmin) {
    return { success: false as const, error: "Only shop owners and managers can import products." };
  }

  try {
    const rawRows = parseCsvText(rawCsvText);
    if (rawRows.length === 0) {
      return { success: false as const, error: "CSV file is empty or missing a valid header line." };
    }

    const validationResult = await validateProductImport(context, rawRows);
    return { success: true as const, validationResult };
  } catch (err: any) {
    return { success: false as const, error: err.message || "Failed to parse CSV file." };
  }
}

export async function executeProductImportAction(validRows: CsvProductRow[]) {
  const context = await getCurrentContext();
  if (!context) {
    return { success: false as const, error: "Not authenticated" };
  }

  if (context.role !== ShopRole.SHOP_OWNER && context.role !== ShopRole.SHOP_MANAGER && !context.isPlatformAdmin) {
    return { success: false as const, error: "Only shop owners and managers can import products." };
  }

  try {
    const result = await executeProductImport(context, validRows);
    revalidatePath(`/${context.shopId}/products`);
    revalidatePath(`/${context.shopId}/inventory`);
    revalidatePath(`/${context.shopId}/dashboard`);
    return { success: true as const, result };
  } catch (err: any) {
    return { success: false as const, error: err.message || "Failed to execute product import." };
  }
}
