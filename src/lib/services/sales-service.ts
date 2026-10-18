import { prisma } from "../db";
import { TenantContext } from "../tenant/context";
import { CreateSaleInput, ReturnSaleInput } from "../validations/sales";
import { MovementType, SaleStatus, PaymentMethod, Prisma } from "@prisma/client";
import { Decimal, calculateLineTotal, calculateTax } from "../decimal";

export interface ListSalesOptions {
  status?: SaleStatus;
  customerId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  pageSize?: number;
}

export async function createSale(context: TenantContext, input: CreateSaleInput) {
  const { organizationId, shopId, user } = context;

  // 1. Idempotency Check: if a sale with this idempotency key already exists, return it immediately
  const existingSale = await prisma.sale.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
    include: {
      items: {
        include: {
          variant: {
            include: { product: true },
          },
        },
      },
      payments: true,
      customer: true,
      shop: true,
    },
  });

  if (existingSale) {
    return { sale: existingSale, isDuplicateReplay: true };
  }

  // 2. Fetch active shop configuration (taxes, negative stock policy, currency)
  const shop = await prisma.shop.findFirst({
    where: { id: shopId, organizationId },
  });

  if (!shop) {
    throw new Error("Shop not found or access denied.");
  }

  if (shop.isActive === false) {
    throw new Error(
      `This shop is currently suspended by platform administration: "${shop.suspensionReason || "Administrative hold"}". Operations are temporarily halted.`
    );
  }

  // 3. Fetch all requested variants and verify they belong to this organization
  const variantIds = input.items.map((i) => i.variantId);
  const variants = await prisma.productVariant.findMany({
    where: {
      id: { in: variantIds },
      product: { organizationId },
    },
    include: {
      product: true,
    },
  });

  if (variants.length !== variantIds.length) {
    throw new Error("One or more items in the cart are invalid or belong to another organization.");
  }

  const variantMap = new Map(variants.map((v) => [v.id, v]));

  // 4. Calculate financial totals with Decimal precision
  let subtotal = new Decimal(0);
  let totalDiscount = new Decimal(0);
  let totalCost = new Decimal(0);

  const calculatedItems = input.items.map((item) => {
    const variant = variantMap.get(item.variantId)!;
    const unitPrice = item.unitPrice !== undefined ? new Decimal(item.unitPrice) : variant.sellingPrice;
    const unitCost = variant.costPrice;
    const discount = new Decimal(item.discount || 0);

    const lineSubtotal = new Decimal(item.quantity).mul(unitPrice);
    const lineTotal = calculateLineTotal(item.quantity, unitPrice, discount);
    const lineCost = new Decimal(item.quantity).mul(unitCost);

    subtotal = subtotal.plus(lineSubtotal);
    totalDiscount = totalDiscount.plus(discount);
    totalCost = totalCost.plus(lineCost);

    return {
      variantId: item.variantId,
      quantity: item.quantity,
      unitCost,
      unitPrice,
      discountAmount: discount,
      totalPrice: lineTotal,
    };
  });

  const taxableAmount = subtotal.minus(totalDiscount);
  const taxAmount = calculateTax(taxableAmount, shop.taxRate);
  const grandTotal = taxableAmount.plus(taxAmount);

  // 5. Verify payments match or exceed the grand total
  let totalPaid = new Decimal(0);
  input.payments.forEach((p) => {
    totalPaid = totalPaid.plus(new Decimal(p.amount));
  });

  if (totalPaid.lessThan(grandTotal)) {
    throw new Error(
      `Insufficient payment. Required: ${grandTotal.toFixed(2)} ${shop.currency}, Tendered: ${totalPaid.toFixed(2)} ${shop.currency}.`
    );
  }

  const receiptNumber = `RCP-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(
    1000 + Math.random() * 9000
  )}`;

  // 6. Execute atomic database transaction
  const result = await prisma.$transaction(async (tx) => {
    // A. Check and deduct inventory atomically
    for (const item of input.items) {
      const variant = variantMap.get(item.variantId)!;

      // Lock & fetch inventory item
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

      const newBalance = inventory.quantity - item.quantity;

      if (newBalance < 0 && !shop.allowNegativeStock) {
        throw new Error(
          `Insufficient stock for "${variant.product.name} (${variant.name})". Available: ${inventory.quantity}, Requested: ${item.quantity}.`
        );
      }

      // Update inventory balance
      await tx.inventoryItem.update({
        where: { id: inventory.id },
        data: {
          quantity: newBalance,
          version: { increment: 1 },
        },
      });

      // Write immutable stock movement ledger entry
      await tx.stockMovement.create({
        data: {
          shopId,
          variantId: item.variantId,
          movementType: MovementType.SALE_DEDUCTION,
          quantityDelta: -item.quantity,
          resultingBalance: newBalance,
          unitCost: variant.costPrice,
          referenceType: "SALE",
          referenceId: receiptNumber,
          notes: `POS Checkout (${receiptNumber})`,
          performedBy: user.id,
        },
      });
    }

    // B. Handle Store Credit if any payment was made with STORE_CREDIT
    const storeCreditPayments = input.payments.filter((p) => p.paymentMethod === PaymentMethod.STORE_CREDIT);
    if (storeCreditPayments.length > 0) {
      if (!input.customerId) {
        throw new Error("A customer must be selected to purchase with Store Credit.");
      }
      const totalCreditUsed = storeCreditPayments.reduce(
        (sum, p) => sum.plus(new Decimal(p.amount)),
        new Decimal(0)
      );

      const customer = await tx.customer.findFirst({
        where: { id: input.customerId, organizationId, deletedAt: null },
      });

      if (!customer) {
        throw new Error("Selected customer not found or access denied.");
      }

      await tx.customer.update({
        where: { id: customer.id },
        data: {
          outstandingCredit: new Decimal(customer.outstandingCredit).plus(totalCreditUsed),
        },
      });
    }

    // C. Create Sale record
    const sale = await tx.sale.create({
      data: {
        shopId,
        customerId: input.customerId || null,
        receiptNumber,
        idempotencyKey: input.idempotencyKey,
        status: SaleStatus.COMPLETED,
        subtotal,
        discountAmount: totalDiscount,
        taxAmount,
        totalAmount: grandTotal,
        totalCost,
        cashierId: user.id,
        notes: input.notes || null,
        items: {
          create: calculatedItems.map((ci) => ({
            variantId: ci.variantId,
            quantity: ci.quantity,
            unitCost: ci.unitCost,
            unitPrice: ci.unitPrice,
            discountAmount: ci.discountAmount,
            totalPrice: ci.totalPrice,
          })),
        },
        payments: {
          create: input.payments.map((p) => ({
            paymentMethod: p.paymentMethod,
            amount: new Decimal(p.amount),
            referenceCode: p.referenceCode || null,
            tenderedAmount: p.tenderedAmount ? new Decimal(p.tenderedAmount) : null,
            changeGiven: p.changeGiven ? new Decimal(p.changeGiven) : null,
          })),
        },
      },
      include: {
        items: {
          include: {
            variant: {
              include: { product: true },
            },
          },
        },
        payments: true,
        customer: true,
        shop: true,
      },
    });

    // D. Record audit entry
    await tx.auditLog.create({
      data: {
        organizationId,
        shopId,
        userId: user.id,
        action: "SALE_COMPLETED",
        entityType: "Sale",
        entityId: sale.id,
        newData: {
          receiptNumber: sale.receiptNumber,
          totalAmount: sale.totalAmount.toString(),
          itemsCount: input.items.length,
          customerId: input.customerId || null,
        },
      },
    });

    return sale;
  });

  return { sale: result, isDuplicateReplay: false };
}

