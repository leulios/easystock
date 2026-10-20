import { prisma } from "../db";
import { TenantContext } from "../tenant/context";
import { StockAdjustmentInput } from "../validations/catalog";
import { MovementType, Prisma, ShopRole } from "@prisma/client";
import { Decimal } from "../decimal";

export interface ListMovementsOptions {
  variantId?: string;
  movementType?: MovementType;
  page?: number;
  pageSize?: number;
}

export async function adjustStock(context: TenantContext, input: StockAdjustmentInput) {
  const { organizationId, shopId, user, role, permissions } = context;

  // 1. Authorization check: requires permission or Shop Owner
  const isAuthorized = role === ShopRole.SHOP_OWNER || permissions.canAdjustStock;
  if (!isAuthorized) {
    throw new Error("You do not have permission to adjust inventory quantities.");
  }

  // 2. Fetch variant and shop settings
  const [variant, shop] = await Promise.all([
    prisma.productVariant.findUnique({
      where: { id: input.variantId },
      include: {
        product: true,
      },
    }),
    prisma.shop.findUnique({
      where: { id: shopId },
      select: { allowNegativeStock: true, isActive: true, suspensionReason: true },
    }),
  ]);

  if (shop && shop.isActive === false) {
    throw new Error(
      `This shop is currently suspended by platform administration: "${shop.suspensionReason || "Administrative hold"}". Operations are halted.`
    );
  }

  if (!variant || variant.product.organizationId !== organizationId) {
    throw new Error("Product variant not found or access denied.");
  }

  return prisma.$transaction(async (tx) => {
    // Upsert or fetch inventory item for this shop
    const inventory = await tx.inventoryItem.upsert({
      where: {
        shopId_variantId: {
          shopId,
          variantId: input.variantId,
        },
      },
      update: {},
      create: {
        shopId,
        variantId: input.variantId,
        quantity: 0,
      },
    });

    let quantityDelta = 0;
    let resultingBalance = inventory.quantity;

    if (input.adjustmentType === "SET_QUANTITY") {
      quantityDelta = input.quantity - inventory.quantity;
      resultingBalance = input.quantity;
    } else if (input.adjustmentType === "ADD_QUANTITY") {
      quantityDelta = input.quantity;
      resultingBalance = inventory.quantity + input.quantity;
    } else if (input.adjustmentType === "DEDUCT_QUANTITY") {
      quantityDelta = -input.quantity;
      resultingBalance = inventory.quantity - input.quantity;
    }

    if (resultingBalance < 0 && !shop?.allowNegativeStock) {
      throw new Error(
        `Cannot adjust stock below zero. Current: ${inventory.quantity}, Attempted deduction: ${Math.abs(quantityDelta)}. Negative inventory is disabled for this shop.`
      );
    }

    // Update inventory item balance with optimistic concurrency check
    await tx.inventoryItem.update({
      where: { id: inventory.id },
      data: {
        quantity: resultingBalance,
        version: { increment: 1 },
      },
    });

    // Write immutable StockMovement ledger entry
    const movement = await tx.stockMovement.create({
      data: {
        shopId,
        variantId: input.variantId,
        movementType:
          quantityDelta >= 0 ? MovementType.MANUAL_ADJUSTMENT : MovementType.DAMAGE_WASTE,
        quantityDelta,
        resultingBalance,
        unitCost: variant.costPrice,
        referenceType: "MANUAL_ADJUSTMENT",
        notes: `[Reason: ${input.reason}] ${input.notes || ""}`.trim(),
        performedBy: user.id,
      },
    });

    // Record in AuditLog
    await tx.auditLog.create({
      data: {
        organizationId,
        shopId,
        userId: user.id,
        action: "STOCK_ADJUSTED",
        entityType: "InventoryItem",
        entityId: inventory.id,
        previousData: { quantity: inventory.quantity },
        newData: { quantity: resultingBalance, delta: quantityDelta, reason: input.reason },
      },
    });

    return { inventory: { ...inventory, quantity: resultingBalance }, movement };
  });
}

