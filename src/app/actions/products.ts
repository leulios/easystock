"use server";

import { getCurrentContext } from "./auth";
import { productSchema, ProductInput } from "@/lib/validations/catalog";
import {
  createProduct,
  updateProduct,
  archiveProduct,
  listProducts,
  ListProductsOptions,
} from "@/lib/services/product-service";
import { revalidatePath } from "next/cache";

export async function createProductAction(data: ProductInput) {
  const context = await getCurrentContext();
  if (!context) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = productSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: "Validation error",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const result = await createProduct(context, parsed.data);
    revalidatePath(`/${context.shopId}/products`);
    revalidatePath(`/${context.shopId}/inventory`);
    revalidatePath(`/${context.shopId}/pos`);
    return { success: true, product: result.product };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to create product" };
  }
}

export async function updateProductAction(productId: string, data: Partial<ProductInput>) {
  const context = await getCurrentContext();
  if (!context) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const updated = await updateProduct(context, productId, data);
    revalidatePath(`/${context.shopId}/products`);
    revalidatePath(`/${context.shopId}/inventory`);
    revalidatePath(`/${context.shopId}/pos`);
    return { success: true, product: updated };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update product" };
  }
}

export async function archiveProductAction(productId: string) {
  const context = await getCurrentContext();
  if (!context) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    await archiveProduct(context, productId);
    revalidatePath(`/${context.shopId}/products`);
    revalidatePath(`/${context.shopId}/inventory`);
    revalidatePath(`/${context.shopId}/pos`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to archive product" };
  }
}

export async function getProductsAction(options: ListProductsOptions = {}) {
  const context = await getCurrentContext();
  if (!context) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const result = await listProducts(context, options);
    return { success: true, ...result };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to load products" };
  }
}
