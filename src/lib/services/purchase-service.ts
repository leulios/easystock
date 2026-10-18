import { prisma } from "../db";
import { TenantContext } from "../tenant/context";
import { SupplierInput, PurchaseOrderInput, ReceivePurchaseInput } from "../validations/purchase";
import { MovementType, POStatus, Prisma } from "@prisma/client";
import { Decimal } from "../decimal";

export async function createSupplier(context: TenantContext, input: SupplierInput) {
  const { organizationId, shopId, user } = context;

  const supplier = await prisma.supplier.create({
    data: {
      organizationId,
      name: input.name,
      contactName: input.contactName || null,
      phone: input.phone || null,
      email: input.email || null,
      address: input.address || null,
      paymentTerms: input.paymentTerms || null,
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId,
      shopId,
      userId: user.id,
      action: "SUPPLIER_CREATED",
      entityType: "Supplier",
      entityId: supplier.id,
      newData: { name: supplier.name },
    },
  });

  return supplier;
}

export async function listSuppliers(context: TenantContext) {
  const { organizationId } = context;
  return prisma.supplier.findMany({
    where: { organizationId, deletedAt: null },
    orderBy: { name: "asc" },
  });
}

export async function createPurchaseOrder(context: TenantContext, input: PurchaseOrderInput) {
  const { organizationId, shopId, user } = context;

  // 1. Verify PO number uniqueness in this shop
  const existingPO = await prisma.purchaseOrder.findUnique({
    where: {
      shopId_poNumber: {
        shopId,
        poNumber: input.poNumber.toUpperCase(),
      },
    },
  });

  if (existingPO) {
    throw new Error(`A purchase order with number "${input.poNumber}" already exists.`);
  }

  // 2. Verify supplier belongs to organization
  const supplier = await prisma.supplier.findFirst({
    where: { id: input.supplierId, organizationId, deletedAt: null },
  });

  if (!supplier) {
    throw new Error("Supplier not found or access denied.");
  }

  // 3. Compute total amount
  let totalAmount = new Decimal(0);
  const itemsData = input.items.map((item) => {
    const cost = new Decimal(item.unitCost);
    const lineCost = cost.mul(item.orderedQuantity);
    totalAmount = totalAmount.plus(lineCost);

    return {
      variantId: item.variantId,
      orderedQuantity: item.orderedQuantity,
      receivedQuantity: 0,
      unitCost: cost,
      totalCost: lineCost,
    };
  });

  return prisma.$transaction(async (tx) => {
    const po = await tx.purchaseOrder.create({
      data: {
        shopId,
        supplierId: input.supplierId,
        poNumber: input.poNumber.toUpperCase(),
        status: POStatus.ORDERED,
        expectedDate: input.expectedDate ? new Date(input.expectedDate) : null,
        totalAmount,
        notes: input.notes || null,
        createdById: user.id,
        items: {
          create: itemsData,
        },
      },
      include: {
        supplier: true,
        items: {
          include: {
            variant: { include: { product: true } },
          },
        },
      },
    });

    await tx.auditLog.create({
      data: {
        organizationId,
        shopId,
        userId: user.id,
        action: "PO_CREATED",
        entityType: "PurchaseOrder",
        entityId: po.id,
        newData: { poNumber: po.poNumber, totalAmount: totalAmount.toString() },
      },
    });

    return po;
  });
}