export async function processReturn(context: TenantContext, input: ReturnSaleInput) {
  const { organizationId, shopId, user } = context;

  const sale = await prisma.sale.findFirst({
    where: { id: input.saleId, shopId },
    include: {
      items: {
        include: {
          variant: { include: { product: true } },
        },
      },
    },
  });

  if (!sale) {
    throw new Error("Sale record not found or access denied.");
  }

  if (sale.status === SaleStatus.VOIDED || sale.status === SaleStatus.REFUNDED) {
    throw new Error(`Sale is already ${sale.status.toLowerCase()}.`);
  }

  return prisma.$transaction(async (tx) => {
    let refundTotal = new Decimal(0);

    for (const returnItem of input.items) {
      const originalItem = sale.items.find((si) => si.variantId === returnItem.variantId);
      if (!originalItem) {
        throw new Error("Returned item was not part of the original sale.");
      }

      if (returnItem.quantity > originalItem.quantity) {
        throw new Error(
          `Cannot return more than originally purchased. Purchased: ${originalItem.quantity}, Returned: ${returnItem.quantity}.`
        );
      }

      const itemUnitPrice = new Decimal(originalItem.unitPrice);
      const itemRefund = itemUnitPrice.mul(returnItem.quantity);
      refundTotal = refundTotal.plus(itemRefund);

      // If item is restocked back into active inventory
      if (returnItem.restock) {
        const inventory = await tx.inventoryItem.upsert({
          where: {
            shopId_variantId: {
              shopId,
              variantId: returnItem.variantId,
            },
          },
          update: {},
          create: {
            shopId,
            variantId: returnItem.variantId,
            quantity: 0,
          },
        });

        const newBalance = inventory.quantity + returnItem.quantity;

        await tx.inventoryItem.update({
          where: { id: inventory.id },
          data: {
            quantity: newBalance,
            version: { increment: 1 },
          },
        });

        await tx.stockMovement.create({
          data: {
            shopId,
            variantId: returnItem.variantId,
            movementType: MovementType.RETURN_RESTOCK,
            quantityDelta: returnItem.quantity,
            resultingBalance: newBalance,
            unitCost: originalItem.unitCost,
            referenceType: "SALE_RETURN",
            referenceId: sale.receiptNumber,
            notes: `Return on ${sale.receiptNumber} [Reason: ${input.reason}]`,
            performedBy: user.id,
          },
        });
      }
    }

    if (input.refundMethod === PaymentMethod.STORE_CREDIT && sale.customerId) {
      const customer = await tx.customer.findFirst({
        where: { id: sale.customerId, organizationId, deletedAt: null },
      });
      if (customer) {
        await tx.customer.update({
          where: { id: customer.id },
          data: {
            outstandingCredit: new Decimal(customer.outstandingCredit).minus(refundTotal),
          },
        });
      }
    }

    const updatedSale = await tx.sale.update({
      where: { id: sale.id },
      data: {
        status: SaleStatus.REFUNDED,
      },
    });

    await tx.auditLog.create({
      data: {
        organizationId,
        shopId,
        userId: user.id,
        action: "SALE_REFUNDED",
        entityType: "Sale",
        entityId: sale.id,
        newData: {
          receiptNumber: sale.receiptNumber,
          refundAmount: refundTotal.toString(),
          reason: input.reason,
        },
      },
    });

    return { sale: updatedSale, refundTotal };
  });
}

export async function listSales(context: TenantContext, options: ListSalesOptions = {}) {
  const { shopId } = context;
  const { status, customerId, startDate, endDate, page = 1, pageSize = 20 } = options;

  const where: Prisma.SaleWhereInput = {
    shopId,
    ...(status ? { status } : {}),
    ...(customerId ? { customerId } : {}),
    ...(startDate || endDate
      ? {
          createdAt: {
            ...(startDate ? { gte: startDate } : {}),
            ...(endDate ? { lte: endDate } : {}),
          },
        }
      : {}),
  };

  const skip = (page - 1) * pageSize;

  const [totalCount, sales] = await Promise.all([
    prisma.sale.count({ where }),
    prisma.sale.findMany({
      where,
      include: {
        items: {
          include: {
            variant: {
              include: { product: true },
            },
          },
        },
        payments: true,
        customer: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
  ]);

  return {
    items: sales,
    pagination: {
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  };
}