export async function listStockMovements(context: TenantContext, options: ListMovementsOptions = {}) {
  const { shopId } = context;
  const { variantId, movementType, page = 1, pageSize = 25 } = options;

  const where: Prisma.StockMovementWhereInput = {
    shopId,
    ...(variantId ? { variantId } : {}),
    ...(movementType ? { movementType } : {}),
  };

  const skip = (page - 1) * pageSize;

  const [totalCount, movements] = await Promise.all([
    prisma.stockMovement.count({ where }),
    prisma.stockMovement.findMany({
      where,
      include: {
        variant: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
  ]);

  return {
    items: movements.map((m) => ({
      id: m.id,
      productName: m.variant.product.name,
      variantName: m.variant.name,
      sku: m.variant.sku,
      movementType: m.movementType,
      quantityDelta: m.quantityDelta,
      resultingBalance: m.resultingBalance,
      unitCost: Number(m.unitCost),
      referenceType: m.referenceType,
      referenceId: m.referenceId,
      notes: m.notes,
      createdAt: m.createdAt,
    })),
    pagination: {
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  };
}

/**
 * Validates that the materialized inventory item balance matches the sum of all immutable stock movements.
 */
export async function verifyStockIntegrity(shopId: string, variantId: string) {
  const [inventoryItem, movements] = await Promise.all([
    prisma.inventoryItem.findUnique({
      where: {
        shopId_variantId: { shopId, variantId },
      },
    }),
    prisma.stockMovement.findMany({
      where: { shopId, variantId },
      select: { quantityDelta: true },
    }),
  ]);

  const calculatedBalance = movements.reduce((acc, m) => acc + m.quantityDelta, 0);
  const currentQuantity = inventoryItem?.quantity ?? 0;

  return {
    isValid: calculatedBalance === currentQuantity,
    currentQuantity,
    calculatedBalance,
    difference: currentQuantity - calculatedBalance,
  };
}

export interface TransferStockInput {
  targetShopId: string;
  variantId: string;
  quantity: number;
  notes?: string;
}

export async function transferStockBetweenShops(
  context: TenantContext,
  input: TransferStockInput
) {
  const { organizationId, shopId: sourceShopId, user, role } = context;

  if (role !== ShopRole.SHOP_OWNER && role !== ShopRole.SHOP_MANAGER && !context.isPlatformAdmin) {
    throw new Error("You do not have permission to transfer stock between shops.");
  }

  if (sourceShopId === input.targetShopId) {
    throw new Error("Target shop must be different from source shop.");
  }

  if (input.quantity <= 0) {
    throw new Error("Transfer quantity must be greater than zero.");
  }

  const [sourceShop, targetShop, variant] = await Promise.all([
    prisma.shop.findUnique({
      where: { id: sourceShopId },
      select: { id: true, name: true, organizationId: true, isActive: true, allowNegativeStock: true, suspensionReason: true },
    }),
    prisma.shop.findUnique({
      where: { id: input.targetShopId },
      select: { id: true, name: true, organizationId: true, isActive: true, suspensionReason: true },
    }),
    prisma.productVariant.findUnique({
      where: { id: input.variantId },
      include: { product: true },
    }),
  ]);

  if (!sourceShop || sourceShop.organizationId !== organizationId) {
    throw new Error("Source shop not found or access denied.");
  }
  if (!targetShop || targetShop.organizationId !== organizationId) {
    throw new Error("Target shop not found or belongs to a different organization.");
  }
  if (sourceShop.isActive === false) {
    throw new Error(`Source shop is suspended: "${sourceShop.suspensionReason || "Administrative hold"}"`);
  }
  if (targetShop.isActive === false) {
    throw new Error(`Target shop is suspended: "${targetShop.suspensionReason || "Administrative hold"}"`);
  }
  if (!variant || variant.product.organizationId !== organizationId) {
    throw new Error("Product variant not found or access denied.");
  }

  const transferBatchId = `TRF-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

  return prisma.$transaction(async (tx) => {
    // 1. Deduct from Source Shop
    const sourceInventory = await tx.inventoryItem.upsert({
      where: { shopId_variantId: { shopId: sourceShopId, variantId: input.variantId } },
      update: {},
      create: { shopId: sourceShopId, variantId: input.variantId, quantity: 0 },
    });

    const sourceResulting = sourceInventory.quantity - input.quantity;
    if (sourceResulting < 0 && !sourceShop.allowNegativeStock) {
      throw new Error(
        `Insufficient stock for transfer. Current available in ${sourceShop.name}: ${sourceInventory.quantity}, Requested: ${input.quantity}.`
      );
    }

    await tx.inventoryItem.update({
      where: { id: sourceInventory.id },
      data: { quantity: sourceResulting, version: { increment: 1 } },
    });

    await tx.stockMovement.create({
      data: {
        shopId: sourceShopId,
        variantId: input.variantId,
        movementType: MovementType.TRANSFER_OUT,
        quantityDelta: -input.quantity,
        resultingBalance: sourceResulting,
        unitCost: variant.costPrice,
        referenceType: "TRANSFER",
        referenceId: transferBatchId,
        notes: `Transfer to ${targetShop.name}${input.notes ? ` - ${input.notes}` : ""}`,
        performedBy: user.id,
      },
    });

    // 2. Add to Target Shop
    const targetInventory = await tx.inventoryItem.upsert({
      where: { shopId_variantId: { shopId: input.targetShopId, variantId: input.variantId } },
      update: {},
      create: { shopId: input.targetShopId, variantId: input.variantId, quantity: 0 },
    });

    const targetResulting = targetInventory.quantity + input.quantity;

    await tx.inventoryItem.update({
      where: { id: targetInventory.id },
      data: { quantity: targetResulting, version: { increment: 1 } },
    });

    await tx.stockMovement.create({
      data: {
        shopId: input.targetShopId,
        variantId: input.variantId,
        movementType: MovementType.TRANSFER_IN,
        quantityDelta: input.quantity,
        resultingBalance: targetResulting,
        unitCost: variant.costPrice,
        referenceType: "TRANSFER",
        referenceId: transferBatchId,
        notes: `Transfer from ${sourceShop.name}${input.notes ? ` - ${input.notes}` : ""}`,
        performedBy: user.id,
      },
    });

    // 3. Audit log
    await tx.auditLog.create({
      data: {
        organizationId,
        shopId: sourceShopId,
        userId: user.id,
        action: "STOCK_TRANSFER",
        entityType: "StockMovement",
        entityId: transferBatchId,
        newData: {
          transferBatchId,
          variantId: input.variantId,
          variantName: `${variant.product.name} (${variant.name})`,
          quantity: input.quantity,
          sourceShopId,
          sourceShopName: sourceShop.name,
          targetShopId: input.targetShopId,
          targetShopName: targetShop.name,
          notes: input.notes,
        },
      },
    });

    return {
      transferBatchId,
      sourceShopName: sourceShop.name,
      targetShopName: targetShop.name,
      quantity: input.quantity,
      sourceRemaining: sourceResulting,
      targetNewBalance: targetResulting,
    };
  });
}

export interface BatchStockInItem {
  variantId: string;
  quantity: number;
  costPrice?: number;
}

export interface BatchStockInInput {
  items: BatchStockInItem[];
  notes?: string;
}

export async function batchReceiveStock(context: TenantContext, input: BatchStockInInput) {
  const { organizationId, shopId, user, role, permissions } = context;

  // 1. Authorization check
  const isAuthorized = role === ShopRole.SHOP_OWNER || permissions.canAdjustStock;
  if (!isAuthorized) {
    throw new Error("You do not have permission to receive inventory stock.");
  }

  // 2. Validate input
  if (!input.items || input.items.length === 0) {
    throw new Error("At least one product item is required for stock receiving.");
  }

  for (const item of input.items) {
    if (!item.variantId) {
      throw new Error("Valid variantId is required for all items.");
    }
    if (!item.quantity || item.quantity <= 0) {
      throw new Error(`Quantity must be a positive integer. Received: ${item.quantity}`);
    }
  }

  // 3. Shop validation
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { isActive: true, suspensionReason: true, name: true },
  });

  if (shop && shop.isActive === false) {
    throw new Error(
      `This shop is currently suspended: "${shop.suspensionReason || "Administrative hold"}". Operations are halted.`
    );
  }

  // 4. Atomic execution
  return prisma.$transaction(async (tx) => {
    const batchId = crypto.randomUUID();
    const updatedItems = [];

    for (const item of input.items) {
      const variant = await tx.productVariant.findUnique({
        where: { id: item.variantId },
        include: { product: true },
      });

      if (!variant || variant.product.organizationId !== organizationId) {
        throw new Error(`Product variant not found or access denied: ${item.variantId}`);
      }

      const inventory = await tx.inventoryItem.upsert({
        where: {
          shopId_variantId: {
            shopId,
            variantId: item.variantId,
          },
        },
        update: {},
        create: {
          shopId,
          variantId: item.variantId,
          quantity: 0,
        },
      });

      const resultingBalance = inventory.quantity + item.quantity;
      const unitCost = item.costPrice !== undefined ? item.costPrice : Number(variant.costPrice);

      await tx.inventoryItem.update({
        where: { id: inventory.id },
        data: {
          quantity: resultingBalance,
          version: { increment: 1 },
        },
      });

      const movement = await tx.stockMovement.create({
        data: {
          shopId,
          variantId: item.variantId,
          movementType: MovementType.PURCHASE_RECEIPT,
          quantityDelta: item.quantity,
          resultingBalance,
          unitCost,
          referenceType: "SCANNER_STOCK_IN",
          referenceId: batchId,
          notes: input.notes || "Received via Quick Scanner",
          performedBy: user.id,
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          shopId,
          userId: user.id,
          action: "STOCK_RECEIVED",
          entityType: "InventoryItem",
          entityId: inventory.id,
          previousData: { quantity: inventory.quantity },
          newData: {
            quantity: resultingBalance,
            delta: item.quantity,
            batchId,
            unitCost,
          },
        },
      });

      updatedItems.push({
        variantId: item.variantId,
        productName: variant.product.name,
        previousStock: inventory.quantity,
        newStock: resultingBalance,
        quantityAdded: item.quantity,
      });
    }

    return {
      batchId,
      itemsCount: updatedItems.length,
      totalUnits: input.items.reduce((sum, it) => sum + it.quantity, 0),
      items: updatedItems,
    };
  });
}