export async function receivePurchaseStock(context: TenantContext, input: ReceivePurchaseInput) {
  const { organizationId, shopId, user } = context;

  const po = await prisma.purchaseOrder.findFirst({
    where: { id: input.purchaseOrderId, shopId },
    include: {
      items: {
        include: {
          variant: { include: { product: true } },
        },
      },
      supplier: true,
    },
  });

  if (!po) {
    throw new Error("Purchase order not found or access denied.");
  }

  if (po.status === POStatus.RECEIVED || po.status === POStatus.CANCELLED) {
    throw new Error(`Cannot receive stock for purchase order in "${po.status}" status.`);
  }

  return prisma.$transaction(async (tx) => {
    for (const receiveItem of input.items) {
      const lineItem = po.items.find((i) => i.variantId === receiveItem.variantId);
      if (!lineItem) {
        throw new Error("Received item was not found in the purchase order line items.");
      }

      const pendingQuantity = lineItem.orderedQuantity - lineItem.receivedQuantity;
      if (receiveItem.receivedQuantity > pendingQuantity) {
        throw new Error(
          `Cannot receive ${receiveItem.receivedQuantity} units of "${lineItem.variant.product.name}". Only ${pendingQuantity} units are pending receipt.`
        );
      }

      const updatedReceivedQty = lineItem.receivedQuantity + receiveItem.receivedQuantity;
      const unitCost = receiveItem.unitCost ? new Decimal(receiveItem.unitCost) : lineItem.unitCost;

      // 1. Update line item receivedQuantity
      await tx.purchaseOrderItem.update({
        where: { id: lineItem.id },
        data: { receivedQuantity: updatedReceivedQty },
      });

      // 2. Increment active shop inventory
      const inventory = await tx.inventoryItem.upsert({
        where: {
          shopId_variantId: {
            shopId,
            variantId: lineItem.variantId,
          },
        },
        update: {},
        create: {
          shopId,
          variantId: lineItem.variantId,
          quantity: 0,
        },
      });

      const newBalance = inventory.quantity + receiveItem.receivedQuantity;

      await tx.inventoryItem.update({
        where: { id: inventory.id },
        data: {
          quantity: newBalance,
          version: { increment: 1 },
        },
      });

      // 3. Write immutable StockMovement ledger entry linking to the PO
      await tx.stockMovement.create({
        data: {
          shopId,
          variantId: lineItem.variantId,
          movementType: MovementType.PURCHASE_RECEIPT,
          quantityDelta: receiveItem.receivedQuantity,
          resultingBalance: newBalance,
          unitCost,
          referenceType: "PURCHASE_ORDER",
          referenceId: po.poNumber,
          notes: `Received from ${po.supplier.name} under ${po.poNumber}`,
          performedBy: user.id,
        },
      });
    }

    // 4. Check if all items are fully received
    const refreshedPO = await tx.purchaseOrder.findUnique({
      where: { id: po.id },
      include: { items: true },
    });

    const isFullyReceived = refreshedPO?.items.every((i) => i.receivedQuantity >= i.orderedQuantity);

    const updatedPO = await tx.purchaseOrder.update({
      where: { id: po.id },
      data: {
        status: isFullyReceived ? POStatus.RECEIVED : POStatus.PARTIALLY_RECEIVED,
      },
      include: {
        items: {
          include: { variant: { include: { product: true } } },
        },
        supplier: true,
      },
    });

    await tx.auditLog.create({
      data: {
        organizationId,
        shopId,
        userId: user.id,
        action: "PO_STOCK_RECEIVED",
        entityType: "PurchaseOrder",
        entityId: po.id,
        newData: {
          poNumber: po.poNumber,
          isFullyReceived,
          receivedItemsCount: input.items.length,
        },
      },
    });

    return updatedPO;
  });
}

export async function listPurchaseOrders(context: TenantContext, options: { status?: POStatus; page?: number; pageSize?: number } = {}) {
  const { shopId } = context;
  const { status, page = 1, pageSize = 20 } = options;

  const where: Prisma.PurchaseOrderWhereInput = {
    shopId,
    ...(status ? { status } : {}),
  };

  const skip = (page - 1) * pageSize;

  const [totalCount, orders] = await Promise.all([
    prisma.purchaseOrder.count({ where }),
    prisma.purchaseOrder.findMany({
      where,
      include: {
        supplier: true,
        items: {
          include: {
            variant: { include: { product: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
  ]);

  return {
    items: orders,
    pagination: {
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  };
}
