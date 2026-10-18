import { prisma } from "../db";
import { TenantContext } from "./context";
import { Prisma } from "@prisma/client";

/**
 * Creates a scoped database accessor bound to the active organization and shop.
 * Guarantees that all queries and mutations are isolated to the caller's tenant context.
 */
export function createScopedDb(context: TenantContext) {
  const { organizationId, shopId, user } = context;

  return {
    // -------------------------------------------------------------------------
    // Products & Variants (Scoped to Organization)
    // -------------------------------------------------------------------------
    products: {
      findMany: (args?: Prisma.ProductFindManyArgs) => {
        return prisma.product.findMany({
          ...args,
          where: {
            ...args?.where,
            organizationId,
            deletedAt: null,
          },
        });
      },
      findById: (id: string, includeVariants = true) => {
        return prisma.product.findFirst({
          where: {
            id,
            organizationId,
            deletedAt: null,
          },
          include: {
            variants: includeVariants,
            category: true,
          },
        });
      },
      findByBarcodeOrSku: (code: string) => {
        return prisma.product.findFirst({
          where: {
            organizationId,
            deletedAt: null,
            OR: [
              { barcode: code },
              { sku: code },
              { variants: { some: { OR: [{ barcode: code }, { sku: code }] } } },
            ],
          },
          include: {
            variants: true,
            category: true,
          },
        });
      },
    },

    // -------------------------------------------------------------------------
    // Categories (Scoped to Organization)
    // -------------------------------------------------------------------------
    categories: {
      findMany: (args?: Prisma.CategoryFindManyArgs) => {
        return prisma.category.findMany({
          ...args,
          where: {
            ...args?.where,
            organizationId,
            deletedAt: null,
          },
          orderBy: { name: "asc" },
        });
      },
    },

    // -------------------------------------------------------------------------
    // Inventory Items & Ledger Movements (Strictly Scoped to Shop)
    // -------------------------------------------------------------------------
    inventory: {
      findMany: (args?: Prisma.InventoryItemFindManyArgs) => {
        return prisma.inventoryItem.findMany({
          ...args,
          where: {
            ...args?.where,
            shopId,
          },
          include: {
            variant: {
              include: {
                product: true,
              },
            },
          },
        });
      },
      findItem: (variantId: string) => {
        return prisma.inventoryItem.findUnique({
          where: {
            shopId_variantId: {
              shopId,
              variantId,
            },
          },
          include: {
            variant: {
              include: {
                product: true,
              },
            },
          },
        });
      },
      findMovements: (args?: Prisma.StockMovementFindManyArgs) => {
        return prisma.stockMovement.findMany({
          ...args,
          where: {
            ...args?.where,
            shopId,
          },
          include: {
            variant: {
              include: {
                product: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        });
      },
    },

    // -------------------------------------------------------------------------
    // Sales & Receipts (Strictly Scoped to Shop)
    // -------------------------------------------------------------------------
    sales: {
      findMany: (args?: Prisma.SaleFindManyArgs) => {
        return prisma.sale.findMany({
          ...args,
          where: {
            ...args?.where,
            shopId,
          },
          include: {
            customer: true,
            items: {
              include: {
                variant: {
                  include: {
                    product: true,
                  },
                },
              },
            },
            payments: true,
          },
          orderBy: { createdAt: "desc" },
        });
      },
      findById: (id: string) => {
        return prisma.sale.findFirst({
          where: {
            id,
            shopId,
          },
          include: {
            customer: true,
            items: {
              include: {
                variant: {
                  include: {
                    product: true,
                  },
                },
              },
            },
            payments: true,
          },
        });
      },
    },

    // -------------------------------------------------------------------------
    // Customers (Scoped to Organization)
    // -------------------------------------------------------------------------
    customers: {
      findMany: (args?: Prisma.CustomerFindManyArgs) => {
        return prisma.customer.findMany({
          ...args,
          where: {
            ...args?.where,
            organizationId,
            deletedAt: null,
          },
          orderBy: { name: "asc" },
        });
      },
      findById: (id: string) => {
        return prisma.customer.findFirst({
          where: {
            id,
            organizationId,
            deletedAt: null,
          },
        });
      },
    },

    // -------------------------------------------------------------------------
    // Suppliers (Scoped to Organization)
    // -------------------------------------------------------------------------
    suppliers: {
      findMany: (args?: Prisma.SupplierFindManyArgs) => {
        return prisma.supplier.findMany({
          ...args,
          where: {
            ...args?.where,
            organizationId,
            deletedAt: null,
          },
          orderBy: { name: "asc" },
        });
      },
    },

    // -------------------------------------------------------------------------
    // Purchase Orders (Strictly Scoped to Shop)
    // -------------------------------------------------------------------------
    purchaseOrders: {
      findMany: (args?: Prisma.PurchaseOrderFindManyArgs) => {
        return prisma.purchaseOrder.findMany({
          ...args,
          where: {
            ...args?.where,
            shopId,
          },
          include: {
            supplier: true,
            items: {
              include: {
                variant: {
                  include: {
                    product: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        });
      },
    },

    // -------------------------------------------------------------------------
    // Expenses (Strictly Scoped to Shop)
    // -------------------------------------------------------------------------
    expenses: {
      findMany: (args?: Prisma.ExpenseFindManyArgs) => {
        return prisma.expense.findMany({
          ...args,
          where: {
            ...args?.where,
            shopId,
          },
          orderBy: { expenseDate: "desc" },
        });
      },
    },

    // -------------------------------------------------------------------------
    // Audit Logs (Scoped to Tenant)
    // -------------------------------------------------------------------------
    audit: {
      log: async (action: string, entityType: string, entityId?: string, details?: { previous?: any; next?: any }) => {
        return prisma.auditLog.create({
          data: {
            organizationId,
            shopId,
            userId: user.id,
            action,
            entityType,
            entityId,
            previousData: details?.previous ?? Prisma.JsonNull,
            newData: details?.next ?? Prisma.JsonNull,
          },
        });
      },
    },
  };
}
