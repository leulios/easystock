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
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export interface QuickRegisterProductInput {
  name: string;
  barcode: string;
  categoryName?: string;
  sellingPrice: number;
  costPrice?: number;
  initialStock: number;
}

export async function quickRegisterProductAction(data: QuickRegisterProductInput) {
  const context = await getCurrentContext();
  if (!context) {
    return { success: false as const, error: "Not authenticated" };
  }

  const cleanName = data.name?.trim();
  const cleanBarcode = data.barcode?.trim();

  if (!cleanName || cleanName.length < 2) {
    return { success: false as const, error: "Product name must be at least 2 characters." };
  }
  if (!cleanBarcode || cleanBarcode.length < 2) {
    return { success: false as const, error: "A valid barcode is required." };
  }

  const sellingPrice = Number(data.sellingPrice) || 0;
  const costPrice = Number(data.costPrice) || 0;
  const initialStock = Math.max(0, Math.floor(Number(data.initialStock) || 0));

  try {
    // Check if product with this barcode already exists in this organization
    const existing = await prisma.productVariant.findFirst({
      where: {
        product: { organizationId: context.organizationId, deletedAt: null },
        barcode: cleanBarcode,
        deletedAt: null,
      },
      include: { product: true },
    });

    if (existing) {
      return {
        success: false as const,
        error: `A product with barcode "${cleanBarcode}" already exists: "${existing.product.name}".`,
      };
    }

    // Category resolution
    let categoryId: string | null = null;
    if (data.categoryName?.trim()) {
      const cName = data.categoryName.trim();
      let cat = await prisma.category.findFirst({
        where: {
          organizationId: context.organizationId,
          name: { equals: cName, mode: "insensitive" },
          deletedAt: null,
        },
      });
      if (!cat) {
        cat = await prisma.category.create({
          data: {
            organizationId: context.organizationId,
            name: cName,
          },
        });
      }
      categoryId = cat.id;
    }

    // Generate unique SKU
    const prefix = cleanName
      .replace(/[^A-Za-z0-9]/g, "")
      .slice(0, 4)
      .toUpperCase() || "ITEM";
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const sku = `${prefix}-${cleanBarcode.slice(-4) || randomSuffix}`;

    const result = await createProduct(context, {
      name: cleanName,
      sku,
      barcode: cleanBarcode,
      categoryId,
      costPrice,
      sellingPrice,
      initialStock,
      reorderLevel: 5,
      unitOfMeasure: "pcs",
    });

    revalidatePath(`/${context.shopId}/products`);
    revalidatePath(`/${context.shopId}/inventory`);
    revalidatePath(`/${context.shopId}/pos`);
    revalidatePath(`/${context.shopId}/scan`);
    revalidatePath("/scan");

    return {
      success: true as const,
      item: {
        id: result.product.id,
        variantId: result.variant.id,
        name: result.product.name,
        sku: result.product.sku,
        barcode: result.variant.barcode,
        category: data.categoryName?.trim() || "General",
        sellingPrice: Number(result.variant.sellingPrice),
        costPrice: Number(result.variant.costPrice),
        currentStock: result.inventory.quantity,
        unit: result.product.unitOfMeasure,
      },
    };
  } catch (err: any) {
    return { success: false as const, error: err.message || "Failed to register product" };
  }
}

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
