import { prisma } from "../db";
import { TenantContext } from "../tenant/context";
import { CustomerInput, AdjustCreditInput } from "../validations/customer";
import { Decimal } from "../decimal";

export interface ListCustomersOptions {
  search?: string;
  hasCredit?: boolean;
  page?: number;
  pageSize?: number;
}

export async function listCustomers(context: TenantContext, options: ListCustomersOptions = {}) {
  const { organizationId } = context;
  const { search, hasCredit, page = 1, pageSize = 50 } = options;

  const whereClause: any = {
    organizationId,
    deletedAt: null,
  };

  if (search) {
    whereClause.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  if (hasCredit) {
    whereClause.outstandingCredit = { gt: 0 };
  }

  const [total, items] = await Promise.all([
    prisma.customer.count({ where: whereClause }),
    prisma.customer.findMany({
      where: whereClause,
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        _count: {
          select: { sales: true },
        },
      },
    }),
  ]);

  return {
    items: items.map((c) => ({
      ...c,
      outstandingCredit: Number(c.outstandingCredit),
      totalSalesCount: c._count.sales,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getCustomerById(context: TenantContext, customerId: string) {
  const { organizationId, shopId } = context;

  const customer = await prisma.customer.findFirst({
    where: {
      id: customerId,
      organizationId,
      deletedAt: null,
    },
    include: {
      sales: {
        where: { shopId },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          payments: true,
          items: {
            include: {
              variant: {
                include: { product: true },
              },
            },
          },
        },
      },
    },
  });

  if (!customer) {
    throw new Error("Customer not found or access denied");
  }

  return {
    ...customer,
    outstandingCredit: Number(customer.outstandingCredit),
    sales: customer.sales.map((s) => ({
      ...s,
      subtotal: Number(s.subtotal),
      taxAmount: Number(s.taxAmount),
      discountAmount: Number(s.discountAmount),
      totalAmount: Number(s.totalAmount),
    })),
  };
}

export async function createCustomer(context: TenantContext, input: CustomerInput) {
  const { organizationId, user, shopId } = context;

  const customer = await prisma.customer.create({
    data: {
      organizationId,
      name: input.name.trim(),
      phone: input.phone?.trim() || null,
      email: input.email ? input.email.trim().toLowerCase() : null,
      address: input.address?.trim() || null,
      outstandingCredit: new Decimal(0),
    },
  });

  // Log audit trail
  await prisma.auditLog.create({
    data: {
      organizationId,
      shopId,
      userId: user.id,
      action: "CUSTOMER_CREATED",
      entityType: "Customer",
      entityId: customer.id,
      newData: { name: customer.name, phone: customer.phone },
    },
  });

  return {
    ...customer,
    outstandingCredit: Number(customer.outstandingCredit),
  };
}

export async function updateCustomer(
  context: TenantContext,
  customerId: string,
  input: CustomerInput
) {
  const { organizationId, user, shopId } = context;

  const existing = await prisma.customer.findFirst({
    where: { id: customerId, organizationId, deletedAt: null },
  });

  if (!existing) {
    throw new Error("Customer not found or access denied");
  }

  const updated = await prisma.customer.update({
    where: { id: customerId },
    data: {
      name: input.name.trim(),
      phone: input.phone?.trim() || null,
      email: input.email ? input.email.trim().toLowerCase() : null,
      address: input.address?.trim() || null,
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId,
      shopId,
      userId: user.id,
      action: "CUSTOMER_UPDATED",
      entityType: "Customer",
      entityId: updated.id,
      previousData: { name: existing.name, phone: existing.phone },
      newData: { name: updated.name, phone: updated.phone },
    },
  });

  return {
    ...updated,
    outstandingCredit: Number(updated.outstandingCredit),
  };
}

export async function adjustCustomerCredit(
  context: TenantContext,
  input: AdjustCreditInput
) {
  const { organizationId, user, shopId } = context;

  const result = await prisma.$transaction(async (tx) => {
    const customer = await tx.customer.findFirst({
      where: { id: input.customerId, organizationId, deletedAt: null },
    });

    if (!customer) {
      throw new Error("Customer not found");
    }

    const currentCredit = new Decimal(customer.outstandingCredit);
    const delta = new Decimal(input.amountDelta);
    const newCredit = currentCredit.plus(delta);

    // Negative outstanding credit is usually not standard unless customer has an advance deposit
    const updated = await tx.customer.update({
      where: { id: customer.id },
      data: {
        outstandingCredit: newCredit,
      },
    });

    await tx.auditLog.create({
      data: {
        organizationId,
        shopId,
        userId: user.id,
        action: "CUSTOMER_CREDIT_ADJUSTMENT",
        entityType: "Customer",
        entityId: customer.id,
        previousData: { outstandingCredit: currentCredit.toFixed(2) },
        newData: {
          outstandingCredit: newCredit.toFixed(2),
          delta: delta.toFixed(2),
          reason: input.reason,
        },
      },
    });

    return updated;
  });

  return {
    ...result,
    outstandingCredit: Number(result.outstandingCredit),
  };
}

export async function deleteCustomer(context: TenantContext, customerId: string) {
  const { organizationId, user, shopId } = context;

  const existing = await prisma.customer.findFirst({
    where: { id: customerId, organizationId, deletedAt: null },
  });

  if (!existing) {
    throw new Error("Customer not found or access denied");
  }

  // Soft delete customer
  const updated = await prisma.customer.update({
    where: { id: customerId },
    data: { deletedAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      organizationId,
      shopId,
      userId: user.id,
      action: "CUSTOMER_DELETED",
      entityType: "Customer",
      entityId: customerId,
    },
  });

  return { success: true };
}
