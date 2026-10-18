import { prisma } from "../db";
import { TenantContext } from "../tenant/context";
import { ProductInput } from "../validations/catalog";
import { MovementType, Prisma } from "@prisma/client";
import { Decimal } from "../decimal";

export interface ListProductsOptions {
  search?: string;
  categoryId?: string;
  page?: number;
  pageSize?: number;
  sortBy?: "name" | "sku" | "createdAt" | "sellingPrice";
  sortOrder?: "asc" | "desc";
}

export async function createProduct(context: TenantContext, input: ProductInput) {
  const { organizationId, shopId, user } = context;

  // 1. Verify SKU uniqueness within this organization
  const existingProduct = await prisma.product.findFirst({
    where: {
      organizationId,
      sku: input.sku.toUpperCase(),
      deletedAt: null,
    },
  });

  if (existingProduct) {
    throw new Error(`A product with SKU "${input.sku}" already exists in your organization.`);
  }

  // 2. Execute transactional creation
  return prisma.$transaction(async (tx) => {
    // Create product
    const product = await tx.product.create({
      data: {
        organizationId,
        categoryId: input.categoryId || null,
        name: input.name,
        sku: input.sku.toUpperCase(),
        barcode: input.barcode || null,
        description: input.description || null,
        unitOfMeasure: input.unitOfMeasure,
      },
    });

    // Create default product variant
    const variant = await tx.productVariant.create({
      data: {
        productId: product.id,
        name: "Standard",
        sku: product.sku,
        barcode: input.barcode || null,
        costPrice: new Decimal(input.costPrice),
        sellingPrice: new Decimal(input.sellingPrice),
        reorderLevel: input.reorderLevel,
      },
    });

    // Initialize inventory item for active shop
    const inventory = await tx.inventoryItem.create({
      data: {
        shopId,
        variantId: variant.id,
        quantity: input.initialStock,
      },
    });

    // If opening stock was specified, record in StockMovement ledger
    if (input.initialStock > 0) {
      await tx.stockMovement.create({
        data: {
          shopId,
          variantId: variant.id,
          movementType: MovementType.MANUAL_ADJUSTMENT,
          quantityDelta: input.initialStock,
          resultingBalance: input.initialStock,
          unitCost: new Decimal(input.costPrice),
          referenceType: "OPENING_BALANCE",
          notes: "Initial inventory setup on product creation",
          performedBy: user.id,
        },
      });
    }

    // Audit log
    await tx.auditLog.create({
      data: {
        organizationId,
        shopId,
        userId: user.id,
        action: "PRODUCT_CREATED",
        entityType: "Product",
        entityId: product.id,
        newData: { name: product.name, sku: product.sku, initialStock: input.initialStock },
      },
    });

    return { product, variant, inventory };
  });
}

export async function updateProduct(
  context: TenantContext,
  productId: string,
  input: Partial<ProductInput>
) {
  const { organizationId, shopId, user } = context;

  const product = await prisma.product.findFirst({
    where: { id: productId, organizationId, deletedAt: null },
    include: { variants: true },
  });

  if (!product) {
    throw new Error("Product not found or access denied.");
  }

  // If changing SKU, ensure no collision
  if (input.sku && input.sku.toUpperCase() !== product.sku) {
    const duplicate = await prisma.product.findFirst({
      where: {
        organizationId,
        sku: input.sku.toUpperCase(),
        deletedAt: null,
        id: { not: productId },
      },
    });
    if (duplicate) {
      throw new Error(`SKU "${input.sku}" is already assigned to another product.`);
    }
  }

  return prisma.$transaction(async (tx) => {
    const updatedProduct = await tx.product.update({
      where: { id: productId },
      data: {
        name: input.name ?? product.name,
        sku: input.sku ? input.sku.toUpperCase() : product.sku,
        barcode: input.barcode !== undefined ? input.barcode : product.barcode,
        categoryId: input.categoryId !== undefined ? input.categoryId : product.categoryId,
        description: input.description !== undefined ? input.description : product.description,
        unitOfMeasure: input.unitOfMeasure ?? product.unitOfMeasure,
      },
    });

    // Update the primary variant's prices and reorder level if provided
    const primaryVariant = product.variants[0];
    if (primaryVariant) {
      await tx.productVariant.update({
        where: { id: primaryVariant.id },
        data: {
          sku: updatedProduct.sku,
          barcode: updatedProduct.barcode,
          costPrice: input.costPrice !== undefined ? new Decimal(input.costPrice) : undefined,
          sellingPrice: input.sellingPrice !== undefined ? new Decimal(input.sellingPrice) : undefined,
          reorderLevel: input.reorderLevel !== undefined ? input.reorderLevel : undefined,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        organizationId,
        shopId,
        userId: user.id,
        action: "PRODUCT_UPDATED",
        entityType: "Product",
        entityId: productId,
        previousData: { name: product.name, sku: product.sku },
        newData: { name: updatedProduct.name, sku: updatedProduct.sku },
      },
    });

    return updatedProduct;
  });
}

export async function archiveProduct(context: TenantContext, productId: string) {
  const { organizationId, shopId, user } = context;

  const product = await prisma.product.findFirst({
    where: { id: productId, organizationId, deletedAt: null },
  });

  if (!product) {
    throw new Error("Product not found or already archived.");
  }

  // Soft-delete to preserve all historical sales and movements
  const archived = await prisma.product.update({
    where: { id: productId },
    data: { deletedAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      organizationId,
      shopId,
      userId: user.id,
      action: "PRODUCT_ARCHIVED",
      entityType: "Product",
      entityId: productId,
    },
  });

  return archived;
}

export async function listProducts(context: TenantContext, options: ListProductsOptions = {}) {
  const { organizationId, shopId } = context;
  const {
    search,
    categoryId,
    page = 1,
    pageSize = 20,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = options;

  const where: Prisma.ProductWhereInput = {
    organizationId,
    deletedAt: null,
    ...(categoryId ? { categoryId } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { sku: { contains: search, mode: "insensitive" } },
            { barcode: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const skip = (page - 1) * pageSize;

  const [totalCount, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: {
        category: true,
        variants: {
          include: {
            inventoryItems: {
              where: { shopId },
            },
          },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: pageSize,
    }),
  ]);

  const items = products.map((product) => {
    const primaryVariant = product.variants[0];
    const shopInventory = primaryVariant?.inventoryItems[0];
    const currentStock = shopInventory?.quantity ?? 0;

    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      barcode: product.barcode,
      description: product.description,
      unitOfMeasure: product.unitOfMeasure,
      category: product.category?.name || "Uncategorized",
      categoryId: product.categoryId,
      variantId: primaryVariant?.id,
      costPrice: primaryVariant ? Number(primaryVariant.costPrice) : 0,
      sellingPrice: primaryVariant ? Number(primaryVariant.sellingPrice) : 0,
      reorderLevel: primaryVariant?.reorderLevel ?? 5,
      currentStock,
      isLowStock: currentStock <= (primaryVariant?.reorderLevel ?? 5),
      createdAt: product.createdAt,
    };
  });

  return {
    items,
    pagination: {
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  };
}
